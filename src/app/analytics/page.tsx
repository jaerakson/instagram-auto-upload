'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PostRecord, PerformanceRecord, WeeklyEngagement } from '@/types';

interface StylePerformance {
  style: string;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgSaves: number;
}

interface HashtagStat {
  hashtag: string;
  avgLikes: number;
  postsUsed: number;
}

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const [loading, setLoading] = useState(true);
  const [weeklyEngagement, setWeeklyEngagement] = useState<WeeklyEngagement[]>([]);
  const [stylePerformance, setStylePerformance] = useState<StylePerformance[]>([]);
  const [hashtagStats, setHashtagStats] = useState<HashtagStat[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [collectMsg, setCollectMsg] = useState('');

  async function handleCollectInsights() {
    setCollecting(true);
    setCollectMsg('');
    try {
      const res = await fetch('/api/analytics/collect', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setCollectMsg(`${json.data?.collected ?? 0}건 수집 완료`);
        window.location.reload();
      } else {
        setCollectMsg(json.error || '수집 실패');
      }
    } catch {
      setCollectMsg('수집 실패');
    } finally {
      setCollecting(false);
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const [postsRes, perfRes] = await Promise.all([
          fetch('/api/sheets'),
          fetch('/api/sheets/performance'),
        ]);

        let posts: PostRecord[] = [];
        let performanceData: PerformanceRecord[] = [];

        if (postsRes.ok) {
          const postsJson = await postsRes.json();
          posts = postsJson.data ?? [];
        }
        if (perfRes.ok) {
          const perfJson = await perfRes.json();
          performanceData = perfJson.data ?? [];
        }

        // weeklyEngagement: map performance data directly
        const weekly = performanceData.map((p) => ({
          date: p.date.slice(5, 10),
          views: p.impressions || p.reach || 0,
          likes: p.likes,
          comments: p.comments,
          saves: p.saves,
        }));
        setWeeklyEngagement(weekly);

        // stylePerformance: group by post style, average the metrics
        const styleMap = new Map<string, { views: number[]; likes: number[]; comments: number[]; saves: number[] }>();
        posts.forEach((post) => {
          const perf = performanceData.find((p) => p.mediaId === post.mediaId);
          if (!perf || !post.style) return;
          if (!styleMap.has(post.style)) styleMap.set(post.style, { views: [], likes: [], comments: [], saves: [] });
          const s = styleMap.get(post.style)!;
          s.views.push(perf.impressions || perf.reach || 0);
          s.likes.push(perf.likes);
          s.comments.push(perf.comments);
          s.saves.push(perf.saves);
        });
        const styles = Array.from(styleMap.entries()).map(([style, data]) => ({
          style,
          avgViews: Math.round(data.views.reduce((a, b) => a + b, 0) / data.views.length),
          avgLikes: Math.round(data.likes.reduce((a, b) => a + b, 0) / data.likes.length),
          avgComments: Math.round(data.comments.reduce((a, b) => a + b, 0) / data.comments.length),
          avgSaves: Math.round(data.saves.reduce((a, b) => a + b, 0) / data.saves.length),
        }));
        setStylePerformance(styles);

        // hashtagStats: parse hashtags, average likes per tag
        const tagMap = new Map<string, { likes: number[]; count: number }>();
        posts.forEach((post) => {
          const perf = performanceData.find((p) => p.mediaId === post.mediaId);
          if (!perf) return;
          const tags = post.hashtags.split(/\s+/).filter((tag) => tag.startsWith('#'));
          tags.forEach((tag) => {
            if (!tagMap.has(tag)) tagMap.set(tag, { likes: [], count: 0 });
            const t = tagMap.get(tag)!;
            t.likes.push(perf.likes);
            t.count++;
          });
        });
        const hashtags = Array.from(tagMap.entries())
          .map(([hashtag, data]) => ({
            hashtag,
            avgLikes: Math.round(data.likes.reduce((a, b) => a + b, 0) / data.likes.length),
            postsUsed: data.count,
          }))
          .sort((a, b) => b.avgLikes - a.avgLikes)
          .slice(0, 10);
        setHashtagStats(hashtags);
        // Fetch AI recommendations in parallel (non-blocking)
        fetch('/api/analytics/recommendation')
          .then(async (recRes) => {
            if (recRes.ok) {
              const recJson = await recRes.json();
              setRecommendations(recJson.data?.recommendations ?? []);
            }
          })
          .catch(() => {})
          .finally(() => setRecLoading(false));
      } catch {
        // silently handle network errors - show empty state
        setRecLoading(false);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const collectButton = (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        onClick={handleCollectInsights}
        disabled={collecting}
        className="border-slate-700 text-slate-300 hover:bg-slate-800"
      >
        {collecting ? (
          <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />수집 중...</>
        ) : (
          <><RefreshCw className="mr-1.5 h-3.5 w-3.5" />성과 수집</>
        )}
      </Button>
      {collectMsg && <span className="text-xs text-slate-400">{collectMsg}</span>}
    </div>
  );

  if (weeklyEngagement.length === 0 && stylePerformance.length === 0 && hashtagStats.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          {collectButton}
        </div>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lightbulb className="h-12 w-12 text-slate-600" />
            <p className="mt-3 text-sm text-slate-400">{t('noData')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        {collectButton}
      </div>

      {/* Engagement Trend */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">{t('engagementTrend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyEngagement}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="views" name={t('views')} stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                <Line type="monotone" dataKey="likes" name={t('likes')} stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} />
                <Line type="monotone" dataKey="comments" name={t('comments')} stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899', r: 3 }} />
                <Line type="monotone" dataKey="saves" name={t('saves')} stroke="#fb923c" strokeWidth={2} dot={{ fill: '#fb923c', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Style Performance - Custom Bar Chart */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">{t('stylePerformance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />{t('views')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />{t('likes')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-pink-500" />{t('comments')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-400" />{t('saves')}</span>
          </div>
          <div className="space-y-4">
            {stylePerformance.map((item) => {
              const max = Math.max(...stylePerformance.map((s) => s.avgViews), 1);
              return (
                <div key={item.style} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-300 capitalize">{item.style}</span>
                    <span className="text-xs text-slate-500">{t('views')} {item.avgViews} · {t('likes')} {item.avgLikes}</span>
                  </div>
                  <div className="flex gap-1 h-6">
                    <div
                      className="rounded-l bg-blue-500 transition-all"
                      style={{ width: `${(item.avgViews / max) * 100}%` }}
                      title={`${t('views')}: ${item.avgViews}`}
                    />
                    <div
                      className="bg-purple-500 transition-all"
                      style={{ width: `${(item.avgLikes / max) * 100}%` }}
                      title={`${t('likes')}: ${item.avgLikes}`}
                    />
                    <div
                      className="bg-pink-500 transition-all"
                      style={{ width: `${(item.avgComments / max) * 100}%` }}
                      title={`${t('comments')}: ${item.avgComments}`}
                    />
                    <div
                      className="rounded-r bg-orange-400 transition-all"
                      style={{ width: `${(item.avgSaves / max) * 100}%` }}
                      title={`${t('saves')}: ${item.avgSaves}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hashtag Efficiency */}
        <Card className="border-slate-800 bg-slate-900 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white">{t('hashtagEfficiency')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Hashtag</TableHead>
                  <TableHead className="text-slate-400 text-right">{t('likes')}</TableHead>
                  <TableHead className="text-slate-400 text-right">Posts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hashtagStats.map((h) => (
                  <TableRow key={h.hashtag} className="border-slate-800">
                    <TableCell className="text-sm text-purple-400 font-medium">
                      {h.hashtag}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-300">
                      {h.avgLikes}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-400">
                      {h.postsUsed}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* AI Recommendation */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Lightbulb className="h-4 w-4 text-orange-400" />
              {t('aiRecommendation')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="mb-2 text-xs font-medium text-slate-500">
                {t('nextDirection')}
              </p>
              {recLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : recommendations.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-300">
                  {recommendations.map((rec, i) => {
                    const dotColors = ['bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-emerald-400'];
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dotColors[i % dotColors.length]}`} />
                        {rec}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 py-4 text-center">
                  {t('recNoData')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
