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
      const msg = error.error?.message || `Instagram API error: ${res.status}`;
      const err = new Error(msg) as Error & { statusCode?: number };
      err.statusCode = res.status;
      throw err;
    }
    return res.json() as Promise<T>;
  }

  private isNonRetryableError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    if (msg.includes('request limit reached') || msg.includes('rate limit') || msg.includes('too many')) {
      return true; // Rate limit — 재시도 무의미
    }
    if (msg.includes('permission') || msg.includes('invalid oauth') || msg.includes('expired')) {
      return true; // 인증 문제
    }
    return false;
  }

  private formatError(error: Error): string {
    const msg = error.message.toLowerCase();
    if (msg.includes('request limit reached') || msg.includes('rate limit') || msg.includes('too many')) {
      return `Instagram API 요청 제한에 걸렸습니다. 잠시 후 (약 5~10분) 다시 시도해주세요. (${error.message})`;
    }
    return error.message;
  }

  private getRetryDelay(attempt: number): number {
    // 5초 기본 + 지수 백오프 (5s, 10s, 15s, 20s, 25s...)
    return 5000 * attempt;
  }

  async uploadPhoto(imageUrl: string, caption: string, maxRetries = 10): Promise<{ mediaId: string; mediaUrl: string; imageUrl: string }> {
    // Phase 1: Container 생성 (한 번만, 실패 시 재시도)
    let containerId: string | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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
        containerId = container.id;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Instagram] container 생성 attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        if (this.isNonRetryableError(lastError)) break;
        if (attempt < maxRetries) {
          const delay = this.getRetryDelay(attempt);
          console.log(`[Instagram] ${delay / 1000}초 후 재시도...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!containerId) {
      throw new Error(`Container 생성 실패: ${this.formatError(lastError!)}`);
    }

    // Phase 2: Publish (같은 containerId 재사용, 멱등성 보장)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const published = await this.request<{ id: string }>(
          `${this.baseUrl}/${this.userId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: containerId,
              access_token: this.accessToken,
            }),
          },
        );

        // Step 3: Fetch permalink and media_url (non-critical)
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
        console.error(`[Instagram] publish attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        if (this.isNonRetryableError(lastError)) break;
        if (attempt < maxRetries) {
          const delay = this.getRetryDelay(attempt);
          console.log(`[Instagram] ${delay / 1000}초 후 재시도...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`업로드 실패: ${this.formatError(lastError!)}`);
  }

  async uploadReels(videoUrl: string, caption: string, maxRetries = 10): Promise<{ mediaId: string; mediaUrl: string; imageUrl: string }> {
    // Phase 1: Container 생성 + Processing 대기
    let containerId: string | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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
        containerId = container.id;

        // Poll for processing completion (max 3 minutes)
        let processingDone = false;
        for (let i = 0; i < 36; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const status = await this.request<{ status_code: string; status?: string }>(
            `${this.baseUrl}/${containerId}?fields=status_code,status&access_token=${this.accessToken}`
          );
          console.log(`[Instagram] Reels processing poll ${i + 1}/36: status_code=${status.status_code}, status=${status.status || ''}`);
          if (status.status_code === 'FINISHED') {
            processingDone = true;
            break;
          }
          if (status.status_code === 'ERROR') {
            throw new Error(`Reels 처리 실패 (Instagram): ${status.status || 'unknown error'}. video_url=${videoUrl.substring(0, 80)}`);
          }
        }
        if (!processingDone) {
          throw new Error('Reels 처리 타임아웃 (3분 초과)');
        }
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Instagram] reels container attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        containerId = null;
        if (this.isNonRetryableError(lastError)) break;
        if (attempt < maxRetries) {
          const delay = this.getRetryDelay(attempt);
          console.log(`[Instagram] ${delay / 1000}초 후 재시도...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!containerId) {
      throw new Error(`Reels container 생성 실패: ${this.formatError(lastError!)}`);
    }

    // Phase 2: Publish (같은 containerId 재사용)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const published = await this.request<{ id: string }>(
          `${this.baseUrl}/${this.userId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: containerId,
              access_token: this.accessToken,
            }),
          },
        );

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
        console.error(`[Instagram] reels publish attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        if (this.isNonRetryableError(lastError)) break;
        if (attempt < maxRetries) {
          const delay = this.getRetryDelay(attempt);
          console.log(`[Instagram] ${delay / 1000}초 후 재시도...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Reels 업로드 실패: ${this.formatError(lastError!)}`);
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
    impressions: number;
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

    // views metric (v25.0+에서 impressions 대체)
    let impressions = 0;
    try {
      const viewsRes = await this.request<{
        data: Array<{ name: string; values: Array<{ value: number }> }>;
      }>(
        `${this.baseUrl}/${mediaId}/insights?metric=views&access_token=${this.accessToken}`,
      );
      impressions = viewsRes.data[0]?.values[0]?.value ?? 0;
    } catch (e) {
      console.error(`[Instagram] views metric failed for ${mediaId}:`, e instanceof Error ? e.message : e);
    }

    return {
      likes: metrics['likes'] ?? 0,
      comments: metrics['comments'] ?? 0,
      saves: metrics['saved'] ?? 0,
      reach: metrics['reach'] ?? 0,
      impressions,
    };
  }

  async getRecentMedia(limit = 10): Promise<
    Array<{
      id: string;
      mediaUrl: string;
      permalink: string;
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
        permalink: string;
        caption: string;
        timestamp: string;
        like_count: number;
        comments_count: number;
      }>;
    }>(
      `${this.baseUrl}/${this.userId}/media?fields=id,media_url,permalink,caption,timestamp,like_count,comments_count&limit=${limit}&access_token=${this.accessToken}`,
    );

    return res.data.map((item) => ({
      id: item.id,
      mediaUrl: item.media_url,
      permalink: item.permalink || '',
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
