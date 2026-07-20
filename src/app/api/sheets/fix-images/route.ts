import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/google-sheets';
import { getInstagramService } from '@/lib/services';
import type { ApiResponse } from '@/types';

const DELAY_MS = 500;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const posts = await sheetsService.getPosts();
    const instagramService = await getInstagramService();
    let fixed = 0;
    const errors: string[] = [];

    for (const post of posts) {
      // Skip posts without mediaId or that already have a working (non-Blob) image URL
      if (
        !post.mediaId ||
        (post.imageUrl && !post.imageUrl.includes('blob.vercel-storage.com'))
      ) {
        continue;
      }

      try {
        const mediaUrl = await instagramService.getMediaUrl(post.mediaId);
        if (mediaUrl) {
          await sheetsService.updatePost(post.id, { imageUrl: mediaUrl });
          fixed++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${post.id}: ${message}`);
      }

      // Rate limit delay between API calls
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { fixed, errors: errors.length > 0 ? errors : undefined },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
