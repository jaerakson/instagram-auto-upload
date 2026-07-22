import { NextResponse } from 'next/server';
import { driveService } from '@/lib/google-drive';
import type { ApiResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const { fileUrl, filename, folderId } = await request.json();
    if (!fileUrl || !filename || !folderId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'fileUrl, filename, folderId are required' },
        { status: 400 },
      );
    }
    const result = await driveService.uploadFile(fileUrl, filename, folderId);
    return NextResponse.json<ApiResponse<{ fileId: string; webViewLink: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
