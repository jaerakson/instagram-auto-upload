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

export interface AppSettings {
  autoMode: boolean;
  postTime: string;            // "19:00" 형식
  language: 'ko' | 'en';
  captionLanguage: CaptionLanguage;
  trendKeywords: string;
  trendPrompt: string;         // 트렌드 분석 프롬프트 (시트 커스텀)
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

export const DEFAULT_TREND_PROMPT = 'Search the web for the current Instagram AI art trends. What styles, aesthetics, and techniques are getting the most engagement right now?';

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
