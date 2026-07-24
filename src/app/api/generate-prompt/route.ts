import { NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, PerformanceRecord } from '@/types';
import { DEFAULT_STYLE_PROMPTS, DEFAULT_SUBJECT_PROMPTS, DEFAULT_TREND_PROMPT } from '@/types';
import type { SubjectPreset } from '@/types';

export async function POST(request: Request) {
  try {
    let stylePreset = 'photorealistic';
    let subjectPreset: SubjectPreset = 'woman';
    let subjectCustom = '';
    let stylePromptOverride = '';
    let trendPromptOverride = '';
    let generatePromptOverride = '';
    try {
      const body = await request.json();
      if (body.stylePreset) stylePreset = body.stylePreset;
      if (body.subjectPreset) subjectPreset = body.subjectPreset;
      if (body.subjectCustom) subjectCustom = body.subjectCustom;
      if (body.stylePrompt) stylePromptOverride = body.stylePrompt;
      if (body.trendPrompt) trendPromptOverride = body.trendPrompt;
      if (body.generatePrompt) generatePromptOverride = body.generatePrompt;
    } catch {
      // No body or invalid JSON — use default
    }

    const geminiService = await getGeminiService();
    geminiService.resetToFirstKey();

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
      if (!generatePromptOverride) {
        generatePromptOverride = settings.generatePrompt || '';
      }
    } catch {
      if (!stylePromptOverride) {
        stylePromptOverride = DEFAULT_STYLE_PROMPTS[stylePreset as keyof typeof DEFAULT_STYLE_PROMPTS] || '';
      }
    }

    // 주제 프롬프트를 스타일에 결합
    const subjectPrompt = subjectPreset === 'custom'
      ? subjectCustom
      : DEFAULT_SUBJECT_PROMPTS[subjectPreset] || '';
    const combinedStylePrompt = subjectPrompt
      ? `${stylePromptOverride}. SUBJECT: ${subjectPrompt}`
      : stylePromptOverride;

    const trendResult = await geminiService.analyzeTrends(performanceData, trendKeywords, trendPromptOverride);
    const result = await geminiService.generatePrompt(trendResult, stylePreset, combinedStylePrompt, generatePromptOverride);

    // 트렌드 + 프롬프트 생성 토큰 합산
    const totalTokens = (trendResult.usage?.totalTokens ?? 0) + (result.usage?.totalTokens ?? 0);
    const totalCost = (trendResult.usage?.cost ?? 0) + (result.usage?.cost ?? 0);

    return NextResponse.json<ApiResponse<{ prompt: string; style: string; trendReport: string; totalTokens: number; totalCost: number; geminiKeyUsed: number }>>({
      success: true,
      data: { prompt: result.prompt, style: result.style, trendReport: result.trendReport, totalTokens, totalCost, geminiKeyUsed: geminiService.activeKeyIndex + 1 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
