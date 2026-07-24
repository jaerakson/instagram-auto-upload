import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import type { ApiResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '파일이 필요합니다.' },
        { status: 400 },
      );
    }

    const ext = file.name.split('.').pop() || 'png';
    const filename = `manual-upload/${Date.now()}.${ext}`;
    const blob = await put(filename, file, { access: 'public' });

    return NextResponse.json<ApiResponse<{ url: string }>>({
      success: true,
      data: { url: blob.url },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
