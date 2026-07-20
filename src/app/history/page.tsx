'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ImageIcon, Loader2 } from 'lucide-react';
import type { PostRecord, PerformanceRecord } from '@/types';

function StatusBadge({ status }: { status: PostRecord['status'] }) {
  const t = useTranslations('history');
  const map: Record<PostRecord['status'], { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
    published: { variant: 'default', label: t('published') },
    pending: { variant: 'secondary', label: t('pending') },
    failed: { variant: 'destructive', label: t('failed') },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export default function HistoryPage() {
  const t = useTranslations('history');
  const [selected, setSelected] = useState<PostRecord | null>(null);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [postsRes, perfRes] = await Promise.all([
          fetch('/api/sheets'),
          fetch('/api/sheets/performance'),
        ]);
        if (postsRes.ok) {
          const postsJson = await postsRes.json();
          setPosts(postsJson.data ?? []);
        }
        if (perfRes.ok) {
          const perfJson = await perfRes.json();
          setPerformance(perfJson.data ?? []);
        }
      } catch {
        // silently handle network errors - show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function getPerf(mediaId: string) {
    return performance.find((p) => p.mediaId === mediaId);
  }

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

  if (posts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ImageIcon className="h-12 w-12 text-slate-600" />
            <p className="mt-3 text-sm text-slate-400">{t('noData')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>

      <Card className="border-slate-800 bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 w-16" />
              <TableHead className="text-slate-400">{t('caption')}</TableHead>
              <TableHead className="text-slate-400 text-right">{t('date')}</TableHead>
              <TableHead className="text-slate-400 text-right">{t('likes')}</TableHead>
              <TableHead className="text-slate-400 text-right">{t('comments')}</TableHead>
              <TableHead className="text-slate-400 text-center">{t('status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => {
              const perf = getPerf(post.mediaId);
              const imgSrc = post.mediaUrl || post.imageUrl || undefined;
              return (
                <TableRow
                  key={post.id}
                  className="cursor-pointer border-slate-800 hover:bg-slate-800/50"
                  onClick={() => setSelected(post)}
                >
                  <TableCell className="py-2">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800">
                        <ImageIcon className="h-5 w-5 text-slate-600" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm text-slate-300">
                    <span className="line-clamp-1">{post.caption}</span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-400">
                    {new Date(post.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-300">
                    {perf?.likes ?? '-'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-300">
                    {perf?.comments ?? '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={post.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="overflow-y-auto bg-slate-900 border-slate-800">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{t('detail')}</SheetTitle>
                <SheetDescription className="text-slate-400">
                  {new Date(selected.date).toLocaleString()}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                {(selected.mediaUrl || selected.imageUrl) && (
                  <img
                    src={selected.mediaUrl || selected.imageUrl}
                    alt=""
                    className="w-full rounded-xl object-cover"
                  />
                )}
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">{t('fullCaption')}</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {selected.caption}
                  </p>
                  <p className="mt-1 text-sm text-purple-400">{selected.hashtags}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">{t('prompt')}</p>
                  <p className="text-sm text-slate-300 font-mono">{selected.prompt}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">{t('trendReport')}</p>
                  <p className="text-sm text-slate-300">{selected.trendReport}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
