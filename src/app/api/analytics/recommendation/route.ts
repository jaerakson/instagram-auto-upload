import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/google-sheets';
import { getGeminiService } from '@/lib/services';
import type { ApiResponse } from '@/types';

export async function GET() {
  try {
    const [posts, performance] = await Promise.all([
      sheetsService.getPosts(),
      sheetsService.getPerformance(),
    ]);

    const publishedPosts = posts.filter((p) => p.status === 'published' && p.mediaId);

    if (publishedPosts.length === 0 || performance.length === 0) {
      return NextResponse.json<ApiResponse<{ recommendations: string[] }>>({
        success: true,
        data: { recommendations: [] },
      });
    }

    const postsWithPerf = publishedPosts
      .map((post) => {
        const perf = performance.find((p) => p.mediaId === post.mediaId);
        return { post, perf };
      })
      .filter((item) => item.perf != null);

    if (postsWithPerf.length === 0) {
      return NextResponse.json<ApiResponse<{ recommendations: string[] }>>({
        success: true,
        data: { recommendations: [] },
      });
    }

    const geminiService = await getGeminiService();
    const result = await geminiService.generateRecommendation(
      postsWithPerf.map((item) => ({ style: item.post.style, hashtags: item.post.hashtags })),
      postsWithPerf.map((item) => item.perf!),
    );

    return NextResponse.json<ApiResponse<{ recommendations: string[] }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
