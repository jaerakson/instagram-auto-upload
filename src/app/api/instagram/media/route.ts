import { NextResponse } from 'next/server';
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
