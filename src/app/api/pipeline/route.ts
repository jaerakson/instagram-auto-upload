import { NextResponse } from 'next/server';
import { getGeminiService, getInstagramService } from '@/lib/services';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, PostRecord, PipelineStep } from '@/types';

export async function POST(request: Request) {
  const steps: PipelineStep[] = [
    { step: 'trend', status: 'idle' },
    { step: 'image', status: 'idle' },
    { step: 'caption', status: 'idle' },
    { step: 'upload', status: 'idle' },
  ];

  try {
    const { mode, prompt, caption, hashtags, style, trendReport } = await request.json();
    const isAuto = mode === 'auto';

    if (!prompt) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'prompt는 필수입니다.' },
        { status: 400 },
      );
    }

    // Step 1: Trend (pass-through for manual, placeholder for auto)
    steps[0] = {
      step: 'trend',
      status: 'complete',
      result: {
        summary: trendReport || 'Manual mode - trend analysis skipped',
        topStyles: style ? [style] : [],
        keywords: [],
        hashtags: hashtags ? hashtags.split(' ').filter(Boolean) : [],
        avoidList: [],
      },
    };

    // Step 2: Image generation
    steps[1] = { step: 'image', status: 'running' };
    let geminiService;
    try {
      geminiService = await getGeminiService();
    } catch (e) {
      steps[1] = { step: 'image', status: 'error', error: e instanceof Error ? e.message : 'GEMINI_KEY not configured' };
      return NextResponse.json<ApiResponse<PipelineStep[]>>(
        { success: false, data: steps, error: steps[1].error },
        { status: 500 },
      );
    }
    const imageResult = await geminiService.generateImage(prompt, {
      aspectRatio: '1:1',
    });
    steps[1] = {
      step: 'image',
      status: 'complete',
      result: {
        imageUrl: imageResult.imageUrl,
        prompt,
        designIntent: style || '',
        model: 'imagen-3.0-generate-002',
        imageSize: '1:1',
      },
    };

    // Step 3: Caption (pass-through for manual)
    const finalCaption = caption || prompt;
    const finalHashtags = hashtags || '';
    steps[2] = {
      step: 'caption',
      status: 'complete',
      result: {
        caption: finalCaption,
        hashtags: finalHashtags,
        fullText: `${finalCaption}\n\n${finalHashtags}`.trim(),
        strategy: isAuto ? 'auto-generated' : 'manual',
      },
    };

    // Step 4: Upload to Instagram
    steps[3] = { step: 'upload', status: 'running' };
    let instagramService;
    try {
      instagramService = await getInstagramService();
    } catch (e) {
      steps[3] = { step: 'upload', status: 'error', error: e instanceof Error ? e.message : 'Instagram credentials not configured' };
      // Still save the post record as 'pending'
      const postRecord: PostRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        prompt,
        caption: finalCaption,
        hashtags: finalHashtags,
        imageUrl: imageResult.imageUrl,
        mediaId: '',
        mediaUrl: '',
        status: 'pending',
        trendReport: trendReport || '',
        style: style || '',
      };
      if (process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        await sheetsService.addPost(postRecord);
      }
      return NextResponse.json<ApiResponse<PipelineStep[]>>(
        { success: false, data: steps, error: steps[3].error },
        { status: 500 },
      );
    }

    const fullText = `${finalCaption}\n\n${finalHashtags}`.trim();
    const uploadResult = await instagramService.uploadPhoto(imageResult.imageUrl, fullText);
    steps[3] = {
      step: 'upload',
      status: 'complete',
      result: {
        success: true,
        mediaId: uploadResult.mediaId,
        postedAt: new Date().toISOString(),
      },
    };

    // Save post record to Google Sheets
    const postRecord: PostRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      prompt,
      caption: finalCaption,
      hashtags: finalHashtags,
      imageUrl: imageResult.imageUrl,
      mediaId: uploadResult.mediaId,
      mediaUrl: '',
      status: 'published',
      trendReport: trendReport || '',
      style: style || '',
    };
    if (process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      await sheetsService.addPost(postRecord);
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
