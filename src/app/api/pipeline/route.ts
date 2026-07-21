import { NextResponse } from 'next/server';
import { getGeminiService, getInstagramService } from '@/lib/services';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, PostRecord, PipelineStep, PerformanceRecord } from '@/types';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const steps: PipelineStep[] = [
    { step: 'trend', status: 'idle' },
    { step: 'image', status: 'idle' },
    { step: 'caption', status: 'idle' },
    { step: 'upload', status: 'idle' },
  ];

  try {
    const body = await request.json();
    const { mode, language } = body;
    const isAuto = mode === 'auto';
    const captionLang = language || 'en';

    let geminiService;
    try {
      geminiService = await getGeminiService();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'GEMINI_KEY not configured';
      steps[0] = { step: 'trend', status: 'error', error: msg };
      return NextResponse.json<ApiResponse<PipelineStep[]>>(
        { success: false, data: steps, error: msg },
        { status: 500 },
      );
    }

    // Use provided values or generate via AI
    let finalPrompt: string;
    let finalStyle: string;
    let finalTrendReport: string;
    let finalCaption: string;
    let finalHashtags: string;

    let currentMediaType: 'image' | 'reels' = 'image';

    if (isAuto) {
      // === AUTO MODE: Full AI pipeline ===

      // Step 1: Trend analysis + prompt generation via Gemini
      steps[0] = { step: 'trend', status: 'running' };
      let performanceData: PerformanceRecord[] = [];
      try {
        performanceData = await sheetsService.getPerformance();
      } catch {
        // Continue without performance data
      }

      let trendKeywords = '';
      let currentStylePreset = 'photorealistic';
      try {
        const settings = await sheetsService.getSettings();
        trendKeywords = settings.trendKeywords || '';
        currentMediaType = settings.mediaType || 'image';
        currentStylePreset = settings.stylePreset || 'photorealistic';
      } catch {
        // Continue without trend keywords
      }

      const trendResult = await geminiService.analyzeTrends(performanceData, trendKeywords);
      const promptResult = await geminiService.generatePrompt(trendResult, currentStylePreset);

      finalPrompt = promptResult.prompt;
      finalStyle = promptResult.style;
      finalTrendReport = promptResult.trendReport;

      steps[0] = {
        step: 'trend',
        status: 'complete',
        result: trendResult,
      };

      // Step 2: Image/Video generation
      steps[1] = { step: 'image', status: 'running' };
      let mediaUrl: string;
      if (currentMediaType === 'reels') {
        const videoResult = await geminiService.generateVideo(finalPrompt, { aspectRatio: '9:16' });
        mediaUrl = videoResult.videoUrl;
      } else {
        const imageResult = await geminiService.generateImage(finalPrompt, { aspectRatio: '1:1' });
        mediaUrl = imageResult.imageUrl;
      }
      steps[1] = {
        step: 'image',
        status: 'complete',
        result: {
          imageUrl: mediaUrl,
          prompt: finalPrompt,
          designIntent: finalStyle,
          model: currentMediaType === 'reels' ? 'veo-2.0-generate-001' : 'imagen-4.0-generate-001',
          imageSize: currentMediaType === 'reels' ? '9:16' : '1:1',
          mediaType: currentMediaType,
        },
      };

      // Step 3: Caption generation via Gemini
      steps[2] = { step: 'caption', status: 'running' };
      const captionResult = await geminiService.generateCaptionWithRetry({
        prompt: finalPrompt,
        style: finalStyle,
        language: captionLang,
        trendContext: trendResult,
        mode: 'full',
      });
      finalCaption = captionResult.caption;
      finalHashtags = captionResult.hashtags;
      steps[2] = {
        step: 'caption',
        status: 'complete',
        result: {
          caption: finalCaption,
          hashtags: finalHashtags,
          fullText: `${finalCaption}\n\n${finalHashtags}`.trim(),
          strategy: 'ai-generated',
        },
      };

      // Step 4: Upload to Instagram
      steps[3] = { step: 'upload', status: 'running' };
      const instagramService = await getInstagramService();
      const fullText = `${finalCaption}\n\n[image prompt]\n${finalPrompt}\n\n[style] ${currentStylePreset}\n\n${finalHashtags}`.trim();
      let uploadResult;
      if (currentMediaType === 'reels') {
        uploadResult = await instagramService.uploadReels(mediaUrl, fullText);
      } else {
        uploadResult = await instagramService.uploadPhoto(mediaUrl, fullText);
      }
      steps[3] = {
        step: 'upload',
        status: 'complete',
        result: {
          success: true,
          mediaId: uploadResult.mediaId,
          mediaUrl: uploadResult.mediaUrl,
          postedAt: new Date().toISOString(),
        },
      };

      // Save to Google Sheets
      const postRecord: PostRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        prompt: finalPrompt,
        caption: finalCaption,
        hashtags: finalHashtags,
        imageUrl: uploadResult.imageUrl || mediaUrl,
        mediaId: uploadResult.mediaId,
        mediaUrl: uploadResult.mediaUrl,
        status: 'published',
        trendReport: finalTrendReport,
        style: finalStyle,
      };
      if (process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        await sheetsService.addPost(postRecord);
      }
    } else {
      // === MANUAL MODE: Use provided values ===
      const { prompt, caption, hashtags, style, trendReport, mediaType: manualMediaType, stylePreset: manualStylePreset } = body;
      currentMediaType = manualMediaType || 'image';
      if (!prompt) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'prompt는 필수입니다.' },
          { status: 400 },
        );
      }

      finalPrompt = prompt;
      finalStyle = style || '';
      finalTrendReport = trendReport || '';
      finalCaption = caption || prompt;
      finalHashtags = hashtags || '';

      // Step 1: Trend (pass-through)
      steps[0] = {
        step: 'trend',
        status: 'complete',
        result: {
          summary: trendReport || 'Manual mode',
          topStyles: style ? [style] : [],
          keywords: [],
          hashtags: hashtags ? hashtags.split(' ').filter(Boolean) : [],
          avoidList: [],
        },
      };

      // Step 2: Image/Video generation
      steps[1] = { step: 'image', status: 'running' };
      let mediaUrl: string;
      if (currentMediaType === 'reels') {
        const videoResult = await geminiService.generateVideo(finalPrompt, { aspectRatio: '9:16' });
        mediaUrl = videoResult.videoUrl;
      } else {
        const imageResult = await geminiService.generateImage(finalPrompt, { aspectRatio: '1:1' });
        mediaUrl = imageResult.imageUrl;
      }
      steps[1] = {
        step: 'image',
        status: 'complete',
        result: {
          imageUrl: mediaUrl,
          prompt: finalPrompt,
          designIntent: finalStyle,
          model: currentMediaType === 'reels' ? 'veo-2.0-generate-001' : 'imagen-4.0-generate-001',
          imageSize: currentMediaType === 'reels' ? '9:16' : '1:1',
          mediaType: currentMediaType,
        },
      };

      // Step 3: Caption (pass-through)
      steps[2] = {
        step: 'caption',
        status: 'complete',
        result: {
          caption: finalCaption,
          hashtags: finalHashtags,
          fullText: `${finalCaption}\n\n${finalHashtags}`.trim(),
          strategy: 'manual',
        },
      };

      // Step 4: Upload
      steps[3] = { step: 'upload', status: 'running' };
      const instagramService = await getInstagramService();
      const fullText = `${finalCaption}\n\n[image prompt]\n${finalPrompt}\n\n[style] ${manualStylePreset || 'photorealistic'}\n\n${finalHashtags}`.trim();
      let uploadResult;
      if (currentMediaType === 'reels') {
        uploadResult = await instagramService.uploadReels(mediaUrl, fullText);
      } else {
        uploadResult = await instagramService.uploadPhoto(mediaUrl, fullText);
      }
      steps[3] = {
        step: 'upload',
        status: 'complete',
        result: {
          success: true,
          mediaId: uploadResult.mediaId,
          mediaUrl: uploadResult.mediaUrl,
          postedAt: new Date().toISOString(),
        },
      };

      // Save to Google Sheets
      const postRecord: PostRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        prompt: finalPrompt,
        caption: finalCaption,
        hashtags: finalHashtags,
        imageUrl: uploadResult.imageUrl || mediaUrl,
        mediaId: uploadResult.mediaId,
        mediaUrl: uploadResult.mediaUrl,
        status: 'published',
        trendReport: finalTrendReport,
        style: finalStyle,
      };
      if (process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        await sheetsService.addPost(postRecord);
      }
    }

    return NextResponse.json<ApiResponse<PipelineStep[]>>({ success: true, data: steps });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse<PipelineStep[]>>(
      { success: false, data: steps, error: message },
      { status: 500 },
    );
  }
}
