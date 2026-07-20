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

    // Step 2: Get caption language setting
    let language = 'en';
    try {
      const settings = await import('@/lib/google-sheets').then((m) => m.sheetsService.getSettings());
      language = settings.captionLanguage || settings.language || 'en';
    } catch {
      // Default to English
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    // Step 3: Collect performance insights (non-blocking — failures don't stop pipeline)
    let insightsResult: { collected?: number; error?: string } = {};
    try {
      const insightsRes = await fetch(`${baseUrl}/api/instagram/collect-insights`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      });
      const insightsData = await insightsRes.json();
      insightsResult = insightsData.success
        ? { collected: insightsData.data?.collected ?? 0 }
        : { error: insightsData.error };
    } catch (error) {
      insightsResult = { error: error instanceof Error ? error.message : 'Insights collection failed' };
    }

    // Step 4: Trigger pipeline in auto mode (full AI pipeline)
    const res = await fetch(`${baseUrl}/api/pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        mode: 'auto',
        language,
      }),
    });

    const data = await res.json();
    return NextResponse.json<ApiResponse>({
      ...data,
      tokenRefresh: tokenResult,
      insightsCollection: insightsResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
