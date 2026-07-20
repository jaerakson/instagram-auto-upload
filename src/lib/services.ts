import { getCredential } from './credential-manager';
import { InstagramService } from './instagram';
import { GeminiService } from './gemini';

let cachedInstagram: { service: InstagramService; expiresAt: number } | null = null;
let cachedGemini: { service: GeminiService; expiresAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export async function getInstagramService(): Promise<InstagramService> {
  if (cachedInstagram && cachedInstagram.expiresAt > Date.now()) {
    return cachedInstagram.service;
  }
  const accessToken = await getCredential('INSTAGRAM_ACCESS_TOKEN');
  const userId = await getCredential('INSTAGRAM_USER_ID');
  if (!accessToken || !userId) {
    throw new Error('Instagram 인증정보가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.');
  }
  const service = new InstagramService({ accessToken, userId });
  cachedInstagram = { service, expiresAt: Date.now() + CACHE_TTL };
  return service;
}

export async function getGeminiService(): Promise<GeminiService> {
  if (cachedGemini && cachedGemini.expiresAt > Date.now()) {
    return cachedGemini.service;
  }
  const apiKey = await getCredential('GEMINI_KEY');
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.');
  }
  const service = new GeminiService({ apiKey });
  cachedGemini = { service, expiresAt: Date.now() + CACHE_TTL };
  return service;
}
