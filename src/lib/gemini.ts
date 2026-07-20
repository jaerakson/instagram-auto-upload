import { put, list, del } from '@vercel/blob';

export class GeminiService {
  private apiKey: string;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }

  async generatePrompt(): Promise<{ prompt: string; style: string }> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

    const systemInstruction = `You are an Instagram AI art prompt expert. Generate a single high-quality image generation prompt and style for trending AI art on Instagram.

Rules:
- The prompt must be in English, 30-80 words
- Structure: [subject], [style], [mood/lighting], [background], [quality boosters]
- Include quality boosters: highly detailed, professional, 8k resolution, cinematic lighting, sharp focus
- Avoid: blurry, low quality, watermark, overly perfect plastic skin
- Focus on styles that get high engagement: cinematic portraits, vintage film grain, dreamy aesthetics, editorial fashion
- Add intentional imperfection for authenticity (film grain, light leaks, natural skin texture)
- The style field should be 2-4 comma-separated keywords

Respond ONLY in this exact JSON format (no markdown, no code blocks):
{"prompt": "your prompt here", "style": "keyword1, keyword2, keyword3"}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: 'Generate a trending Instagram AI art prompt for today. Be creative and pick a unique concept.' }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 300 },
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

    // Remove markdown code blocks and extract JSON object
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    // Extract the JSON object between first { and last }
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`Failed to find JSON in Gemini response: ${cleaned}`);
    }
    const jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
    // Replace unescaped newlines/tabs inside the JSON string
    const sanitized = jsonStr.replace(/[\n\r\t]/g, ' ');
    const parsed = JSON.parse(sanitized);
    return { prompt: parsed.prompt, style: parsed.style };
  }

  async generateImage(
    prompt: string,
    options?: {
      aspectRatio?: string;
      sampleCount?: number;
    },
  ): Promise<{ imageUrl: string }> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      throw new Error('No image returned from Gemini Imagen 3');
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
