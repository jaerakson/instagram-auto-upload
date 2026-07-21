import { NextResponse } from 'next/server';
import { getInstagramService } from '@/lib/services';
import type { ApiResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const { imageUrl, videoUrl, caption, mediaType } = await request.json();
    if (!caption || (!imageUrl && !videoUrl)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'caption과 imageUrl 또는 videoUrl은 필수입니다.' },
        { status: 400 },
      );
    }
    const instagramService = await getInstagramService();

    if (mediaType === 'reels' && videoUrl) {
      const result = await instagramService.uploadReels(videoUrl, caption);
      return NextResponse.json<ApiResponse<{ mediaId: string; mediaUrl: string; imageUrl: string }>>({ success: true, data: result });
    } else {
      const result = await instagramService.uploadPhoto(imageUrl, caption);
      return NextResponse.json<ApiResponse<{ mediaId: string; mediaUrl: string; imageUrl: string }>>({ success: true, data: result });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
