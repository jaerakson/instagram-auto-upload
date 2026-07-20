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

export interface AppSettings {
  autoMode: boolean;
  postTime: string;            // "19:00" 형식
  language: 'ko' | 'en';
  captionLanguage: CaptionLanguage;
  instagramConnected: boolean;
  googleSheetsConnected: boolean;
  geminiConnected: boolean;
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
