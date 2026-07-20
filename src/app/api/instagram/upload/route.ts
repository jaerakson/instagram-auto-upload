import { NextResponse } from 'next/server';
import { getInstagramService } from '@/lib/services';
import type { ApiResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const { imageUrl, caption } = await request.json();
    if (!imageUrl || !caption) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'imageUrl과 caption은 필수입니다.' },
        { status: 400 },
      );
    }
    const instagramService = await getInstagramService();
    const result = await instagramService.uploadPhoto(imageUrl, caption);
    return NextResponse.json<ApiResponse<{ mediaId: string; mediaUrl: string }>>({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
