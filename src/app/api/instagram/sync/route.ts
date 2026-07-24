import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/google-sheets';
import { getInstagramService } from '@/lib/services';
import type { ApiResponse, PostRecord, PerformanceRecord } from '@/types';

const INSIGHTS_BATCH_SIZE = 25; // rate limit 방지: 한 번에 최대 25개 insights 조회

export async function POST() {
  try {
    const instagramService = await getInstagramService();
    const posts = await sheetsService.getPosts();
    const publishedPosts = posts.filter(p => p.status === 'published' && p.mediaId);
    const allMediaIds = new Set(posts.map(p => p.mediaId).filter(Boolean));

    const recentMedia = await instagramService.getRecentMedia(50);

    let imageFixed = 0;
    let markedDeleted = 0;
    let imported = 0;
    let perfSynced = 0;
    const errors: string[] = [];

    // 1. 기존 게시물 동기화 — 이미지 URL 갱신 + 삭제 감지
    const batchUpdates: Array<{ id: string; updates: Partial<PostRecord> }> = [];

    for (const post of publishedPosts) {
      const media = recentMedia.find(m => m.id === post.mediaId);
      if (media) {
        const updates: Partial<PostRecord> = {};
        const isBlobUrl = post.imageUrl?.includes('blob.vercel-storage.com');
        if (media.mediaUrl && !isBlobUrl) {
          updates.imageUrl = media.mediaUrl;
        }
        if (media.permalink && !post.mediaUrl) {
          updates.mediaUrl = media.permalink;
        }
        if (Object.keys(updates).length > 0) {
          batchUpdates.push({ id: post.id, updates });
          if (updates.imageUrl) imageFixed++;
        }
      } else {
        if (!post.error?.includes('인스타그램에서 삭제')) {
          batchUpdates.push({
            id: post.id,
            updates: { status: 'failed', error: '인스타그램에서 삭제된 게시물' },
          });
          markedDeleted++;
        }
      }
    }

    if (batchUpdates.length > 0) {
      const result = await sheetsService.batchUpdatePosts(batchUpdates);
      errors.push(...result.errors);
    }

    // 2. 인스타에만 있는 게시물 import
    for (const media of recentMedia) {
      if (allMediaIds.has(media.id)) continue;
      try {
        await sheetsService.addPost({
          id: crypto.randomUUID(),
          date: media.timestamp || new Date().toISOString(),
          prompt: '',
          caption: media.caption || '',
          hashtags: '',
          imageUrl: media.mediaUrl || '',
          mediaId: media.id,
          mediaUrl: media.permalink || '',
          status: 'published',
          trendReport: '',
          style: '',
        });
        imported++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`import ${media.id}: ${message}`);
      }
    }

    // 3. 성과 데이터 동기화
    // getRecentMedia에서 likes/comments 바로 사용 + insights(reach/saves)는 10개씩
    const existingPerf = await sheetsService.getPerformance();
    const perfMap = new Map(existingPerf.map(p => [p.mediaId, p]));
    const perfRecords: PerformanceRecord[] = [];

    // 기본 데이터: getRecentMedia의 likes/comments (추가 API 호출 없음)
    for (const media of recentMedia) {
      const existing = perfMap.get(media.id);
      perfRecords.push({
        mediaId: media.id,
        date: new Date().toISOString().slice(0, 10),
        likes: media.likeCount,
        comments: media.commentsCount,
        saves: existing?.saves ?? 0,
        reach: existing?.reach ?? 0,
        impressions: existing?.impressions ?? 0,
        followersDelta: existing?.followersDelta ?? 0,
      });
    }

    // reach/saves: 아직 데이터 없는 게시물 우선, 최대 INSIGHTS_BATCH_SIZE개만
    const needInsights = recentMedia
      .filter(m => {
        const p = perfMap.get(m.id);
        return !p || p.reach === 0 || p.impressions === 0;
      })
      .slice(0, INSIGHTS_BATCH_SIZE);

    for (const media of needInsights) {
      try {
        const insights = await instagramService.getMediaInsights(media.id);
        const record = perfRecords.find(r => r.mediaId === media.id);
        if (record) {
          record.saves = insights.saves;
          record.reach = insights.reach;
          record.impressions = insights.impressions;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`insights ${media.id}: ${msg}`);
      }
    }

    // 배치로 성과 데이터 저장
    if (perfRecords.length > 0) {
      const result = await sheetsService.batchUpsertPerformance(perfRecords);
      perfSynced = result.success;
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        total: publishedPosts.length,
        imageFixed,
        markedDeleted,
        imported,
        perfSynced,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
