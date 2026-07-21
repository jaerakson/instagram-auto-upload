import { put, list, del } from '@vercel/blob';
import type { TrendResult, PerformanceRecord } from '@/types';

export class GeminiService {
  private apiKey: string;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }

  private parseGeminiJson<T>(text: string): T {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const sanitized = cleaned.replace(/[\n\r\t]/g, ' ');
    const jsonStart = sanitized.indexOf('{');
    if (jsonStart === -1) {
      throw new Error(`Failed to find JSON in Gemini response: ${sanitized.substring(0, 200)}`);
    }
    const jsonEnd = sanitized.lastIndexOf('}');
    let jsonStr: string;
    if (jsonEnd === -1 || jsonEnd <= jsonStart) {
      // Response was truncated — attempt to repair
      jsonStr = this.repairTruncatedJson(sanitized.substring(jsonStart));
    } else {
      jsonStr = sanitized.substring(jsonStart, jsonEnd + 1);
    }
    return JSON.parse(jsonStr) as T;
  }

  private repairTruncatedJson(truncated: string): string {
    let repaired = truncated;
    // Close any open string value
    const quotes = repaired.match(/(?<!\\)"/g) || [];
    if (quotes.length % 2 !== 0) {
      repaired += '"';
    }
    // Close open braces
    const open = (repaired.match(/\{/g) || []).length;
    const close = (repaired.match(/\}/g) || []).length;
    for (let i = 0; i < open - close; i++) {
      repaired += '}';
    }
    return repaired;
  }

  async analyzeTrends(performanceData?: PerformanceRecord[], trendKeywords?: string, trendPromptOverride?: string): Promise<TrendResult> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

    let performanceSection = '';
    if (performanceData && performanceData.length > 0) {
      const perfSummary = performanceData.map((p) =>
        `mediaId:${p.mediaId} likes:${p.likes} comments:${p.comments} saves:${p.saves} reach:${p.reach} followersDelta:${p.followersDelta}`
      ).join('\n');
      performanceSection = `

Here is the past performance data for our posts. Analyze what worked well and what to avoid:
${perfSummary}

Based on this data, include a "performanceFeedback" field with actionable insights about which styles/approaches performed best and which to avoid.`;
    }

    const systemInstruction = `You are an expert Instagram AI art trend analyst. Analyze current trending AI-generated image styles on Instagram.${performanceSection}

Respond ONLY in this exact JSON format (no markdown, no code blocks):
{"summary": "2-3 sentence overview of current trends", "topStyles": ["style1", "style2", "style3", "style4", "style5"], "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"], "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"], "avoidList": ["avoid1", "avoid2", "avoid3"]${performanceData && performanceData.length > 0 ? ', "performanceFeedback": "actionable feedback based on past performance data"' : ''}}`;

    const defaultQuery = 'Search the web for the current Instagram AI art trends. What styles, aesthetics, and techniques are getting the most engagement right now?';
    const searchQuery = trendKeywords
      ? `Search the web for the latest Instagram trends about: ${trendKeywords}. Then analyze what styles, aesthetics, and techniques are getting the most engagement right now.`
      : (trendPromptOverride || defaultQuery);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: searchQuery }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(error.error?.message || `Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response from Gemini');
    }

    const parsed = this.parseGeminiJson<TrendResult>(text);
    if (!parsed.summary || !parsed.topStyles || !parsed.keywords) {
      throw new Error('Gemini trend response missing required fields');
    }
    return parsed;
  }

  async generatePrompt(
    trendContext?: TrendResult,
    stylePreset?: string,
    stylePromptOverride?: string,
  ): Promise<{ prompt: string; style: string; trendReport: string }> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

    let trendSection = '';
    if (trendContext) {
      trendSection = `

Current trending context to incorporate:
- Top styles: ${trendContext.topStyles.join(', ')}
- Trending keywords: ${trendContext.keywords.join(', ')}
- Popular hashtags: ${trendContext.hashtags.join(', ')}
- Styles/elements to AVOID: ${trendContext.avoidList.join(', ')}${trendContext.performanceFeedback ? `\n- Performance insights: ${trendContext.performanceFeedback}` : ''}

Use these trends to inform the prompt you generate. Lean into the top styles and keywords while avoiding the listed pitfalls.`;
    }

    let styleSection = '';
    const directive = stylePromptOverride || '';
    if (directive) {
      styleSection = `\n\nIMPORTANT STYLE CONSTRAINT: The generated prompt MUST be in this visual style: ${directive}. Every element of the prompt should reflect this aesthetic.`;
    }

    const systemInstruction = `You are an Instagram AI art prompt expert. Generate a single high-quality image generation prompt and style for trending AI art on Instagram.

Rules:
- The prompt must be in English, 30-80 words
- Structure: [subject], [style], [mood/lighting], [background], [quality boosters]
- Include quality boosters: highly detailed, professional, 8k resolution, cinematic lighting, sharp focus
- Avoid: blurry, low quality, watermark, overly perfect plastic skin
- Focus on styles that get high engagement: cinematic portraits, vintage film grain, dreamy aesthetics, editorial fashion
- Add intentional imperfection for authenticity (film grain, light leaks, natural skin texture)
- The style field should be 2-4 comma-separated keywords
- For VIDEO/Reels prompts: Always end the prompt with an audio description — background music genre + ambient sounds + optional short Korean dialogue in quotes. Example: "...with soft lo-fi piano music, gentle rain sounds, she whispers '비가 참 좋다'"${trendSection}${styleSection}

Respond ONLY in this exact JSON format (no markdown, no code blocks):
{"prompt": "your prompt here", "style": "keyword1, keyword2, keyword3"}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: 'Generate a trending Instagram AI art prompt for today. Be creative and pick a unique concept.' }] }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(error.error?.message || `Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response from Gemini');
    }

    const parsed = this.parseGeminiJson<{ prompt: string; style?: string }>(text);
    if (!parsed.prompt) {
      throw new Error('Gemini response missing prompt field');
    }
    return {
      prompt: parsed.prompt,
      style: parsed.style || trendContext?.topStyles?.slice(0, 3).join(', ') || 'cinematic, editorial, dreamy',
      trendReport: trendContext?.summary ?? '',
    };
  }

  async generateImage(
    prompt: string,
    options?: {
      aspectRatio?: string;
      sampleCount?: number;
    },
  ): Promise<{ imageUrl: string }> {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: options?.sampleCount || 1,
          aspectRatio: options?.aspectRatio || '1:1',
        },
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(error.error?.message || `Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) {
      throw new Error(`No image returned from Gemini Imagen 4. Response: ${JSON.stringify(data).substring(0, 500)}`);
    }

    const buffer = Buffer.from(base64Image, 'base64');

    // Upload to Vercel Blob for public URL first
    const filename = `insta-${Date.now()}.png`;
    const { url } = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png',
    });

    // Delete previous images only after new one is safely stored
    const { blobs } = await list({ prefix: 'insta-' });
    const oldBlobs = blobs.filter((b) => b.url !== url);
    if (oldBlobs.length > 0) {
      await del(oldBlobs.map((b) => b.url));
    }

    return { imageUrl: url };
  }

  async generateVideo(
    prompt: string,
    options?: { aspectRatio?: string },
  ): Promise<{ videoUrl: string }> {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': this.apiKey,
    };

    // Veo 3.1 via predictLongRunning (공식 문서 기준)
    const endpoint = `${baseUrl}/models/veo-3.1-generate-preview:predictLongRunning`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          aspectRatio: options?.aspectRatio || '9:16',
          sampleCount: 1,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      const msg = err.error?.message || `${res.status}`;
      throw new Error(`Veo 동영상 생성 요청 실패: ${msg}`);
    }

    const operation = await res.json();
    const operationName = operation.name;

    // 폴링 (최대 5분, 10초 간격)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 10000));
      const statusRes = await fetch(
        `${baseUrl}/${operationName}`,
        { headers: { 'x-goog-api-key': this.apiKey } },
      );
      if (!statusRes.ok) continue;
      const status = await statusRes.json();

      if (status.done) {
        // 응답에서 video URI 추출 (공식 문서: video.uri)
        const samples = status.response?.generateVideoResponse?.generatedSamples;
        const videoUri = samples?.[0]?.video?.uri;
        if (videoUri) {
          // Veo URI는 2일 후 만료 → Vercel Blob에 영구 저장
          // URI에 API 키 인증이 필요할 수 있음
          const downloadUrl = videoUri.includes('?')
            ? `${videoUri}&key=${this.apiKey}`
            : `${videoUri}?key=${this.apiKey}`;
          let videoRes = await fetch(downloadUrl);
          if (!videoRes.ok) {
            // 키 없이 재시도
            videoRes = await fetch(videoUri, {
              headers: { 'x-goog-api-key': this.apiKey },
            });
          }
          if (!videoRes.ok) {
            // 인증 없이 재시도 (공개 URL일 수 있음)
            videoRes = await fetch(videoUri);
          }
          if (!videoRes.ok) throw new Error(`Veo 동영상 다운로드 실패 (${videoRes.status}): ${videoUri.substring(0, 100)}`);
          const buffer = Buffer.from(await videoRes.arrayBuffer());
          const filename = `insta-video-${Date.now()}.mp4`;
          const { url } = await put(filename, buffer, {
            access: 'public',
            contentType: 'video/mp4',
          });

          const { blobs } = await list({ prefix: 'insta-video-' });
          const oldBlobs = blobs.filter((b) => b.url !== url);
          if (oldBlobs.length > 0) {
            await del(oldBlobs.map((b) => b.url));
          }

          return { videoUrl: url };
        }

        // fallback: base64 인코딩 응답
        const videoBase64 = samples?.[0]?.video?.bytesBase64Encoded;
        if (videoBase64) {
          const buffer = Buffer.from(videoBase64, 'base64');
          const filename = `insta-video-${Date.now()}.mp4`;
          const { url } = await put(filename, buffer, {
            access: 'public',
            contentType: 'video/mp4',
          });
          return { videoUrl: url };
        }

        throw new Error(`Veo 응답에 동영상이 없습니다: ${JSON.stringify(status).substring(0, 500)}`);
      }

      if (status.error) {
        throw new Error(`Veo 동영상 생성 실패: ${status.error.message || JSON.stringify(status.error)}`);
      }
    }
    throw new Error('동영상 생성 타임아웃 (5분 초과)');
  }

  async generateCaption(options: {
    prompt: string;
    style: string;
    language: 'ko' | 'en' | 'ko+en' | 'ja' | 'ja+ko';
    trendContext?: TrendResult;
    mode: 'full' | 'caption_only' | 'hashtags_only';
  }): Promise<{ caption: string; hashtags: string }> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

    const languageToneMap: Record<string, string> = {
      ko: `Write the ENTIRE caption in Korean with a sentimental, emotional tone (감성적인 톤).
Hashtags: use Korean hashtags (e.g. #AI아트 #감성사진 #시네마틱 #인공지능아트 #감성피드).`,
      en: `Write the ENTIRE caption in English with an editorial, refined tone.
Hashtags: use English only (e.g. #AIart #cinematicportrait #filmgrain #digitalart #aestheticfeed).`,
      'ko+en': `CRITICAL: The caption MUST contain BOTH Korean AND English text. Structure:
- First 1-2 lines: Korean (감성적 톤)
- Last line: English (natural, not translated)
Example caption format:
"빛이 스며드는 카페의 고요한 순간.\nA quiet cinematic moment, captured in light."
Hashtags: mix Korean and English hashtags (e.g. #AI아트 #cinematicportrait #감성사진 #filmgrain #aestheticfeed).`,
      ja: `Write the ENTIRE caption in Japanese with a polite yet emotional tone (丁寧で感性的なトーン).
Hashtags: mix Japanese and English (e.g. #AI写真 #cinematicportrait #デジタルアート #filmgrain #美的).`,
      'ja+ko': `CRITICAL: The caption MUST contain BOTH Japanese AND Korean text. Structure:
- First 1-2 lines: Japanese (感性的なトーン)
- Last line: Korean (자연스럽게)
Example caption format:
"光が差し込むカフェの静かな瞬間。\n빛 속에 담긴 시네마틱 한 순간."
Hashtags: mix Japanese, Korean and English (e.g. #AI写真 #AI아트 #cinematicportrait #感性写真 #aestheticfeed).`,
    };

    const modeInstruction: Record<string, string> = {
      full: 'Generate both a caption and 20-30 hashtags for maximum reach.',
      caption_only: 'Generate only a caption. Return empty string for hashtags.',
      hashtags_only: 'Generate only 20-30 hashtags for maximum reach. Return empty string for caption.',
    };

    let trendSection = '';
    if (options.trendContext) {
      trendSection = `
Current trending context to weave into the caption naturally:
- Top styles: ${options.trendContext.topStyles.join(', ')}
- Trending keywords: ${options.trendContext.keywords.join(', ')}
- Styles to AVOID: ${options.trendContext.avoidList.join(', ')}${options.trendContext.performanceFeedback ? `\n- Performance insights: ${options.trendContext.performanceFeedback}` : ''}

Incorporate trending keywords naturally into the caption. Do NOT just list them.`;
    }

    const systemInstruction = `You are an expert Instagram caption writer for AI-generated art posts.

${languageToneMap[options.language]}

${modeInstruction[options.mode]}

Rules:
- The caption should complement the image described by the prompt, not describe it literally
- Keep the caption concise (2-4 lines max) and engaging
- Generate 20-30 hashtags for maximum reach. Mix popular high-volume tags with niche specific tags. Include a variety: AI art tags, style-specific tags, mood tags, and trending tags
- Do NOT use generic hashtags like #ai or #photo alone — be specific
- The tone should feel personal and authentic, not like marketing copy${trendSection}

Image prompt: "${options.prompt}"
Image style: "${options.style}"

Respond ONLY in this exact JSON format (no markdown, no code blocks):
{"caption": "your caption here", "hashtags": "#tag1 #tag2 #tag3 ... (20-30 tags)"}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: `Write an Instagram caption for this AI art post. Prompt: "${options.prompt}", Style: "${options.style}"` }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(error.error?.message || `Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response from Gemini');
    }

    const parsed = this.parseGeminiJson<{ caption: string; hashtags: string }>(text);
    if (options.mode === 'full' && (!parsed.caption || !parsed.hashtags)) {
      throw new Error('Gemini caption response missing required fields');
    }
    return {
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || '',
    };
  }

  private validateCaptionLanguage(
    caption: string,
    hashtags: string,
    language: string,
  ): boolean {
    const hasKorean = /[가-힣]/.test(caption);
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(caption);
    const hasEnglish = /[a-zA-Z]{3,}/.test(caption);
    const hashtagHasKorean = /[가-힣]/.test(hashtags);
    const hashtagHasEnglish = /[a-zA-Z]{2,}/.test(hashtags);

    switch (language) {
      case 'ko': return hasKorean;
      case 'en': return hasEnglish && !hasKorean && !hasJapanese;
      case 'ko+en': return hasKorean && hasEnglish && hashtagHasKorean && hashtagHasEnglish;
      case 'ja': return hasJapanese;
      case 'ja+ko': return hasJapanese && hasKorean;
      default: return true;
    }
  }

  async generateRecommendation(
    posts: Array<{ style: string; hashtags: string }>,
    performance: Array<{ mediaId: string; likes: number; comments: number; saves: number; reach: number }>,
  ): Promise<{ recommendations: string[] }> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

    const dataSummary = posts
      .map((post, i) => {
        const perf = performance[i];
        return `Style: ${post.style || 'unknown'}, Hashtags: ${post.hashtags || 'none'}, Likes: ${perf?.likes ?? 0}, Comments: ${perf?.comments ?? 0}, Saves: ${perf?.saves ?? 0}, Reach: ${perf?.reach ?? 0}`;
      })
      .join('\n');

    const systemInstruction = `You are an Instagram AI art performance analyst. Analyze the following post performance data and provide exactly 4 actionable recommendations in JSON format.

Post data:
${dataSummary}

Provide recommendations covering:
1. Most effective style and why
2. Recommended style combination for next post
3. Most efficient hashtags based on engagement
4. Optimal posting strategy

Each recommendation should be specific to the data, citing actual numbers when available.
Keep each recommendation to 1-2 sentences.

Respond ONLY in this exact JSON format (no markdown, no code blocks):
{"recommendations": ["rec1", "rec2", "rec3", "rec4"]}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: 'Analyze this Instagram post performance data and give me 4 actionable recommendations.' }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(error.error?.message || `Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response from Gemini');
    }

    const parsed = this.parseGeminiJson<{ recommendations: string[] }>(text);
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error('Gemini recommendation response missing recommendations array');
    }
    return { recommendations: parsed.recommendations.slice(0, 4) };
  }

  async generateCaptionWithRetry(
    options: Parameters<GeminiService['generateCaption']>[0],
    maxRetries = 5,
  ): Promise<{ caption: string; hashtags: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.generateCaption(options);
      if (this.validateCaptionLanguage(result.caption, result.hashtags, options.language)) {
        return result;
      }
      if (attempt === maxRetries) {
        return result; // Return last attempt even if validation fails
      }
    }
    return this.generateCaption(options); // Fallback
  }
}
