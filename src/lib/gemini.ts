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

  async analyzeTrends(performanceData?: PerformanceRecord[]): Promise<TrendResult> {
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

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: 'Analyze the current Instagram AI art trends. What styles, aesthetics, and techniques are getting the most engagement right now?' }] }],
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

  async generatePrompt(trendContext?: TrendResult): Promise<{ prompt: string; style: string; trendReport: string }> {
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

    const systemInstruction = `You are an Instagram AI art prompt expert. Generate a single high-quality image generation prompt and style for trending AI art on Instagram.

Rules:
- The prompt must be in English, 30-80 words
- Structure: [subject], [style], [mood/lighting], [background], [quality boosters]
- Include quality boosters: highly detailed, professional, 8k resolution, cinematic lighting, sharp focus
- Avoid: blurry, low quality, watermark, overly perfect plastic skin
- Focus on styles that get high engagement: cinematic portraits, vintage film grain, dreamy aesthetics, editorial fashion
- Add intentional imperfection for authenticity (film grain, light leaks, natural skin texture)
- The style field should be 2-4 comma-separated keywords${trendSection}

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

    // Delete previous images to keep only the latest one
    const { blobs } = await list({ prefix: 'insta-' });
    if (blobs.length > 0) {
      await del(blobs.map((b) => b.url));
    }

    // Upload to Vercel Blob for public URL
    const filename = `insta-${Date.now()}.png`;
    const { url } = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png',
    });

    return { imageUrl: url };
  }
}
