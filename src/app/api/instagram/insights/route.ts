import { NextResponse } from 'next/server';
import { getInstagramService } from '@/lib/services';
import type { ApiResponse } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');
    if (!mediaId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'mediaId 파라미터가 필요합니다.' },
        { status: 400 },
      );
    }
    const instagramService = await getInstagramService();
    const insights = await instagramService.getMediaInsights(mediaId);
    return NextResponse.json<ApiResponse<typeof insights>>({ success: true, data: insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
