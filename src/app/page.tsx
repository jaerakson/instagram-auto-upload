'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon, Heart, Users } from 'lucide-react';
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
    const totalPosts = posts.length;
    const totalLikes = performance.reduce((sum, p) => sum + p.likes, 0);
    const recentPosts = [...posts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    const engagementMap = new Map<string, WeeklyEngagement>();
    for (const p of performance) {
      const dateKey = p.date.slice(5).replace('-', '/');
      const existing = engagementMap.get(dateKey);
      if (existing) {
        existing.likes += p.likes;
        existing.comments += p.comments;
        existing.saves += p.saves;
      } else {
        engagementMap.set(dateKey, { date: dateKey, likes: p.likes, comments: p.comments, saves: p.saves });
      }
    }
    const weeklyEngagement = [...engagementMap.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    return { totalPosts, totalLikes, followers: 0, recentPosts, weeklyEngagement };
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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t('totalPosts')}
          value={data.totalPosts}
          icon={ImageIcon}
          gradient="bg-gradient-to-br from-purple-500 to-purple-700"
        />
        <StatCard
          title={t('totalLikes')}
          value={data.totalLikes}
          icon={Heart}
          gradient="bg-gradient-to-br from-pink-500 to-pink-700"
        />
        <StatCard
          title={t('followers')}
          value={data.followers}
          icon={Users}
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
            {data.recentPosts.map((post) => (
              <div
                key={post.id}
                className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-950 transition-colors hover:border-slate-700"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={post.mediaUrl || post.imageUrl}
                    alt={post.caption}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    width={400}
                    height={400}
                  />
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm text-slate-300">
                    {post.caption}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(post.date).toLocaleDateString()}
                  </p>
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
