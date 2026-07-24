'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon, Heart, MessageCircle, Eye } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApi } from '@/lib/hooks';
import type { PostRecord, PerformanceRecord, WeeklyEngagement } from '@/types';

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${gradient}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { data: posts, loading: postsLoading } = useApi<PostRecord[]>('/api/sheets', []);
  const { data: performance, loading: perfLoading } = useApi<PerformanceRecord[]>('/api/sheets/performance', []);

  const loading = postsLoading || perfLoading;

  const data = useMemo(() => {
    const totalPosts = posts.filter(p => p.id).length;
    const totalViews = performance.reduce((sum, p) => sum + (p.impressions || p.reach || 0), 0);
    const totalLikes = performance.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = performance.reduce((sum, p) => sum + p.comments, 0);
    const recentPosts = [...posts]
      .filter(p => p.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    const engagementMap = new Map<string, WeeklyEngagement>();
    for (const p of performance) {
      const dateKey = p.date.slice(5).replace('-', '/');
      const existing = engagementMap.get(dateKey);
      if (existing) {
        existing.views += (p.impressions || p.reach || 0);
        existing.likes += p.likes;
        existing.comments += p.comments;
        existing.saves += p.saves;
      } else {
        engagementMap.set(dateKey, { date: dateKey, views: p.impressions || p.reach || 0, likes: p.likes, comments: p.comments, saves: p.saves });
      }
    }
    const weeklyEngagement = [...engagementMap.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    return { totalPosts, totalViews, totalLikes, totalComments, recentPosts, weeklyEngagement };
  }, [posts, performance]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">{t('title')}... loading</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('totalPosts')}
          value={data.totalPosts}
          icon={ImageIcon}
          gradient="bg-gradient-to-br from-purple-500 to-purple-700"
        />
        <StatCard
          title={t('totalViews')}
          value={data.totalViews}
          icon={Eye}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
        />
        <StatCard
          title={t('totalLikes')}
          value={data.totalLikes}
          icon={Heart}
          gradient="bg-gradient-to-br from-pink-500 to-pink-700"
        />
        <StatCard
          title={t('totalComments')}
          value={data.totalComments}
          icon={MessageCircle}
          gradient="bg-gradient-to-br from-orange-400 to-orange-600"
        />
      </div>

      {/* Recent Posts */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">{t('recentPosts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {data.recentPosts.map((post, idx) => (
              <div
                key={post.id || `post-${idx}`}
                className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-950 transition-colors hover:border-slate-700"
              >
                <div className="aspect-square overflow-hidden">
                  {post.imageUrl?.includes('.mp4') ? (
                    <video
                      src={post.imageUrl}
                      muted
                      loop
                      autoPlay
                      playsInline
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={post.caption}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      width={400}
                      height={400}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="flex h-full w-full items-center justify-center bg-slate-800"><svg class="h-8 w-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-800">
                      <ImageIcon className="h-8 w-8 text-slate-600" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm text-slate-300">
                    {post.caption}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {new Date(post.date).toLocaleDateString()}
                    </p>
                    {post.mediaUrl && (
                      <a
                        href={post.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Instagram →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Engagement Chart */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">{t('weeklyEngagement')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.weeklyEngagement}>
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
                <Line
                  type="monotone"
                  dataKey="likes"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ fill: '#a855f7', r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="comments"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={{ fill: '#ec4899', r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="saves"
                  stroke="#fb923c"
                  strokeWidth={2}
                  dot={{ fill: '#fb923c', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
