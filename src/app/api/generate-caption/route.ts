import { NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services';
import type { ApiResponse, TrendResult } from '@/types';

export async function POST(request: Request) {
  try {
    const { prompt, style, language, trendKeywords, mode } = await request.json();

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
    const result = await geminiService.generateCaption({
      prompt,
      style,
      language: lang,
      trendContext,
      mode: captionMode,
    });

    return NextResponse.json<ApiResponse<{ caption: string; hashtags: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
