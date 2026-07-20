import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, PerformanceRecord } from '@/types';

export async function GET() {
  try {
    if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Google Sheets 환경변수가 설정되지 않았습니다.' },
        { status: 500 },
      );
    }
    const performance = await sheetsService.getPerformance();
    return NextResponse.json<ApiResponse<PerformanceRecord[]>>({ success: true, data: performance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
