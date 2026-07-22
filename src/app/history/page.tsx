'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ImageIcon, Loader2, Search, X, RotateCcw, ArrowUpDown, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostRecord, PerformanceRecord } from '@/types';

type StatusFilter = 'all' | 'published' | 'failed' | 'pending';
type SortKey = 'date' | 'cost' | 'likes';

function StatusBadge({ status, error }: { status: PostRecord['status']; error?: string }) {
  const t = useTranslations('history');
  const map: Record<PostRecord['status'], { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
    published: { variant: 'default', label: t('published') },
    pending: { variant: 'secondary', label: t('pending') },
    failed: { variant: 'destructive', label: t('failed') },
  };
  const { variant, label } = map[status];
  if (status === 'failed' && error) {
    return (
      <span className="group relative">
        <Badge variant={variant} className="cursor-help">{label}</Badge>
        <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-red-800/50 text-xs text-red-300 whitespace-nowrap max-w-[250px] truncate z-50 shadow-lg">
          {error}
        </span>
      </span>
    );
  }
  return <Badge variant={variant}>{label}</Badge>;
}

export default function HistoryPage() {
  const t = useTranslations('history');
  const locale = useLocale();
  const router = useRouter();
  const [selected, setSelected] = useState<PostRecord | null>(null);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Filters & search
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [downloadingDetail, setDownloadingDetail] = useState(false);

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

    // Fetch exchange rate
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { if (d.rates?.KRW) setExchangeRate(d.rates.KRW); })
      .catch(() => {});
  }, []);

  function getPerf(mediaId: string) {
    return performance.find((p) => p.mediaId === mediaId);
  }

  function formatCostDisplay(cost: number): { primary: string; tooltip: string } {
    const krw = exchangeRate ? cost * exchangeRate : null;
    if (locale === 'ko' && krw !== null) {
      return {
        primary: `≈${Math.round(krw).toLocaleString()}원`,
        tooltip: `$${cost.toFixed(4)} / ≈${Math.round(krw).toLocaleString()}원`,
      };
    }
    return {
      primary: `$${cost.toFixed(4)}`,
      tooltip: krw !== null ? `$${cost.toFixed(4)} / ≈${Math.round(krw).toLocaleString()}원` : `$${cost.toFixed(4)}`,
    };
  }

  // Filter + search + sort
  const filteredPosts = useMemo(() => {
    let result = posts.filter(p => p.id); // filter out empty rows

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.caption && p.caption.toLowerCase().includes(q)) ||
        (p.prompt && p.prompt.toLowerCase().includes(q)) ||
        (p.hashtags && p.hashtags.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortKey === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortKey === 'cost') return (b.totalCost || 0) - (a.totalCost || 0);
      if (sortKey === 'likes') {
        const aLikes = getPerf(a.mediaId)?.likes ?? 0;
        const bLikes = getPerf(b.mediaId)?.likes ?? 0;
        return bLikes - aLikes;
      }
      return 0;
    });

    return result;
  }, [posts, statusFilter, searchQuery, sortKey, performance]);

  async function handleDelete(post: PostRecord) {
    setDeletingId(post.id);
    try {
      await fetch('/api/sheets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: post.id,
          imageUrl: post.status === 'published' ? post.imageUrl : undefined,
        }),
      });
      setPosts(prev => prev.filter(p => p.id !== post.id));
    } catch { /* ignore */ }
    finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  function handleRetry(post: PostRecord) {
    // Store retry data and navigate to create page
    const retryData = {
      id: post.id,
      prompt: post.prompt,
      style: post.style,
      caption: post.caption,
      hashtags: post.hashtags,
      trendReport: post.trendReport,
      imageUrl: post.imageUrl,
      mediaType: post.mediaType || 'image',
      stylePreset: post.stylePreset || 'photorealistic',
      captionLang: post.captionLang || 'ko+en',
      trendPreset: post.trendPreset || 'portrait',
      currentStep: post.currentStep || 0,
      retryCount: (post.retryCount || 0) + 1,
    };
    sessionStorage.setItem('retryPost', JSON.stringify(retryData));
    router.push('/create');
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

  const totalTokensSum = posts.reduce((sum, p) => sum + (p.totalTokens || 0), 0);
  const totalCostSum = posts.reduce((sum, p) => sum + (p.totalCost || 0), 0);

  const statusFilters: { key: StatusFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'filterAll' },
    { key: 'published', labelKey: 'published' },
    { key: 'failed', labelKey: 'failed' },
    { key: 'pending', labelKey: 'pending' },
  ];

  const sortOptions: { key: SortKey; labelKey: string }[] = [
    { key: 'date', labelKey: 'sortDate' },
    { key: 'cost', labelKey: 'sortCost' },
    { key: 'likes', labelKey: 'sortLikes' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        {totalTokensSum > 0 && (
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{t('totalTokens')}: <span className="text-slate-300 font-mono">{totalTokensSum.toLocaleString()}</span></span>
            <span className="group relative cursor-help">{t('totalCost')}: <span className="text-emerald-400 font-mono">{formatCostDisplay(totalCostSum).primary}</span>
              <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-300 whitespace-nowrap z-50 shadow-lg">{formatCostDisplay(totalCostSum).tooltip}</span>
            </span>
          </div>
        )}
      </div>

      {/* Filters, Search, Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex gap-0.5 rounded-md bg-slate-800 p-0.5">
          {statusFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                statusFilter === f.key
                  ? 'bg-purple-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-8 pl-8 pr-8 border-slate-700 bg-slate-950 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
          >
            {sortOptions.map(o => (
              <option key={o.key} value={o.key}>{t(o.labelKey)}</option>
            ))}
          </select>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 w-16" />
              <TableHead className="text-slate-400">{t('caption')}</TableHead>
              <TableHead className="text-slate-400 text-right">{t('date')}</TableHead>
              <TableHead className="text-slate-400 text-right">{t('likes')}</TableHead>
              <TableHead className="text-slate-400 text-right">{t('comments')}</TableHead>
              <TableHead className="text-slate-400 text-right">Cost</TableHead>
              <TableHead className="text-slate-400 text-center">{t('status')}</TableHead>
              <TableHead className="text-slate-400 text-center w-24">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPosts.map((post) => {
              const perf = getPerf(post.mediaId);
              const imgSrc = post.imageUrl || undefined;
              const isFailed = post.status === 'failed';
              return (
                <TableRow
                  key={post.id}
                  className={cn(
                    'cursor-pointer border-slate-800 hover:bg-slate-800/50',
                    isFailed && 'bg-red-950/20'
                  )}
                  onClick={() => setSelected(post)}
                >
                  <TableCell className="py-2">
                    {imgSrc?.includes('.mp4') ? (
                      <video
                        src={imgSrc}
                        muted
                        loop
                        autoPlay
                        playsInline
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : imgSrc ? (
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
                    {post.prompt && (
                      <span className="line-clamp-1 text-xs text-slate-500 mt-0.5 block font-mono">
                        {post.prompt}
                      </span>
                    )}
                    {isFailed && post.error && (
                      <span className="line-clamp-1 text-xs text-red-400 mt-0.5 block">
                        {post.error}
                      </span>
                    )}
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
                  <TableCell className="text-right text-xs font-mono text-emerald-400">
                    {post.totalCost ? (
                      <span className="group relative cursor-help">
                        {formatCostDisplay(post.totalCost).primary}
                        <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-300 whitespace-nowrap z-50 shadow-lg">{formatCostDisplay(post.totalCost).tooltip}</span>
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <StatusBadge status={post.status} error={post.error} />
                      {post.retryCount ? (
                        <span className="text-[10px] text-slate-500">{t('retryCountLabel', { count: post.retryCount })}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {isFailed && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRetry(post)}
                          className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/50"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {t('retry')}
                        </Button>
                      )}
                      {confirmDeleteId === post.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(post)}
                            disabled={deletingId === post.id}
                            className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/50"
                          >
                            {deletingId === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t('confirmDelete')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-7 px-1.5 text-xs text-slate-400 hover:text-slate-300"
                          >
                            {t('cancelDelete')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDeleteId(post.id)}
                          className="h-7 px-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
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
                {selected.imageUrl && (
                  selected.imageUrl.includes('.mp4') ? (
                    <video
                      src={selected.imageUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full rounded-xl"
                    />
                  ) : (
                    <img
                      src={selected.imageUrl}
                      alt=""
                      className="w-full rounded-xl object-cover"
                    />
                  )
                )}
                <div className="flex items-center gap-3">
                  {selected.imageUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingDetail}
                      onClick={async () => {
                        setDownloadingDetail(true);
                        try {
                          const res = await fetch(selected.imageUrl);
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const ext = selected.imageUrl.includes('.mp4') ? 'mp4' : 'png';
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `insta-${new Date(selected.date).toISOString().slice(0, 10)}.${ext}`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch { /* ignore */ }
                        finally { setDownloadingDetail(false); }
                      }}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      {downloadingDetail ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t('downloading')}</>
                      ) : (
                        <><Download className="mr-1.5 h-3.5 w-3.5" />{t('download')}</>
                      )}
                    </Button>
                  )}
                  {selected.mediaUrl && (
                    <a
                      href={selected.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Instagram에서 보기 →
                    </a>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">{t('fullCaption')}</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {selected.caption}
                  </p>
                  <p className="mt-1 text-sm text-purple-400">{selected.hashtags}</p>
                </div>
                <div className="rounded-lg border border-slate-700/50 bg-slate-950 p-3">
                  <p className="mb-1.5 text-xs font-medium text-purple-400">{t('prompt')}</p>
                  <p className="text-sm text-slate-300 font-mono leading-relaxed">{selected.prompt}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">{t('trendReport')}</p>
                  <p className="text-sm text-slate-300">{selected.trendReport}</p>
                </div>
                {selected.error && (
                  <div className="rounded-lg border border-red-800/50 bg-red-950/30 p-3">
                    <p className="mb-1 text-xs font-medium text-red-400">{t('errorReason')}</p>
                    <p className="text-sm text-red-300">{selected.error}</p>
                  </div>
                )}
                {selected.totalCost ? (
                  <div className="text-xs text-slate-500">
                    Cost: <span className="text-emerald-400 font-mono group relative cursor-help">{formatCostDisplay(selected.totalCost).primary}
                      <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-300 whitespace-nowrap z-50 shadow-lg">{formatCostDisplay(selected.totalCost).tooltip}</span>
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
