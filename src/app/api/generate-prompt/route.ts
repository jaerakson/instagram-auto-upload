import { NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, TrendResult, PerformanceRecord } from '@/types';

export async function POST() {
  try {
    const geminiService = await getGeminiService();

    // Fetch performance data with graceful fallback
    let performanceData: PerformanceRecord[] = [];
    try {
      performanceData = await sheetsService.getPerformance();
    } catch {
      // Google Sheets not configured — continue without performance data
    }

    const trendResult: TrendResult = await geminiService.analyzeTrends(performanceData);
    const result = await geminiService.generatePrompt(trendResult);

    return NextResponse.json<ApiResponse<{ prompt: string; style: string; trendReport: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
