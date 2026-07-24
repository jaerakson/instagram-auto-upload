import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/google-sheets';
import { getInstagramService } from '@/lib/services';
import type { ApiResponse, PerformanceRecord } from '@/types';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const instagramService = await getInstagramService();

    // Get published posts from sheets
    const posts = await sheetsService.getPosts();
    const publishedPosts = posts.filter(
      (p) => p.status === 'published' && p.mediaId,
    );

    if (publishedPosts.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { collected: 0, message: 'No published posts to collect insights for' },
      });
    }

    // Get current followers count
    const currentFollowers = await instagramService.getFollowersCount();

    // Get last recorded followers count for delta calculation
    const existingPerformance = await sheetsService.getPerformance();
    const lastRecord = existingPerformance.length > 0
      ? existingPerformance[existingPerformance.length - 1]
      : null;
    // Derive previous followers from last record: currentFollowers - lastDelta approximation
    // For first collection, delta is 0
    const previousFollowers = lastRecord
      ? currentFollowers - lastRecord.followersDelta
      : currentFollowers;
    const followersDelta = currentFollowers - previousFollowers;

    const today = new Date().toISOString().split('T')[0];
    let collected = 0;
    const errors: string[] = [];

    for (const post of publishedPosts) {
      try {
        const insights = await instagramService.getMediaInsights(post.mediaId);
        const record: PerformanceRecord = {
          mediaId: post.mediaId,
          date: today,
          likes: insights.likes,
          comments: insights.comments,
          saves: insights.saves,
          reach: insights.reach,
          impressions: insights.impressions,
          followersDelta,
        };
        await sheetsService.upsertPerformance(record);
        collected++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${post.mediaId}: ${message}`);
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        collected,
        total: publishedPosts.length,
        currentFollowers,
        followersDelta,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
