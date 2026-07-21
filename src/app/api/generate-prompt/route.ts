import { NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, TrendResult, PerformanceRecord } from '@/types';
import { DEFAULT_STYLE_PROMPTS, DEFAULT_TREND_PROMPT } from '@/types';

export async function POST(request: Request) {
  try {
    let stylePreset = 'photorealistic';
    let stylePromptOverride = '';
    let trendPromptOverride = '';
    try {
      const body = await request.json();
      if (body.stylePreset) stylePreset = body.stylePreset;
      if (body.stylePrompt) stylePromptOverride = body.stylePrompt;
      if (body.trendPrompt) trendPromptOverride = body.trendPrompt;
    } catch {
      // No body or invalid JSON — use default
    }

    const geminiService = await getGeminiService();

    let performanceData: PerformanceRecord[] = [];
    try {
      performanceData = await sheetsService.getPerformance();
    } catch {
      // Continue without performance data
    }

    let trendKeywords = '';
    try {
      const settings = await sheetsService.getSettings();
      trendKeywords = settings.trendKeywords || '';
      // 시트 값이 있으면 사용, body에서 온 값이 우선
      if (!stylePromptOverride) {
        stylePromptOverride = settings.stylePrompts?.[stylePreset] || DEFAULT_STYLE_PROMPTS[stylePreset as keyof typeof DEFAULT_STYLE_PROMPTS] || '';
      }
      if (!trendPromptOverride) {
        trendPromptOverride = settings.trendPrompt || DEFAULT_TREND_PROMPT;
      }
    } catch {
      if (!stylePromptOverride) {
        stylePromptOverride = DEFAULT_STYLE_PROMPTS[stylePreset as keyof typeof DEFAULT_STYLE_PROMPTS] || '';
      }
    }

    const trendResult: TrendResult = await geminiService.analyzeTrends(performanceData, trendKeywords, trendPromptOverride);
    const result = await geminiService.generatePrompt(trendResult, stylePreset, stylePromptOverride);

    return NextResponse.json<ApiResponse<{ prompt: string; style: string; trendReport: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
