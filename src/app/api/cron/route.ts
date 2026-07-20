import { NextResponse } from 'next/server';
import { getInstagramService } from '@/lib/services';
import { setCredential, clearCache } from '@/lib/credential-manager';
import type { ApiResponse } from '@/types';

async function refreshInstagramToken(): Promise<{ refreshed: boolean; expiresIn?: number }> {
  try {
    const instagramService = await getInstagramService();
    const { accessToken, expiresIn } = await instagramService.refreshToken();
    await setCredential('INSTAGRAM_ACCESS_TOKEN', accessToken);
    clearCache();
    return { refreshed: true, expiresIn };
  } catch (error) {
    console.error('Instagram token refresh failed:', error);
    return { refreshed: false };
  }
}

export async function GET(request: Request) {
  try {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Step 1: Refresh Instagram token (extends 60 days from now)
    const tokenResult = await refreshInstagramToken();

    // Step 2: Get language setting
    let language = 'en';
    try {
      const settings = await import('@/lib/google-sheets').then((m) => m.sheetsService.getSettings());
      language = settings.language || 'en';
    } catch {
      // Default to English
    }

    // Step 3: Trigger pipeline in auto mode (full AI pipeline)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'auto',
        language,
      }),
    });

    const data = await res.json();
    return NextResponse.json<ApiResponse>({
      ...data,
      tokenRefresh: tokenResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
