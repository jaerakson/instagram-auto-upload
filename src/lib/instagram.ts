export class InstagramService {
  private accessToken: string;
  private userId: string;
  private baseUrl = 'https://graph.instagram.com/v25.0';

  constructor(config: { accessToken: string; userId: string }) {
    this.accessToken = config.accessToken;
    this.userId = config.userId;
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(error.error?.message || `Instagram API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async uploadPhoto(imageUrl: string, caption: string, maxRetries = 10): Promise<{ mediaId: string; mediaUrl: string; imageUrl: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Step 1: Create media container
        const container = await this.request<{ id: string }>(
          `${this.baseUrl}/${this.userId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: imageUrl,
              caption,
              access_token: this.accessToken,
            }),
          },
        );

        // Step 2: Publish media
        const published = await this.request<{ id: string }>(
          `${this.baseUrl}/${this.userId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: container.id,
              access_token: this.accessToken,
            }),
          },
        );

        // Step 3: Fetch permalink and media_url (actual image URL)
        let mediaUrl = '';
        let instagramImageUrl = '';
        try {
          const mediaInfo = await this.request<{ permalink?: string; media_url?: string }>(
            `${this.baseUrl}/${published.id}?fields=permalink,media_url&access_token=${this.accessToken}`,
          );
          mediaUrl = mediaInfo.permalink || '';
          instagramImageUrl = mediaInfo.media_url || '';
        } catch {
          // Non-critical: continue without permalink/media_url
        }

        return { mediaId: published.id, mediaUrl, imageUrl: instagramImageUrl };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Instagram] uploadPhoto attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    console.error(`[Instagram] uploadPhoto failed after ${maxRetries} attempts. Last error:`, lastError?.message);
    throw new Error(`업로드 ${maxRetries}회 실패: ${lastError?.message}`);
  }

  async uploadReels(videoUrl: string, caption: string, maxRetries = 10): Promise<{ mediaId: string; mediaUrl: string; imageUrl: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Step 1: Create REELS container
        const container = await this.request<{ id: string }>(
          `${this.baseUrl}/${this.userId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'REELS',
              video_url: videoUrl,
              caption,
              access_token: this.accessToken,
            }),
          },
        );

        // Step 2: Poll for processing completion (max 2 minutes)
        for (let i = 0; i < 24; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const status = await this.request<{ status_code: string }>(
            `${this.baseUrl}/${container.id}?fields=status_code&access_token=${this.accessToken}`
          );
          if (status.status_code === 'FINISHED') break;
          if (status.status_code === 'ERROR') throw new Error('Reels video processing failed');
        }

        // Step 3: Publish
        const published = await this.request<{ id: string }>(
          `${this.baseUrl}/${this.userId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: container.id,
              access_token: this.accessToken,
            }),
          },
        );

        // Step 4: Fetch permalink and media_url
        let mediaUrl = '';
        let instagramImageUrl = '';
        try {
          const mediaInfo = await this.request<{ permalink?: string; media_url?: string }>(
            `${this.baseUrl}/${published.id}?fields=permalink,media_url&access_token=${this.accessToken}`,
          );
          mediaUrl = mediaInfo.permalink || '';
          instagramImageUrl = mediaInfo.media_url || '';
        } catch {
          // Non-critical
        }

        return { mediaId: published.id, mediaUrl, imageUrl: instagramImageUrl };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Instagram] uploadReels attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    console.error(`[Instagram] uploadReels failed after ${maxRetries} attempts. Last error:`, lastError?.message);
    throw new Error(`Reels 업로드 ${maxRetries}회 실패: ${lastError?.message}`);
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    const res = await this.request<{ media_url?: string }>(
      `${this.baseUrl}/${mediaId}?fields=media_url&access_token=${this.accessToken}`,
    );
    return res.media_url || '';
  }

  async getMediaInsights(mediaId: string): Promise<{
    likes: number;
    comments: number;
    saves: number;
    reach: number;
  }> {
    const res = await this.request<{
      data: Array<{ name: string; values: Array<{ value: number }> }>;
    }>(
      `${this.baseUrl}/${mediaId}/insights?metric=likes,comments,saved,reach&access_token=${this.accessToken}`,
    );

    const metrics: Record<string, number> = {};
    for (const item of res.data) {
      metrics[item.name] = item.values[0]?.value ?? 0;
    }

    return {
      likes: metrics['likes'] ?? 0,
      comments: metrics['comments'] ?? 0,
      saves: metrics['saved'] ?? 0,
      reach: metrics['reach'] ?? 0,
    };
  }

  async getRecentMedia(limit = 10): Promise<
    Array<{
      id: string;
      mediaUrl: string;
      caption: string;
      timestamp: string;
      likeCount: number;
      commentsCount: number;
    }>
  > {
    const res = await this.request<{
      data: Array<{
        id: string;
        media_url: string;
        caption: string;
        timestamp: string;
        like_count: number;
        comments_count: number;
      }>;
    }>(
      `${this.baseUrl}/${this.userId}/media?fields=id,media_url,caption,timestamp,like_count,comments_count&limit=${limit}&access_token=${this.accessToken}`,
    );

    return res.data.map((item) => ({
      id: item.id,
      mediaUrl: item.media_url,
      caption: item.caption || '',
      timestamp: item.timestamp,
      likeCount: item.like_count ?? 0,
      commentsCount: item.comments_count ?? 0,
    }));
  }

  async getFollowersCount(): Promise<number> {
    const res = await this.request<{ followers_count: number }>(
      `${this.baseUrl}/${this.userId}?fields=followers_count&access_token=${this.accessToken}`,
    );
    return res.followers_count;
  }

  async refreshToken(): Promise<{ accessToken: string; expiresIn: number }> {
    const res = await this.request<{ access_token: string; expires_in: number }>(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${this.accessToken}`,
    );
    this.accessToken = res.access_token;
    return { accessToken: res.access_token, expiresIn: res.expires_in };
  }
}
