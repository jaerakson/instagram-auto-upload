import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, PostRecord } from '@/types';

export async function GET() {
  try {
    if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Google Sheets 환경변수가 설정되지 않았습니다.' },
        { status: 500 },
      );
    }
    const posts = await sheetsService.getPosts();
    return NextResponse.json<ApiResponse<PostRecord[]>>({ success: true, data: posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Google Sheets 환경변수가 설정되지 않았습니다.' },
        { status: 500 },
      );
    }
    const post: PostRecord = await request.json();
    await sheetsService.addPost(post);
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Google Sheets 환경변수가 설정되지 않았습니다.' },
        { status: 500 },
      );
    }
    const { id, imageUrl } = await request.json();
    if (!id) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'id is required' }, { status: 400 });
    }
    await sheetsService.deletePost(id);
    // Delete blob if imageUrl is a Vercel Blob URL
    if (imageUrl && imageUrl.includes('blob.vercel-storage.com')) {
      try {
        await del(imageUrl);
      } catch {
        // Blob deletion failure is non-critical
      }
    }
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
