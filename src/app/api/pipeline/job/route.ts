import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/google-sheets';
import type { ApiResponse, PostRecord } from '@/types';

// GET: 미완료 작업 조회
export async function GET() {
  try {
    const job = await sheetsService.getPendingJob();
    return NextResponse.json<ApiResponse<PostRecord | null>>({ success: true, data: job });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

// POST: 새 작업 생성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const post: PostRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      prompt: body.prompt || '',
      caption: body.caption || '',
      hashtags: body.hashtags || '',
      imageUrl: body.imageUrl || '',
      mediaId: '',
      mediaUrl: '',
      status: 'pending',
      trendReport: body.trendReport || '',
      style: body.style || '',
      currentStep: body.currentStep ?? 0,
      mediaType: body.mediaType || 'image',
      stylePreset: body.stylePreset || 'photorealistic',
      captionLang: body.captionLang || 'ko+en',
      trendPreset: body.trendPreset || 'portrait',
    };
    await sheetsService.addPost(post);
    return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: { id: post.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

// PUT: 작업 단계 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'id is required' }, { status: 400 });
    }
    await sheetsService.updatePost(id, updates);
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
