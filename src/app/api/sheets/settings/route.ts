import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, AppSettings } from '@/types';

export async function GET() {
  try {
    if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Google Sheets 환경변수가 설정되지 않았습니다.' },
        { status: 500 },
      );
    }
    const settings = await sheetsService.getSettings();
    return NextResponse.json<ApiResponse<AppSettings>>({ success: true, data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Google Sheets 환경변수가 설정되지 않았습니다.' },
        { status: 500 },
      );
    }
    const updates: Partial<AppSettings> = await request.json();
    await sheetsService.updateSettings(updates);
    const settings = await sheetsService.getSettings();
    return NextResponse.json<ApiResponse<AppSettings>>({ success: true, data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
