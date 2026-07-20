import { NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services';
import type { ApiResponse } from '@/types';

export async function POST() {
  try {
    const geminiService = await getGeminiService();
    const result = await geminiService.generatePrompt();
    return NextResponse.json<ApiResponse<{ prompt: string; style: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
