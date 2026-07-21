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
  RefreshCw,
  Play,
  RotateCcw,
  Film,
} from 'lucide-react';
import type { CaptionLanguage, MediaType, StylePreset, PipelineStep, TrendResult, ImageResult, CaptionResult, UploadResult } from '@/types';
import { cn } from '@/lib/utils';

const LANGUAGE_OPTIONS: { value: CaptionLanguage; labelKey: string }[] = [
  { value: 'ko', labelKey: 'langKo' },
  { value: 'en', labelKey: 'langEn' },
  { value: 'ko+en', labelKey: 'langKoEn' },
  { value: 'ja', labelKey: 'langJa' },
  { value: 'ja+ko', labelKey: 'langJaKo' },
];

const STYLE_PRESET_OPTIONS: { value: StylePreset; labelKey: string }[] = [
  { value: 'photorealistic', labelKey: 'stylePhotorealistic' },
  { value: 'anime', labelKey: 'styleAnime' },
  { value: 'ghibli', labelKey: 'styleGhibli' },
  { value: 'vintage_film', labelKey: 'styleVintageFilm' },
  { value: 'watercolor', labelKey: 'styleWatercolor' },
  { value: '3d_render', labelKey: 'style3dRender' },
  { value: 'pop_art', labelKey: 'stylePopArt' },
];

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
  const [captionLang, setCaptionLang] = useState<CaptionLanguage>('ko+en');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [regeneratingCaption, setRegeneratingCaption] = useState(false);
  const [regeneratingHashtags, setRegeneratingHashtags] = useState(false);
  const [autoAllRunning, setAutoAllRunning] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [stylePreset, setStylePreset] = useState<StylePreset>('photorealistic');

  const isAllComplete = pipeline.every((s) => s.status === 'complete');
  const isUploadComplete = pipeline[3].status === 'complete';

  function handleReset() {
    setPipeline(steps.map(({ step }) => ({ step, status: 'idle' })));
    setPrompt('');
    setStyle('');
    setEditCaption('');
    setEditHashtags('');
    setTrendReport('');
    setErrorMsg('');
  }

  // AI auto-generate: trend analysis + prompt generation → auto-complete trend step
  async function handleAutoGenerate() {
    setGeneratingPrompt(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stylePreset }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Prompt generation failed');
      setPrompt(json.data.prompt);
      setStyle(json.data.style);
      if (json.data.trendReport) setTrendReport(json.data.trendReport);

      // Auto-complete trend step so image button becomes active
      const trendResult: TrendResult = {
        summary: json.data.trendReport || `Style: ${json.data.style}`,
        topStyles: json.data.style ? json.data.style.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        keywords: json.data.prompt.split(' ').filter((w: string) => w.length > 3),
        hashtags: ['#AIart', '#AIgenerated'],
        avoidList: [],
      };
      setPipeline((prev) => {
        const next = [...prev];
        next[0] = { step: 'trend', status: 'complete', result: trendResult };
        return next;
      });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to generate prompt');
    } finally {
      setGeneratingPrompt(false);
    }
  }

  // Generate caption via Gemini
  async function handleGenerateCaption(mode: 'full' | 'caption_only' | 'hashtags_only' = 'full') {
    if (mode === 'full') setGeneratingCaption(true);
    else if (mode === 'caption_only') setRegeneratingCaption(true);
    else setRegeneratingHashtags(true);

    setErrorMsg('');
    try {
      const res = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          language: captionLang,
          mode,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Caption generation failed');

      if (mode === 'full' || mode === 'caption_only') {
        setEditCaption(json.data.caption);
      }
      if (mode === 'full' || mode === 'hashtags_only') {
        setEditHashtags(json.data.hashtags);
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to generate caption');
    } finally {
      setGeneratingCaption(false);
      setRegeneratingCaption(false);
      setRegeneratingHashtags(false);
    }
  }

  // Full pipeline: trend → image → caption → confirm caption → upload
  async function handleAutoAll() {
    setAutoAllRunning(true);
    setErrorMsg('');
    try {
      // Step 1: Trend analysis + prompt generation
      setGeneratingPrompt(true);
      const promptRes = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stylePreset }),
      });
      const promptJson = await promptRes.json();
      if (!promptJson.success) throw new Error(promptJson.error || 'Prompt generation failed');

      const generatedPrompt = promptJson.data.prompt;
      const generatedStyle = promptJson.data.style;
      const generatedTrendReport = promptJson.data.trendReport || '';

      setPrompt(generatedPrompt);
      setStyle(generatedStyle);
      if (generatedTrendReport) setTrendReport(generatedTrendReport);

      const trendResult: TrendResult = {
        summary: generatedTrendReport || `Style: ${generatedStyle}`,
        topStyles: generatedStyle ? generatedStyle.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        keywords: generatedPrompt.split(' ').filter((w: string) => w.length > 3),
        hashtags: ['#AIart', '#AIgenerated'],
        avoidList: [],
      };
      setPipeline((prev) => {
        const next = [...prev];
        next[0] = { step: 'trend', status: 'complete', result: trendResult };
        return next;
      });
      setGeneratingPrompt(false);

      // Step 2: Image generation
      setPipeline((prev) => {
        const next = [...prev];
        next[1] = { ...next[1], status: 'running', error: undefined };
        return next;
      });
      const imgRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatedPrompt.trim(),
          aspectRatio: mediaType === 'reels' ? '9:16' : '1:1',
          type: mediaType,
        }),
      });
      const imgJson = await imgRes.json();
      if (!imgJson.success) throw new Error(imgJson.error || 'Image generation failed');
      const imageResult: ImageResult = {
        imageUrl: imgJson.data.imageUrl || imgJson.data.videoUrl || '',
        prompt: generatedPrompt.trim(),
        designIntent: generatedStyle || '',
        model: mediaType === 'reels' ? 'veo-2.0-generate-001' : 'imagen-4.0-generate-001',
        imageSize: mediaType === 'reels' ? '9:16' : '1:1',
        mediaType,
      };
      setPipeline((prev) => {
        const next = [...prev];
        next[1] = { step: 'image', status: 'complete', result: imageResult };
        return next;
      });

      // Step 3: Caption generation
      setPipeline((prev) => {
        const next = [...prev];
        next[2] = { ...next[2], status: 'running', error: undefined };
        return next;
      });
      const capRes = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatedPrompt.trim(),
          style: generatedStyle,
          language: captionLang,
          mode: 'full',
        }),
      });
      const capJson = await capRes.json();
      if (!capJson.success) throw new Error(capJson.error || 'Caption generation failed');

      const generatedCaption = capJson.data.caption;
      const generatedHashtags = capJson.data.hashtags;
      setEditCaption(generatedCaption);
      setEditHashtags(generatedHashtags);

      // Auto-confirm caption
      const captionResult: CaptionResult = {
        caption: generatedCaption,
        hashtags: generatedHashtags,
        fullText: `${generatedCaption}\n\n${generatedHashtags}`.trim(),
        strategy: 'confirmed',
      };
      setPipeline((prev) => {
        const next = [...prev];
        next[2] = { step: 'caption', status: 'complete', result: captionResult };
        return next;
      });

      // Step 4: Upload
      setPipeline((prev) => {
        const next = [...prev];
        next[3] = { ...next[3], status: 'running', error: undefined };
        return next;
      });
      const fullText = `${generatedCaption}\n\n[image prompt]\n${generatedPrompt.trim()}\n\n${generatedHashtags}`.trim();
      const uploadRes = await fetch('/api/instagram/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: mediaType === 'image' ? imageResult.imageUrl : undefined,
          videoUrl: mediaType === 'reels' ? imageResult.imageUrl : undefined,
          caption: fullText,
          mediaType,
        }),
      });
      const uploadJson = await uploadRes.json();
      if (!uploadJson.success) throw new Error(uploadJson.error || 'Upload failed');
      const uploadResult: UploadResult = {
        success: true,
        mediaId: uploadJson.data.mediaId,
        mediaUrl: uploadJson.data.mediaUrl || '',
        postedAt: new Date().toISOString(),
      };
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          prompt: generatedPrompt.trim(),
          caption: generatedCaption,
          hashtags: generatedHashtags,
          imageUrl: uploadJson.data.imageUrl || imageResult.imageUrl,
          mediaId: uploadJson.data.mediaId,
          mediaUrl: uploadJson.data.mediaUrl || '',
          status: 'published',
          trendReport: generatedTrendReport,
          style: generatedStyle || '',
        }),
      });
      setPipeline((prev) => {
        const next = [...prev];
        next[3] = { step: 'upload', status: 'complete', result: uploadResult };
        return next;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMsg(msg);
      // Mark the currently running step as error
      setPipeline((prev) => {
        const next = [...prev];
        for (let i = 0; i < next.length; i++) {
          if (next[i].status === 'running') {
            next[i] = { ...next[i], status: 'error', error: msg };
          }
        }
        return next;
      });
    } finally {
      setGeneratingPrompt(false);
      setAutoAllRunning(false);
    }
  }

  function canRun(stepIndex: number) {
    if (stepIndex === 0) {
      return pipeline[0].status === 'idle' || pipeline[0].status === 'error';
    }
    if (stepIndex === 1) {
      return pipeline[0].status === 'complete' && (pipeline[1].status === 'idle' || pipeline[1].status === 'error');
    }
    if (stepIndex === 2) {
      return pipeline[1].status === 'complete' && pipeline[2].status !== 'running';
    }
    if (stepIndex === 3) {
      return pipeline[2].status === 'complete' && pipeline[3].status !== 'running';
    }
    return false;
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
            summary: trendReport || `Prompt: "${prompt.trim()}"`,
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
            body: JSON.stringify({
              prompt: prompt.trim(),
              aspectRatio: mediaType === 'reels' ? '9:16' : '1:1',
              type: mediaType,
            }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Image generation failed');
          const imageResult: ImageResult = {
            imageUrl: json.data.imageUrl || json.data.videoUrl || '',
            prompt: prompt.trim(),
            designIntent: style || '',
            model: mediaType === 'reels' ? 'veo-2.0-generate-001' : 'imagen-4.0-generate-001',
            imageSize: mediaType === 'reels' ? '9:16' : '1:1',
            mediaType,
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
            strategy: 'confirmed',
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
          const fullText = `${editCaption}\n\n[image prompt]\n${prompt.trim()}\n\n${editHashtags}`.trim();
          const res = await fetch('/api/instagram/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: mediaType === 'image' ? imageStep.imageUrl : undefined,
              videoUrl: mediaType === 'reels' ? imageStep.imageUrl : undefined,
              caption: fullText,
              mediaType,
            }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Upload failed');
          const uploadResult: UploadResult = {
            success: true,
            mediaId: json.data.mediaId,
            mediaUrl: json.data.mediaUrl || '',
            postedAt: new Date().toISOString(),
          };
          await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              prompt: prompt.trim(),
              caption: editCaption,
              hashtags: editHashtags,
              imageUrl: json.data.imageUrl || imageStep.imageUrl,
              mediaId: json.data.mediaId,
              mediaUrl: json.data.mediaUrl || '',
              status: 'published',
              trendReport: trendReport || '',
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

  const stepTitleKeys = ['step1', mediaType === 'reels' ? 'step2Reels' : 'step2', 'step3', 'step4'] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-slate-500">{t('captionLanguage')}</label>
          <select
            value={captionLang}
            onChange={(e) => setCaptionLang(e.target.value as CaptionLanguage)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-slate-500">{t('mediaType')}</label>
          <div className="flex gap-0.5 rounded-md bg-slate-800 p-0.5">
            <button
              onClick={() => setMediaType('image')}
              className={cn(
                'rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                mediaType === 'image'
                  ? 'bg-purple-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {t('mediaImage')}
            </button>
            <button
              onClick={() => setMediaType('reels')}
              className={cn(
                'rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                mediaType === 'reels'
                  ? 'bg-purple-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {t('mediaReels')}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-slate-500">{t('stylePreset')}</label>
          <select
            value={stylePreset}
            onChange={(e) => setStylePreset(e.target.value as StylePreset)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
          >
            {STYLE_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
        </div>
        <Button
          size="lg"
          disabled={autoAllRunning || pipeline.some((s) => s.status === 'running')}
          onClick={handleAutoAll}
          className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white text-lg font-semibold hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 disabled:opacity-50 h-14 rounded-xl shadow-lg shadow-purple-500/20"
        >
          {autoAllRunning ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('autoAllRunning')}</>
          ) : (
            <><Play className="mr-2 h-5 w-5" />{t('autoAll')}</>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {steps.map(({ step, icon: StepIcon }, i) => {
          const pipelineStep = pipeline[i];
          const isRunnable = canRun(i);
          const Icon = step === 'image' && mediaType === 'reels' ? Film : StepIcon;

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
                  ) : step === 'image' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isRunnable}
                      onClick={() => runStep(i)}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                    >
                      {pipelineStep.status === 'running' ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t(mediaType === 'reels' ? 'generatingVideo' : 'generatingImage')}</>
                      ) : (
                        t('run')
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!isRunnable || generatingPrompt || autoAllRunning}
                      onClick={handleAutoGenerate}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 disabled:opacity-40"
                    >
                      {generatingPrompt ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t('autoGenerating')}</>
                      ) : (
                        <><Sparkles className="mr-1.5 h-3.5 w-3.5" />{t('autoGenerate')}</>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Step 1: Trend / Prompt input — idle or error: manual input + AI auto */}
              {step === 'trend' && (pipelineStep.status === 'idle' || pipelineStep.status === 'error') && (
                <CardContent className="border-t border-slate-800 pt-4 space-y-3">
                  <p className="text-xs text-slate-500">{t('manualInputHint')}</p>
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
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={!prompt.trim()}
                      onClick={() => runStep(0)}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      {t('confirm')}
                    </Button>
                    <span className="text-xs text-slate-600">또는</span>
                  </div>
                </CardContent>
              )}

              {/* Step 1: Trend result — prompt 읽기전용 + 스타일 편집 가능 */}
              {step === 'trend' && pipelineStep.status === 'complete' && pipelineStep.result && (
                <CardContent className="border-t border-slate-800 pt-4">
                  <TrendResultView result={pipelineStep.result as TrendResult} />
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="mb-1.5 block text-xs text-slate-500">{t('promptLabel')}</label>
                      <p className="text-sm text-slate-300 bg-slate-950 rounded-lg px-3 py-2 border border-slate-700">{prompt}</p>
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
                  </div>
                </CardContent>
              )}

              {/* Step 2: Image result with preview */}
              {step === 'image' && pipelineStep.status === 'complete' && pipelineStep.result && (
                <CardContent className="border-t border-slate-800 pt-4">
                  <ImageResultView result={pipelineStep.result as ImageResult} />
                </CardContent>
              )}

              {/* Step 3: Caption editor (visible after image generation) */}
              {step === 'caption' && pipeline[1].status === 'complete' && pipelineStep.status !== 'complete' && (
                <CardContent className="border-t border-slate-800 pt-4">
                  <CaptionEditor
                    caption={editCaption}
                    hashtags={editHashtags}
                    captionLang={captionLang}
                    onCaptionChange={setEditCaption}
                    onHashtagsChange={setEditHashtags}
                    onLanguageChange={setCaptionLang}
                    onGenerateCaption={handleGenerateCaption}
                    generatingCaption={generatingCaption}
                    regeneratingCaption={regeneratingCaption}
                    regeneratingHashtags={regeneratingHashtags}
                    hasPrompt={prompt.trim().length > 0}
                  />
                </CardContent>
              )}

              {/* Step 3: Caption confirmed */}
              {step === 'caption' && pipelineStep.status === 'complete' && (
                <CardContent className="border-t border-slate-800 pt-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">{t('caption')}</label>
                      <p className="text-slate-300 whitespace-pre-wrap">{editCaption}</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">{t('hashtags')}</label>
                      <p className="text-purple-400">{editHashtags}</p>
                    </div>
                  </div>
                </CardContent>
              )}

              {/* Step 4: Upload result */}
              {step === 'upload' && pipelineStep.status === 'complete' && pipelineStep.result && (
                <CardContent className="border-t border-slate-800 pt-4">
                  <UploadResultView result={pipelineStep.result as UploadResult} />
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

      {(isAllComplete || isUploadComplete) && (
        <Button
          size="lg"
          onClick={handleReset}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-lg font-semibold hover:from-emerald-600 hover:to-teal-600 h-14 rounded-xl shadow-lg shadow-emerald-500/20"
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          {t('newPost')}
        </Button>
      )}
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
      <div className="shrink-0 overflow-hidden rounded-xl border border-slate-700">
        {result.mediaType === 'reels' ? (
          <video
            src={result.imageUrl}
            controls
            className="h-64 w-auto max-w-xs object-cover"
          />
        ) : (
          <img
            src={result.imageUrl}
            alt="Generated"
            className="h-64 w-64 object-cover"
            width={256}
            height={256}
          />
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-slate-500">{t('promptUsed')}:</span>
          <p className="text-slate-300 mt-1">{result.prompt}</p>
        </div>
        {result.designIntent && (
          <div>
            <span className="text-slate-500">{t('designIntent')}:</span>
            <p className="text-slate-300 mt-1">{result.designIntent}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CaptionEditor({
  caption,
  hashtags,
  captionLang,
  onCaptionChange,
  onHashtagsChange,
  onLanguageChange,
  onGenerateCaption,
  generatingCaption,
  regeneratingCaption,
  regeneratingHashtags,
  hasPrompt,
}: {
  caption: string;
  hashtags: string;
  captionLang: CaptionLanguage;
  onCaptionChange: (v: string) => void;
  onHashtagsChange: (v: string) => void;
  onLanguageChange: (v: CaptionLanguage) => void;
  onGenerateCaption: (mode: 'full' | 'caption_only' | 'hashtags_only') => void;
  generatingCaption: boolean;
  regeneratingCaption: boolean;
  regeneratingHashtags: boolean;
  hasPrompt: boolean;
}) {
  const t = useTranslations('create');
  return (
    <div className="space-y-4">
      {/* Language selector + AI generate */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">{t('captionLanguage')}</label>
          <select
            value={captionLang}
            onChange={(e) => onLanguageChange(e.target.value as CaptionLanguage)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          onClick={() => onGenerateCaption('full')}
          disabled={generatingCaption || !hasPrompt}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
        >
          {generatingCaption ? (
            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t('generatingCaption')}</>
          ) : (
            <><Sparkles className="mr-1.5 h-3.5 w-3.5" />{t('generateCaption')}</>
          )}
        </Button>
      </div>

      {/* Caption field + regenerate */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-500">{t('caption')}</label>
          {caption && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onGenerateCaption('caption_only')}
              disabled={regeneratingCaption || !hasPrompt}
              className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
            >
              {regeneratingCaption ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              {t('regenerateCaption')}
            </Button>
          )}
        </div>
        <textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
          rows={4}
          placeholder="AI 캡션 생성 버튼을 누르거나 직접 입력하세요"
        />
      </div>

      {/* Hashtags field + regenerate */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-500">{t('hashtags')}</label>
          {hashtags && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onGenerateCaption('hashtags_only')}
              disabled={regeneratingHashtags || !hasPrompt}
              className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
            >
              {regeneratingHashtags ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              {t('regenerateHashtags')}
            </Button>
          )}
        </div>
        <textarea
          value={hashtags}
          onChange={(e) => onHashtagsChange(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
          rows={2}
          placeholder="#AIart #cinematicportrait ..."
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
