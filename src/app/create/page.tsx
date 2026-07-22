'use client';

import { useState, useRef, useEffect } from 'react';
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
  Square,
  Save,
  Download,
} from 'lucide-react';
import type { CaptionLanguage, MediaType, StylePreset, TrendPreset, ImageQuality, PipelineStep, TrendResult, ImageResult, CaptionResult, UploadResult } from '@/types';
import { IMAGE_QUALITY_COSTS } from '@/types';
import { cn } from '@/lib/utils';

const LANGUAGE_OPTIONS: { value: CaptionLanguage; labelKey: string }[] = [
  { value: 'ko', labelKey: 'langKo' },
  { value: 'en', labelKey: 'langEn' },
  { value: 'ko+en', labelKey: 'langKoEn' },
  { value: 'ja', labelKey: 'langJa' },
  { value: 'ja+ko', labelKey: 'langJaKo' },
];

const TREND_PRESET_OPTIONS: { value: TrendPreset; labelKey: string }[] = [
  { value: 'portrait', labelKey: 'trendPortrait' },
  { value: 'anime', labelKey: 'trendAnime' },
  { value: 'dark_mood', labelKey: 'trendDarkMood' },
  { value: 'minimal', labelKey: 'trendMinimal' },
  { value: 'trend_tracking', labelKey: 'trendTracking' },
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
  const [autoProgress, setAutoProgress] = useState(0); // 0~100
  const [autoStepLabel, setAutoStepLabel] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [stylePreset, setStylePreset] = useState<StylePreset>('photorealistic');
  const [trendPreset, setTrendPreset] = useState<TrendPreset>('portrait');
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savedProgress, setSavedProgress] = useState(false);
  const [pendingJob, setPendingJob] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [imageQuality, setImageQuality] = useState<ImageQuality>('standard');
  const [driveAutoSave, setDriveAutoSave] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveSaveStatus, setDriveSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  useEffect(() => {
    // Fetch USD→KRW exchange rate
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { if (d.rates?.KRW) setExchangeRate(d.rates.KRW); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function init() {
      // 설정에서 기본값 로드
      try {
        const settingsRes = await fetch('/api/sheets/settings');
        const settingsJson = await settingsRes.json();
        if (settingsJson.success && settingsJson.data) {
          const s = settingsJson.data;
          if (s.mediaType) setMediaType(s.mediaType);
          if (s.stylePreset) setStylePreset(s.stylePreset);
          if (s.trendPreset) setTrendPreset(s.trendPreset);
          if (s.captionLanguage) setCaptionLang(s.captionLanguage);
          if (s.imageQuality) setImageQuality(s.imageQuality);
          if (s.googleDriveAutoSave) setDriveAutoSave(true);
          if (s.googleDriveFolderId) setDriveFolderId(s.googleDriveFolderId);
        }
      } catch { /* ignore */ }

      // Check for retry from history page
      const retryData = sessionStorage.getItem('retryPost');
      if (retryData) {
        sessionStorage.removeItem('retryPost');
        try {
          const job = JSON.parse(retryData);
          setPendingJob(job);
          setShowResumeBanner(true);
          return; // skip pending job check since we have retry data
        } catch { /* ignore */ }
      }

      // 미완료 작업 체크
      try {
        const res = await fetch('/api/pipeline/job');
        const json = await res.json();
        if (json.success && json.data) {
          setShowResumeBanner(true);
          setPendingJob(json.data);
        }
      } catch { /* ignore */ }
    }
    init();
  }, []);

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
    setAutoProgress(0);
    setAutoStepLabel('');
    setTotalTokens(0);
    setTotalCost(0);
    setJobId(null);
  }

  function handleCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setAutoAllRunning(false);
    setGeneratingPrompt(false);
    setAutoProgress(0);
    setAutoStepLabel('');
    setPipeline((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length; i++) {
        if (next[i].status === 'running') {
          next[i] = { ...next[i], status: 'idle', error: undefined };
        }
      }
      return next;
    });
    setErrorMsg(t('cancelled'));
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
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;
    setAutoAllRunning(true);
    setErrorMsg('');
    setAutoProgress(5);
    setAutoStepLabel(t('step1'));
    try {
      // Create job in Sheets
      let currentJobId = jobId;
      if (!currentJobId) {
        const jobRes = await fetch('/api/pipeline/job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaType, stylePreset, captionLang, trendPreset }),
          signal,
        });
        const jobJson = await jobRes.json();
        if (jobJson.success) {
          currentJobId = jobJson.data.id;
          setJobId(currentJobId);
        }
      }

      // Step 1: Trend analysis + prompt generation
      setGeneratingPrompt(true);
      const promptRes = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stylePreset }),
        signal,
      });
      const promptJson = await promptRes.json();
      if (!promptJson.success) throw new Error(promptJson.error || 'Prompt generation failed');

      const generatedPrompt = promptJson.data.prompt;
      const generatedStyle = promptJson.data.style;
      const generatedTrendReport = promptJson.data.trendReport || '';
      let runTokens = promptJson.data.totalTokens || 0;
      let runCost = promptJson.data.totalCost || 0;
      setTotalTokens(runTokens);
      setTotalCost(runCost);

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
      setAutoProgress(25);
      setAutoStepLabel(t(mediaType === 'reels' ? 'step2Reels' : 'step2'));

      if (currentJobId) {
        await fetch('/api/pipeline/job', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentJobId, currentStep: 1, prompt: generatedPrompt, style: generatedStyle, trendReport: generatedTrendReport, mediaType, stylePreset, captionLang, trendPreset }),
          signal,
        });
      }

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
          quality: imageQuality,
        }),
        signal,
      });
      const imgJson = await imgRes.json();
      if (!imgJson.success) throw new Error(imgJson.error || 'Image generation failed');
      const imageCost = mediaType === 'reels' ? 2.80 : IMAGE_QUALITY_COSTS[imageQuality];
      runCost += imageCost;
      setTotalCost(runCost);
      const imageResult: ImageResult = {
        imageUrl: imgJson.data.imageUrl || imgJson.data.videoUrl || '',
        prompt: generatedPrompt.trim(),
        designIntent: generatedStyle || '',
        model: mediaType === 'reels' ? 'veo-3.1-generate-preview' : (imageQuality === 'ultra' ? 'imagen-4.0-ultra-generate-001' : 'imagen-4.0-generate-001'),
        imageSize: mediaType === 'reels' ? '9:16' : '1:1',
        mediaType,
      };
      setPipeline((prev) => {
        const next = [...prev];
        next[1] = { step: 'image', status: 'complete', result: imageResult };
        return next;
      });

      if (currentJobId) {
        await fetch('/api/pipeline/job', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentJobId, currentStep: 2, imageUrl: imageResult.imageUrl, mediaType, stylePreset, captionLang, trendPreset }),
          signal,
        });
      }

      // Google Drive auto-save (background, non-blocking)
      if (driveAutoSave && driveFolderId && imageResult.imageUrl) {
        setDriveSaveStatus('saving');
        const ext = mediaType === 'reels' ? 'mp4' : 'png';
        const driveFilename = `insta-${new Date().toISOString().slice(0, 10)}-${stylePreset}.${ext}`;
        fetch('/api/drive/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: imageResult.imageUrl, filename: driveFilename, folderId: driveFolderId }),
        })
          .then(r => r.json())
          .then(j => setDriveSaveStatus(j.success ? 'saved' : 'failed'))
          .catch(() => setDriveSaveStatus('failed'));
      }

      // Step 3: Caption generation
      setAutoProgress(50);
      setAutoStepLabel(t('step3'));
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
        signal,
      });
      const capJson = await capRes.json();
      if (!capJson.success) throw new Error(capJson.error || 'Caption generation failed');

      runTokens += capJson.data.totalTokens || 0;
      runCost += capJson.data.totalCost || 0;
      setTotalTokens(runTokens);
      setTotalCost(runCost);
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

      if (currentJobId) {
        await fetch('/api/pipeline/job', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentJobId, currentStep: 3, caption: generatedCaption, hashtags: generatedHashtags, mediaType, stylePreset, captionLang, trendPreset }),
          signal,
        });
      }

      // Step 4: Upload
      setAutoProgress(75);
      setAutoStepLabel(t('step4'));
      setPipeline((prev) => {
        const next = [...prev];
        next[3] = { ...next[3], status: 'running', error: undefined };
        return next;
      });
      const styleLabel = STYLE_PRESET_OPTIONS.find(o => o.value === stylePreset)?.value || 'photorealistic';
      const fullText = `${generatedCaption}\n\n[image prompt]\n${generatedPrompt.trim()}\n\n[style] ${styleLabel}\n\n${generatedHashtags}`.trim();
      const uploadRes = await fetch('/api/instagram/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: mediaType === 'image' ? imageResult.imageUrl : undefined,
          videoUrl: mediaType === 'reels' ? imageResult.imageUrl : undefined,
          caption: fullText,
          mediaType,
        }),
        signal,
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
          totalTokens: runTokens,
          totalCost: runCost,
        }),
        signal,
      });
      if (currentJobId) {
        await fetch('/api/pipeline/job', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentJobId, currentStep: 4, status: 'published', mediaId: uploadJson.data.mediaId, mediaUrl: uploadJson.data.mediaUrl || '', mediaType, stylePreset, captionLang, trendPreset }),
          signal,
        });
        setJobId(null);
      }
      setAutoProgress(100);
      setAutoStepLabel(t('complete'));
      setPipeline((prev) => {
        const next = [...prev];
        next[3] = { step: 'upload', status: 'complete', result: uploadResult };
        return next;
      });
    } catch (error) {
      if (signal.aborted) return; // 취소된 경우 무시
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMsg(msg);
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
      abortRef.current = null;
    }
  }

  function handleResume() {
    if (!pendingJob) return;
    const job = pendingJob;
    setJobId(job.id);
    setPrompt(job.prompt || '');
    setStyle(job.style || '');
    setEditCaption(job.caption || '');
    setEditHashtags(job.hashtags || '');
    setTrendReport(job.trendReport || '');
    if (job.mediaType) setMediaType(job.mediaType);
    if (job.stylePreset) setStylePreset(job.stylePreset);
    if (job.captionLang) setCaptionLang(job.captionLang);
    if (job.trendPreset) setTrendPreset(job.trendPreset);

    const step = job.currentStep || 0;
    setPipeline(prev => {
      const next = [...prev];
      if (step >= 1) next[0] = { step: 'trend', status: 'complete', result: { summary: job.trendReport || '', topStyles: job.style ? job.style.split(',').map((s: string) => s.trim()) : [], keywords: [], hashtags: [], avoidList: [] } };
      if (step >= 2) next[1] = { step: 'image', status: 'complete', result: { imageUrl: job.imageUrl || '', prompt: job.prompt || '', designIntent: job.style || '', model: job.mediaType === 'reels' ? 'veo-3.1-generate-preview' : 'imagen-4.0-generate-001', imageSize: job.mediaType === 'reels' ? '9:16' : '1:1', mediaType: job.mediaType } };
      if (step >= 3) next[2] = { step: 'caption', status: 'complete', result: { caption: job.caption || '', hashtags: job.hashtags || '', fullText: `${job.caption}\n\n${job.hashtags}`.trim(), strategy: 'restored' } };
      return next;
    });

    setShowResumeBanner(false);
    setPendingJob(null);
  }

  async function handleDiscardResume() {
    if (pendingJob?.id) {
      try {
        await fetch('/api/pipeline/job', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pendingJob.id }),
        });
      } catch { /* ignore */ }
    }
    setShowResumeBanner(false);
    setPendingJob(null);
  }

  async function handleSaveProgress() {
    setSavingProgress(true);
    try {
      const currentStep = pipeline.filter(s => s.status === 'complete').length;
      const imageStep = pipeline[1].result as ImageResult | undefined;

      if (jobId) {
        await fetch('/api/pipeline/job', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: jobId,
            currentStep,
            prompt: prompt.trim(),
            style,
            trendReport,
            imageUrl: imageStep?.imageUrl || '',
            caption: editCaption,
            hashtags: editHashtags,
            mediaType,
            stylePreset,
            captionLang,
            trendPreset,
          }),
        });
      } else {
        const res = await fetch('/api/pipeline/job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentStep,
            prompt: prompt.trim(),
            style,
            trendReport,
            imageUrl: imageStep?.imageUrl || '',
            caption: editCaption,
            hashtags: editHashtags,
            mediaType,
            stylePreset,
            captionLang,
            trendPreset,
          }),
        });
        const json = await res.json();
        if (json.success) setJobId(json.data.id);
      }
      setSavedProgress(true);
      setTimeout(() => setSavedProgress(false), 2000);
    } catch { /* ignore */ }
    finally { setSavingProgress(false); }
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
              quality: imageQuality,
            }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Image generation failed');
          const imageResult: ImageResult = {
            imageUrl: json.data.imageUrl || json.data.videoUrl || '',
            prompt: prompt.trim(),
            designIntent: style || '',
            model: mediaType === 'reels' ? 'veo-2.0-generate-001' : (imageQuality === 'ultra' ? 'imagen-4.0-ultra-generate-001' : 'imagen-4.0-generate-001'),
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
          const styleLabel = STYLE_PRESET_OPTIONS.find(o => o.value === stylePreset)?.value || 'photorealistic';
          const fullText = `${editCaption}\n\n[image prompt]\n${prompt.trim()}\n\n[style] ${styleLabel}\n\n${editHashtags}`.trim();
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

      {showResumeBanner && pendingJob && (
        <div className="flex items-center justify-between rounded-lg border border-blue-800 bg-blue-950/50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{t('resumeConfirm')} (Step {pendingJob.currentStep}/4)</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleResume} className="bg-blue-600 text-white hover:bg-blue-700">
              {t('resumeYes')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDiscardResume} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              {t('resumeNo')}
            </Button>
          </div>
        </div>
      )}

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
          <label className="text-xs text-slate-500">{t('trendPreset')}</label>
          <select
            value={trendPreset}
            onChange={(e) => setTrendPreset(e.target.value as TrendPreset)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
          >
            {TREND_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
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
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-slate-500">{t('imageQuality')}</label>
          <select
            value={imageQuality}
            onChange={(e) => setImageQuality(e.target.value as ImageQuality)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
          >
            <option value="standard">{t('qualityStandard')}</option>
            <option value="ultra">{t('qualityUltra')}</option>
          </select>
        </div>
        {autoAllRunning ? (
          <Button
            size="lg"
            onClick={handleCancel}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-lg font-semibold hover:from-red-600 hover:to-red-700 h-14 rounded-xl shadow-lg shadow-red-500/20"
          >
            <Square className="mr-2 h-5 w-5" />{t('cancel')}
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={pipeline.some((s) => s.status === 'running')}
            onClick={handleAutoAll}
            className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white text-lg font-semibold hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 disabled:opacity-50 h-14 rounded-xl shadow-lg shadow-purple-500/20"
          >
            <Play className="mr-2 h-5 w-5" />{t('autoAll')}
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          disabled={savingProgress || (!prompt.trim() && !editCaption.trim())}
          onClick={handleSaveProgress}
          className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 h-14 rounded-xl shrink-0"
        >
          {savedProgress ? (
            <><CheckCircle2 className="mr-2 h-5 w-5" />{t('saved')}</>
          ) : savingProgress ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('saving')}</>
          ) : (
            <><Save className="mr-2 h-5 w-5" />{t('saveProgress')}</>
          )}
        </Button>
      </div>

      {/* Progress Bar + Cost */}
      {(autoAllRunning || totalTokens > 0) && (
        <div className="space-y-2">
          {autoAllRunning && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{autoStepLabel}</span>
                <span className="text-slate-500">{autoProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 transition-all duration-700 ease-out"
                  style={{ width: `${autoProgress}%` }}
                />
              </div>
            </>
          )}
          {totalTokens > 0 && (
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Tokens: <span className="text-slate-300 font-mono">{totalTokens.toLocaleString()}</span></span>
              <span>Cost: <span className="text-emerald-400 font-mono">${totalCost.toFixed(4)}{exchangeRate ? ` (≈${Math.round(totalCost * exchangeRate).toLocaleString()}원)` : ''}</span></span>
              <span>{t('estimatedImageCost')}: <span className="text-blue-400 font-mono">${mediaType === 'reels' ? '2.80' : IMAGE_QUALITY_COSTS[imageQuality].toFixed(2)}</span></span>
              {driveSaveStatus !== 'idle' && (
                <span className={cn(
                  'font-medium',
                  driveSaveStatus === 'saving' && 'text-blue-400',
                  driveSaveStatus === 'saved' && 'text-emerald-400',
                  driveSaveStatus === 'failed' && 'text-red-400',
                )}>{t(driveSaveStatus === 'saving' ? 'driveSaving' : driveSaveStatus === 'saved' ? 'driveSaved' : 'driveFailed')}</span>
              )}
            </div>
          )}
        </div>
      )}

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
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">
                      {t(STYLE_PRESET_OPTIONS.find(o => o.value === stylePreset)?.labelKey || 'stylePhotorealistic')}
                    </Badge>
                    <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                      {t(mediaType === 'reels' ? 'mediaReels' : 'mediaImage')}
                    </Badge>
                  </div>
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
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">
                      {t(STYLE_PRESET_OPTIONS.find(o => o.value === stylePreset)?.labelKey || 'stylePhotorealistic')}
                    </Badge>
                    <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                      {t(mediaType === 'reels' ? 'mediaReels' : 'mediaImage')}
                    </Badge>
                  </div>
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
                  <div className="rounded-lg border border-red-800/50 bg-red-950/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                      <XCircle className="h-4 w-4 shrink-0" />
                      <span>{step === 'upload' ? t('step4') : step === 'image' ? t(mediaType === 'reels' ? 'step2Reels' : 'step2') : t('step3')} 실패</span>
                    </div>
                    <p className="text-xs text-red-300/80 font-mono whitespace-pre-wrap break-all pl-6">
                      {pipelineStep.error}
                    </p>
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
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!result.imageUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(result.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const ext = result.mediaType === 'reels' || result.imageUrl.includes('.mp4') ? 'mp4' : 'png';
      const a = document.createElement('a');
      a.href = url;
      a.download = `insta-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    finally { setDownloading(false); }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="shrink-0">
        <div className="overflow-hidden rounded-xl border border-slate-700">
          {result.mediaType === 'reels' || result.imageUrl?.includes('.mp4') ? (
            <video
              src={result.imageUrl}
              controls
              autoPlay
              loop
              playsInline
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
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownload}
          disabled={downloading}
          className="mt-2 w-full border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          {downloading ? (
            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t('downloading')}</>
          ) : (
            <><Download className="mr-1.5 h-3.5 w-3.5" />{t('download')}</>
          )}
        </Button>
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
