import { NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, TrendResult, PerformanceRecord } from '@/types';

export async function POST(request: Request) {
  try {
    let stylePreset = 'photorealistic';
    try {
      const body = await request.json();
      if (body.stylePreset) stylePreset = body.stylePreset;
    } catch {
      // No body or invalid JSON — use default
    }

    const geminiService = await getGeminiService();

    // Fetch performance data with graceful fallback
    let performanceData: PerformanceRecord[] = [];
    try {
      performanceData = await sheetsService.getPerformance();
    } catch {
      // Google Sheets not configured — continue without performance data
    }

    let trendKeywords = '';
    try {
      const settings = await sheetsService.getSettings();
      trendKeywords = settings.trendKeywords || '';
    } catch {
      // Continue without trend keywords
    }

    const trendResult: TrendResult = await geminiService.analyzeTrends(performanceData, trendKeywords);
    const result = await geminiService.generatePrompt(trendResult, stylePreset);

    return NextResponse.json<ApiResponse<{ prompt: string; style: string; trendReport: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
