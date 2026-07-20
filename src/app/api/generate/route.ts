import { NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services';
import type { ApiResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const { prompt, aspectRatio } = await request.json();
    if (!prompt) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'prompt는 필수입니다.' },
        { status: 400 },
      );
    }
    const geminiService = await getGeminiService();
    const result = await geminiService.generateImage(prompt, {
      aspectRatio: aspectRatio || '1:1',
    });
    return NextResponse.json<ApiResponse<{ imageUrl: string }>>({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
