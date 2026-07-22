import { NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services';
import type { ApiResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const { prompt, aspectRatio, type, quality } = await request.json();
    if (!prompt) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'prompt는 필수입니다.' },
        { status: 400 },
      );
    }
    const geminiService = await getGeminiService();

    if (type === 'reels') {
      const result = await geminiService.generateVideo(prompt, { aspectRatio: aspectRatio || '9:16' });
      return NextResponse.json<ApiResponse<{ videoUrl: string; type: string }>>({
        success: true,
        data: { videoUrl: result.videoUrl, type: 'reels' },
      });
    } else {
      const result = await geminiService.generateImage(prompt, {
        aspectRatio: aspectRatio || '1:1',
        quality: quality || 'standard',
      });
      return NextResponse.json<ApiResponse<{ imageUrl: string; type: string }>>({
        success: true,
        data: { ...result, type: 'image' },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
