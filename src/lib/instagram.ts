export class InstagramService {
  private accessToken: string;
  private userId: string;
  private baseUrl = 'https://graph.facebook.com/v21.0';

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

  async uploadPhoto(imageUrl: string, caption: string): Promise<{ mediaId: string }> {
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

    return { mediaId: published.id };
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
}
