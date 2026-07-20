import { NextResponse } from 'next/server';
import { getInstagramService } from '@/lib/services';
import { sheetsService } from '@/lib/google-sheets';
import { setCredential, clearCache } from '@/lib/credential-manager';
import type { ApiResponse } from '@/types';

function getKSTHour(): number {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return kst.getHours();
}

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

    // Check autoMode and postTime from settings
    const settings = await sheetsService.getSettings();

    if (!settings.autoMode) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { skipped: true, reason: 'Auto mode is OFF' },
      });
    }

    // Compare current KST hour with postTime setting (e.g. "19:00" → 19)
    const scheduledHour = parseInt(settings.postTime.split(':')[0], 10);
    const currentKSTHour = getKSTHour();

    if (currentKSTHour !== scheduledHour) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          skipped: true,
          reason: `Not scheduled time (current KST: ${currentKSTHour}:00, scheduled: ${settings.postTime})`,
        },
      });
    }

    // Step 1: Refresh Instagram token (extends 60 days from now)
    const tokenResult = await refreshInstagramToken();

    // Step 2: Get caption language setting
    const language = settings.captionLanguage || settings.language || 'en';

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    // Step 3: Collect performance insights (non-blocking)
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
      scheduledTime: settings.postTime,
      executedAtKST: `${currentKSTHour}:00`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
