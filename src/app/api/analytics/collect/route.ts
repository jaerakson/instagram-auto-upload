import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/google-sheets';
import { getInstagramService } from '@/lib/services';
import type { ApiResponse, PerformanceRecord } from '@/types';

export async function POST() {
  try {
    const instagramService = await getInstagramService();
    const posts = await sheetsService.getPosts();
    const publishedPosts = posts.filter((p) => p.status === 'published' && p.mediaId);

    if (publishedPosts.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { collected: 0 },
      });
    }

    const currentFollowers = await instagramService.getFollowersCount();
    const existingPerformance = await sheetsService.getPerformance();
    const lastRecord = existingPerformance.length > 0
      ? existingPerformance[existingPerformance.length - 1]
      : null;
    const previousFollowers = lastRecord
      ? currentFollowers - lastRecord.followersDelta
      : currentFollowers;
    const followersDelta = currentFollowers - previousFollowers;
    const today = new Date().toISOString().split('T')[0];

    let collected = 0;
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
          followersDelta,
        };
        await sheetsService.upsertPerformance(record);
        collected++;
      } catch {
        // Skip individual failures
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { collected, total: publishedPosts.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
