import { NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services';
import type { ApiResponse, TrendResult } from '@/types';

export async function POST(request: Request) {
  try {
    const { prompt, style, language, trendKeywords, mode, captionLength, geminiKeyIndex } = await request.json();

    if (!prompt) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'prompt는 필수입니다.' },
        { status: 400 },
      );
    }

    const validLanguages = ['ko', 'en', 'ko+en', 'ja', 'ja+ko'];
    const validModes = ['full', 'caption_only', 'hashtags_only'];

    const lang = validLanguages.includes(language) ? language : 'ko+en';
    const captionMode = validModes.includes(mode) ? mode : 'full';

    let trendContext: TrendResult | undefined;
    if (trendKeywords) {
      trendContext = {
        summary: '',
        topStyles: trendKeywords.styles || [],
        keywords: trendKeywords.keywords || [],
        hashtags: [],
        avoidList: trendKeywords.avoidList || [],
        performanceFeedback: trendKeywords.performanceFeedback,
      };
    }

    const geminiService = await getGeminiService();
    if (geminiKeyIndex != null) {
      geminiService.setKeyIndex(geminiKeyIndex);
    } else {
      geminiService.resetToFirstKey();
    }
    const result = await geminiService.generateCaptionWithRetry({
      prompt,
      style,
      language: lang,
      trendContext,
      mode: captionMode,
      captionLength: captionLength || undefined,
    });

    return NextResponse.json<ApiResponse<{ caption: string; hashtags: string; totalTokens: number; totalCost: number; geminiKeyUsed: number }>>({
      success: true,
      data: { caption: result.caption, hashtags: result.hashtags, totalTokens: result.usage?.totalTokens ?? 0, totalCost: result.usage?.cost ?? 0, geminiKeyUsed: geminiService.activeKeyIndex + 1 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
