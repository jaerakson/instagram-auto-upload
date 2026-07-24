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

    // 중복 게시물 체크: 최근 게시물 중 같은 캡션이 있으면 재업로드 방지
    try {
      const recentMedia = await instagramService.getRecentMedia(5);
      const captionStart = caption.substring(0, 50);
      const alreadyPosted = recentMedia.find(m =>
        m.caption?.startsWith(captionStart),
      );
      if (alreadyPosted) {
        return NextResponse.json<ApiResponse<{ mediaId: string; mediaUrl: string; imageUrl: string; duplicate: boolean }>>({
          success: true,
          data: {
            mediaId: alreadyPosted.id,
            mediaUrl: alreadyPosted.permalink || '',
            imageUrl: alreadyPosted.mediaUrl || '',
            duplicate: true,
          },
        });
      }
    } catch {
      // 중복 체크 실패 시 무시하고 업로드 진행
    }

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
