'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  ImageIcon,
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { PipelineStep, TrendResult, ImageResult, CaptionResult, UploadResult } from '@/types';

const steps = [
  { step: 'trend' as const, icon: TrendingUp },
  { step: 'image' as const, icon: ImageIcon },
  { step: 'caption' as const, icon: FileText },
  { step: 'upload' as const, icon: Upload },
] as const;

function StatusBadge({ status }: { status: PipelineStep['status'] }) {
  const t = useTranslations('create');
  const variants: Record<PipelineStep['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    idle: { variant: 'outline', label: 'Idle' },
    running: { variant: 'secondary', label: t('running') },
    complete: { variant: 'default', label: t('complete') },
    error: { variant: 'destructive', label: 'Error' },
  };
  const { variant, label } = variants[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export default function CreatePage() {
  const t = useTranslations('create');
  const [pipeline, setPipeline] = useState<PipelineStep[]>(
    steps.map(({ step }) => ({ step, status: 'idle' }))
  );
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [trendReport, setTrendReport] = useState('');

  async function handleAutoGenerate() {
    setGeneratingPrompt(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/generate-prompt', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Prompt generation failed');
      setPrompt(json.data.prompt);
      setStyle(json.data.style);
      if (json.data.trendReport) setTrendReport(json.data.trendReport);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to generate prompt');
    } finally {
      setGeneratingPrompt(false);
    }
  }

  function canRun(stepIndex: number) {
    if (stepIndex === 0) {
      return (pipeline[0].status === 'idle' || pipeline[0].status === 'error') && prompt.trim().length > 0;
    }
    if (stepIndex === 2) {
      return pipeline[1].status === 'complete' && pipeline[2].status !== 'complete';
    }
    return pipeline[stepIndex - 1].status === 'complete' && pipeline[stepIndex].status !== 'running';
  }

  async function runStep(stepIndex: number) {
    const step = steps[stepIndex].step;
    setErrorMsg('');
    setPipeline((prev) => {
      const next = [...prev];
      next[stepIndex] = { ...next[stepIndex], status: 'running', error: undefined };
      return next;
    });

    try {
      switch (step) {
        case 'trend': {
          const trendResult: TrendResult = {
            summary: `Prompt: "${prompt.trim()}"`,
            topStyles: style ? style.split(',').map((s) => s.trim()).filter(Boolean) : [],
            keywords: prompt.split(' ').filter((w) => w.length > 3),
            hashtags: ['#AIart', '#AIgenerated'],
            avoidList: [],
          };
          setPipeline((prev) => {
            const next = [...prev];
            next[0] = { step: 'trend', status: 'complete', result: trendResult };
            return next;
          });
          break;
        }
        case 'image': {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt.trim(), imageSize: 'square_hd' }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Image generation failed');
          const imageResult: ImageResult = {
            imageUrl: json.data.imageUrl,
            prompt: prompt.trim(),
            designIntent: style || '',
            model: 'imagen-3.0-generate-002',
            imageSize: '1:1',
          };
          setPipeline((prev) => {
            const next = [...prev];
            next[1] = { step: 'image', status: 'complete', result: imageResult };
            return next;
          });
          break;
        }
        case 'caption': {
          const captionResult: CaptionResult = {
            caption: editCaption,
            hashtags: editHashtags,
            fullText: `${editCaption}\n\n${editHashtags}`.trim(),
            strategy: 'manual',
          };
          setPipeline((prev) => {
            const next = [...prev];
            next[2] = { step: 'caption', status: 'complete', result: captionResult };
            return next;
          });
          break;
        }
        case 'upload': {
          const imageStep = pipeline[1].result as ImageResult;
          const fullText = `${editCaption}\n\n${editHashtags}`.trim();
          const res = await fetch('/api/instagram/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: imageStep.imageUrl, caption: fullText }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Upload failed');
          const uploadResult: UploadResult = {
            success: true,
            mediaId: json.data.mediaId,
            postedAt: new Date().toISOString(),
          };
          // Save to Google Sheets
          await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              prompt: prompt.trim(),
              caption: editCaption,
              hashtags: editHashtags,
              imageUrl: imageStep.imageUrl,
              mediaId: json.data.mediaId,
              mediaUrl: '',
              status: 'published',
              trendReport: '',
              style: style || '',
            }),
          });
          setPipeline((prev) => {
            const next = [...prev];
            next[3] = { step: 'upload', status: 'complete', result: uploadResult };
            return next;
          });
          break;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMsg(msg);
      setPipeline((prev) => {
        const next = [...prev];
        next[stepIndex] = { ...next[stepIndex], status: 'error', error: msg };
        return next;
      });
    }
  }

  const stepTitleKeys = ['step1', 'step2', 'step3', 'step4'] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-4">
        {steps.map(({ step, icon: Icon }, i) => {
          const pipelineStep = pipeline[i];
          const isRunnable = canRun(i);

          return (
            <Card key={step} className="border-slate-800 bg-slate-900">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                    <Icon className="h-4 w-4 text-slate-300" />
                  </div>
                  <CardTitle className="text-base text-white">
                    {t(stepTitleKeys[i])}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={pipelineStep.status} />
                  {step === 'upload' ? (
                    <Button
                      size="sm"
                      disabled={!isRunnable}
                      onClick={() => runStep(i)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-40"
                    >
                      {pipelineStep.status === 'running' && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      {t('publish')}
                    </Button>
                  ) : step === 'caption' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isRunnable || !editCaption.trim()}
                      onClick={() => runStep(i)}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                    >
                      {t('confirm')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isRunnable}
                      onClick={() => runStep(i)}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                    >
                      {pipelineStep.status === 'running' && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      {pipelineStep.status === 'running' ? t('running') : t('run')}
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Step 1: Prompt input (always visible when idle or error) */}
              {step === 'trend' && (pipelineStep.status === 'idle' || pipelineStep.status === 'error') && (
                <CardContent className="border-t border-slate-800 pt-4 space-y-3">
                  {trendReport && (
                    <div className="rounded-lg border border-indigo-800/50 bg-indigo-950/30 p-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-indigo-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>{t('trendAnalysis')}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-300" style={{ whiteSpace: 'pre-wrap' }}>
                        {trendReport}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAutoGenerate}
                      disabled={generatingPrompt}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
                    >
                      {generatingPrompt ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t('autoGenerating')}</>
                      ) : (
                        <><Sparkles className="mr-1.5 h-3.5 w-3.5" />{t('autoGenerate')}</>
                      )}
                    </Button>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-500">{t('promptLabel')}</label>
                    <Input
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t('promptPlaceholder')}
                      className="border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-600 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-500">{t('styleLabel')}</label>
                    <Input
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder={t('stylePlaceholder')}
                      className="border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-600 focus:border-purple-500"
                    />
                  </div>
                </CardContent>
              )}

              {/* Step 3: Caption editor (visible after image generation) */}
              {step === 'caption' && pipeline[1].status === 'complete' && pipelineStep.status !== 'complete' && (
                <CardContent className="border-t border-slate-800 pt-4">
                  <CaptionResultView
                    caption={editCaption}
                    hashtags={editHashtags}
                    onCaptionChange={setEditCaption}
                    onHashtagsChange={setEditHashtags}
                  />
                </CardContent>
              )}

              {/* Completed results */}
              {pipelineStep.status === 'complete' && pipelineStep.result && (
                <CardContent className="border-t border-slate-800 pt-4">
                  {step === 'trend' && (
                    <TrendResultView result={pipelineStep.result as TrendResult} />
                  )}
                  {step === 'image' && (
                    <ImageResultView result={pipelineStep.result as ImageResult} />
                  )}
                  {step === 'caption' && (
                    <CaptionResultView
                      caption={editCaption}
                      hashtags={editHashtags}
                      onCaptionChange={setEditCaption}
                      onHashtagsChange={setEditHashtags}
                    />
                  )}
                  {step === 'upload' && (
                    <UploadResultView result={pipelineStep.result as UploadResult} />
                  )}
                </CardContent>
              )}

              {/* Error display */}
              {pipelineStep.status === 'error' && pipelineStep.error && step !== 'trend' && (
                <CardContent className="border-t border-slate-800 pt-4">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <XCircle className="h-4 w-4" />
                    <span>{pipelineStep.error}</span>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TrendResultView({ result }: { result: TrendResult }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">{result.summary}</p>
      <div className="flex flex-wrap gap-1.5">
        {result.topStyles.map((s) => (
          <Badge key={s} variant="secondary" className="bg-purple-500/10 text-purple-400">{s}</Badge>
        ))}
      </div>
      {result.performanceFeedback && (
        <p className="text-xs text-emerald-400">{result.performanceFeedback}</p>
      )}
    </div>
  );
}

function ImageResultView({ result }: { result: ImageResult }) {
  const t = useTranslations('create');
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="shrink-0 overflow-hidden rounded-xl">
        <img
          src={result.imageUrl}
          alt="Generated"
          className="h-48 w-48 object-cover"
          width={192}
          height={192}
        />
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-slate-500">{t('promptUsed')}:</span>
          <p className="text-slate-300">{result.prompt}</p>
        </div>
        <div>
          <span className="text-slate-500">{t('designIntent')}:</span>
          <p className="text-slate-300">{result.designIntent}</p>
        </div>
      </div>
    </div>
  );
}

function CaptionResultView({
  caption,
  hashtags,
  onCaptionChange,
  onHashtagsChange,
}: {
  caption: string;
  hashtags: string;
  onCaptionChange: (v: string) => void;
  onHashtagsChange: (v: string) => void;
}) {
  const t = useTranslations('create');
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-slate-500">{t('caption')}</label>
        <textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
          rows={2}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">{t('hashtags')}</label>
        <textarea
          value={hashtags}
          onChange={(e) => onHashtagsChange(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
          rows={2}
        />
      </div>
    </div>
  );
}

function UploadResultView({ result }: { result: UploadResult }) {
  if (result.success) {
    return (
      <div className="flex items-center gap-2 text-emerald-400">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm">Published successfully (Media ID: {result.mediaId})</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-red-400">
      <XCircle className="h-5 w-5" />
      <span className="text-sm">{result.error}</span>
    </div>
  );
}
