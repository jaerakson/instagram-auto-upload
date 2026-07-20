import { NextResponse } from 'next/server';
import { getGeminiService, getInstagramService } from '@/lib/services';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, PostRecord, PipelineStep, PerformanceRecord } from '@/types';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

      const trendResult = await geminiService.analyzeTrends(performanceData);
      const promptResult = await geminiService.generatePrompt(trendResult);

      finalPrompt = promptResult.prompt;
      finalStyle = promptResult.style;
      finalTrendReport = promptResult.trendReport;

      steps[0] = {
        step: 'trend',
        status: 'complete',
        result: trendResult,
      };

      // Step 2: Image generation
      steps[1] = { step: 'image', status: 'running' };
      const imageResult = await geminiService.generateImage(finalPrompt, {
        aspectRatio: '1:1',
      });
      steps[1] = {
        step: 'image',
        status: 'complete',
        result: {
          imageUrl: imageResult.imageUrl,
          prompt: finalPrompt,
          designIntent: finalStyle,
          model: 'imagen-4.0-generate-001',
          imageSize: '1:1',
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
      const fullText = `${finalCaption}\n\n${finalHashtags}`.trim();
      const uploadResult = await instagramService.uploadPhoto(imageResult.imageUrl, fullText);
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
        imageUrl: imageResult.imageUrl,
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
      const { prompt, caption, hashtags, style, trendReport } = body;
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

      // Step 2: Image generation
      steps[1] = { step: 'image', status: 'running' };
      const imageResult = await geminiService.generateImage(finalPrompt, {
        aspectRatio: '1:1',
      });
      steps[1] = {
        step: 'image',
        status: 'complete',
        result: {
          imageUrl: imageResult.imageUrl,
          prompt: finalPrompt,
          designIntent: finalStyle,
          model: 'imagen-4.0-generate-001',
          imageSize: '1:1',
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
      const fullText = `${finalCaption}\n\n${finalHashtags}`.trim();
      const uploadResult = await instagramService.uploadPhoto(imageResult.imageUrl, fullText);
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
        imageUrl: imageResult.imageUrl,
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
