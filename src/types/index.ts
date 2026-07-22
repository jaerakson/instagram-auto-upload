// Google Sheets "게시기록" 시트 행
export interface PostRecord {
  id: string;
  date: string;                // ISO 8601
  prompt: string;              // 이미지 생성에 사용된 영문 프롬프트
  caption: string;             // 게시글 전문
  hashtags: string;            // 해시태그 블록
  imageUrl: string;            // Gemini Imagen 3 → Vercel Blob 공개 URL
  mediaId: string;             // Instagram media ID (게시 후)
  mediaUrl: string;            // Instagram 이미지 URL (게시 후)
  status: 'pending' | 'published' | 'failed';
  trendReport: string;         // 트렌드 분석 요약
  style: string;               // 이미지 스타일 키워드
  currentStep?: number;        // 0=created, 1=trend, 2=image, 3=caption, 4=uploaded
  mediaType?: string;          // 'image' | 'reels'
  stylePreset?: string;        // style preset used
  captionLang?: string;        // caption language used
  trendPreset?: string;        // trend preset used
  totalTokens?: number;        // 총 토큰 사용량
  totalCost?: number;          // 총 비용 (USD)
  retryCount?: number;         // 재시도 횟수
  error?: string;              // 실패 사유
}

// Google Sheets "성과" 시트 행
export interface PerformanceRecord {
  mediaId: string;
  date: string;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  followersDelta: number;      // 팔로워 변화량
}

// Google Sheets "설정" 시트
export type CaptionLanguage = 'ko' | 'en' | 'ko+en' | 'ja' | 'ja+ko';
export type MediaType = 'image' | 'reels';
export type StylePreset = 'photorealistic' | 'anime' | 'ghibli' | 'vintage_film' | 'watercolor' | '3d_render' | 'pop_art';
export type TrendPreset = 'portrait' | 'anime' | 'dark_mood' | 'minimal' | 'trend_tracking';

export interface AppSettings {
  autoMode: boolean;
  postTime: string;            // "19:00" 형식
  language: 'ko' | 'en';
  captionLanguage: CaptionLanguage;
  trendPreset: TrendPreset;
  trendKeywords: string;
  trendPrompt: string;         // 트렌드 분석 프롬프트 (시트 커스텀)
  trendKeywordPrompts: Record<string, string>; // 트렌드 프리셋별 키워드
  generatePrompt: string;      // 게시물 생성 프롬프트 (시트 커스텀)
  mediaType: MediaType;
  stylePreset: StylePreset;
  stylePrompts: Record<string, string>; // 스타일별 프롬프트 (시트 커스텀)
  instagramConnected: boolean;
  googleSheetsConnected: boolean;
  geminiConnected: boolean;
}

// 소스 코드 기본값 — 시트에 없으면 이 값 사용
export const DEFAULT_STYLE_PROMPTS: Record<StylePreset, string> = {
  photorealistic: 'cinematic photography, natural lighting, film grain, realistic skin texture, DSLR quality, sharp focus',
  anime: 'anime illustration, cel shading, vibrant colors, detailed linework, anime aesthetic',
  ghibli: 'Studio Ghibli style, watercolor, soft pastoral, whimsical atmosphere, hand-painted feel',
  vintage_film: 'vintage 35mm film photography, light leaks, warm tones, nostalgic grain, faded colors',
  watercolor: 'watercolor painting, soft brushstrokes, bleeding colors, paper texture, artistic',
  '3d_render': '3D render, octane render, volumetric lighting, subsurface scattering, photorealistic CGI',
  pop_art: 'pop art style, bold flat colors, comic aesthetic, graphic design, halftone dots',
};

export const DEFAULT_TREND_KEYWORDS: Record<TrendPreset, string> = {
  portrait: 'AI portrait, natural skin, golden hour, editorial fashion',
  anime: 'anime AI art, Studio Ghibli, watercolor, lofi mood',
  dark_mood: 'film noir, moody shadows, vintage grain, urban night',
  minimal: 'minimal aesthetic, pastel tones, soft light, dreamy bokeh',
  trend_tracking: 'Instagram AI art 2026, trending AI image',
};

export const DEFAULT_TREND_PROMPT = 'Search the web for the current Instagram AI art trends. What styles, aesthetics, and techniques are getting the most engagement right now?';

export const DEFAULT_GENERATE_PROMPT = `You are an Instagram AI art prompt expert. Generate a single high-quality image generation prompt and style for trending AI art on Instagram.

Rules:
- The prompt must be in English, 30-80 words
- Structure: [subject], [style], [mood/lighting], [background], [quality boosters]
- Include quality boosters: highly detailed, professional, 8k resolution, cinematic lighting, sharp focus
- Avoid: blurry, low quality, watermark, overly perfect plastic skin
- Focus on styles that get high engagement: cinematic portraits, vintage film grain, dreamy aesthetics, editorial fashion
- Add intentional imperfection for authenticity (film grain, light leaks, natural skin texture)
- The style field should be 2-4 comma-separated keywords
- For VIDEO/Reels prompts: Always end the prompt with an audio description — background music genre + ambient sounds + optional short Korean dialogue in quotes. Example: "...with soft lo-fi piano music, gentle rain sounds, she whispers '비가 참 좋다'"`;


// 토큰 사용량 + 비용
export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;              // USD
}

// 파이프라인 실행 상태
export interface PipelineStep {
  step: 'trend' | 'image' | 'caption' | 'upload';
  status: 'idle' | 'running' | 'complete' | 'error';
  result?: TrendResult | ImageResult | CaptionResult | UploadResult;
  error?: string;
}

export interface TrendResult {
  summary: string;
  topStyles: string[];
  keywords: string[];
  hashtags: string[];
  avoidList: string[];
  performanceFeedback?: string;
}

export interface ImageResult {
  imageUrl: string;
  prompt: string;
  designIntent: string;
  model: string;
  imageSize: string;
  mediaType?: 'image' | 'reels';
}

export interface CaptionResult {
  caption: string;
  hashtags: string;
  fullText: string;            // caption + hashtags 결합
  strategy: string;
}

export interface UploadResult {
  success: boolean;
  mediaId?: string;
  mediaUrl?: string;
  postedAt?: string;
  error?: string;
}

// 대시보드 요약 데이터
export interface DashboardSummary {
  totalPosts: number;
  totalLikes: number;
  followers: number;
  recentPosts: PostRecord[];
  weeklyEngagement: WeeklyEngagement[];
}

export interface WeeklyEngagement {
  date: string;
  likes: number;
  comments: number;
  saves: number;
}

// 인증정보 관리
export type CredentialKey = 'INSTAGRAM_ACCESS_TOKEN' | 'INSTAGRAM_USER_ID' | 'GEMINI_KEY';

export interface CredentialStatus {
  key: CredentialKey;
  configured: boolean;
  updatedAt?: string;
}

// API 응답 공통 래퍼
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
