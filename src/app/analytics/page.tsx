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
import { Lightbulb, Loader2 } from 'lucide-react';
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
          date: p.date.slice(5), // "07/18" format
          likes: p.likes,
          comments: p.comments,
          saves: p.saves,
        }));
        setWeeklyEngagement(weekly);

        // stylePerformance: group by post style, average the metrics
        const styleMap = new Map<string, { likes: number[]; comments: number[]; saves: number[] }>();
        posts.forEach((post) => {
          const perf = performanceData.find((p) => p.mediaId === post.mediaId);
          if (!perf || !post.style) return;
          if (!styleMap.has(post.style)) styleMap.set(post.style, { likes: [], comments: [], saves: [] });
          const s = styleMap.get(post.style)!;
          s.likes.push(perf.likes);
          s.comments.push(perf.comments);
          s.saves.push(perf.saves);
        });
        const styles = Array.from(styleMap.entries()).map(([style, data]) => ({
          style,
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
      } catch {
        // silently handle network errors - show empty state
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

  if (weeklyEngagement.length === 0 && stylePerformance.length === 0 && hashtagStats.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
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
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>

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
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />{t('likes')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-pink-500" />{t('comments')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-400" />{t('saves')}</span>
          </div>
          <div className="space-y-4">
            {stylePerformance.map((item) => {
              const max = Math.max(...stylePerformance.map((s) => s.avgLikes));
              return (
                <div key={item.style} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-300 capitalize">{item.style}</span>
                    <span className="text-xs text-slate-500">{item.avgLikes + item.avgComments + item.avgSaves} total</span>
                  </div>
                  <div className="flex gap-1 h-6">
                    <div
                      className="rounded-l bg-purple-500 transition-all"
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
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                  Anime-style portraits show highest engagement (avg 523 likes). Increase frequency.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400" />
                  Combine cyberpunk elements with anime aesthetics for a hybrid style.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                  Use #digitalart and #anime hashtags together for optimal reach.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  Post between 7-8 PM for peak engagement window.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
