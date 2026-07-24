import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/google-sheets';
import { getInstagramService } from '@/lib/services';
import type { ApiResponse } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 10;
    const instagramService = await getInstagramService();
    const media = await instagramService.getRecentMedia(limit);
    return NextResponse.json<ApiResponse<typeof media>>({ success: true, data: media });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

// 개별 게시물 이미지 URL 갱신
export async function POST(request: Request) {
  try {
    const { postId, mediaId } = await request.json();
    if (!postId || !mediaId) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'postId, mediaId 필수' }, { status: 400 });
    }
    const instagramService = await getInstagramService();
    const mediaUrl = await instagramService.getMediaUrl(mediaId);
    if (mediaUrl) {
      await sheetsService.updatePost(postId, { imageUrl: mediaUrl });
    }
    return NextResponse.json<ApiResponse<{ imageUrl: string }>>({
      success: true,
      data: { imageUrl: mediaUrl },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
