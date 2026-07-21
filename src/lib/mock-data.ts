import type {
  PostRecord,
  PerformanceRecord,
  DashboardSummary,
  WeeklyEngagement,
  AppSettings,
} from '@/types';

export const mockPosts: PostRecord[] = [
  {
    id: '1',
    date: '2026-07-18T19:00:00Z',
    prompt: 'cyberpunk female portrait, neon city, cinematic lighting, 8k',
    caption: 'Neon lights paint the future in vivid color',
    hashtags: '#AIart #cyberpunk #portrait #digitalart #neon',
    imageUrl: 'https://placehold.co/400x400/1a1a2e/e94560?text=Cyberpunk',
    mediaId: 'mock-media-1',
    mediaUrl: '',
    status: 'published',
    trendReport: 'Cyberpunk + portrait combination trending strongly',
    style: 'cyberpunk',
  },
  {
    id: '2',
    date: '2026-07-17T19:00:00Z',
    prompt: 'dreamy watercolor landscape, soft pastels, ethereal atmosphere, trending on artstation',
    caption: 'Where dreams dissolve into watercolor skies',
    hashtags: '#AIart #watercolor #dreamy #landscape #pastel',
    imageUrl: 'https://placehold.co/400x400/2d1b69/b8a9c9?text=Watercolor',
    mediaId: 'mock-media-2',
    mediaUrl: '',
    status: 'published',
    trendReport: 'Watercolor aesthetic gaining popularity',
    style: 'watercolor',
  },
  {
    id: '3',
    date: '2026-07-16T19:00:00Z',
    prompt: 'minimal geometric abstract, black and gold, luxury aesthetic, clean lines',
    caption: 'Geometry meets gold in silent luxury',
    hashtags: '#AIart #minimal #geometric #luxury #abstract',
    imageUrl: 'https://placehold.co/400x400/0a0a0a/d4af37?text=Geometric',
    mediaId: 'mock-media-3',
    mediaUrl: '',
    status: 'published',
    trendReport: 'Minimal luxury aesthetics consistently perform well',
    style: 'minimal',
  },
  {
    id: '4',
    date: '2026-07-15T19:00:00Z',
    prompt: 'surreal floating islands, fantasy world, volumetric clouds, magical lighting',
    caption: 'Islands adrift in an endless sky of wonder',
    hashtags: '#AIart #surreal #fantasy #floatingislands #magical',
    imageUrl: 'https://placehold.co/400x400/1a3a4a/7ec8e3?text=Surreal',
    mediaId: 'mock-media-4',
    mediaUrl: '',
    status: 'published',
    trendReport: 'Surreal fantasy scenes gaining traction',
    style: 'surreal',
  },
  {
    id: '5',
    date: '2026-07-14T19:00:00Z',
    prompt: 'anime style portrait, cherry blossom, soft pink palette, studio ghibli inspired',
    caption: 'Cherry blossoms whisper in the gentle breeze',
    hashtags: '#AIart #anime #cherryblossom #ghibli #digital',
    imageUrl: 'https://placehold.co/400x400/3d0f2f/ff69b4?text=Anime',
    mediaId: 'mock-media-5',
    mediaUrl: '',
    status: 'published',
    trendReport: 'Anime-inspired content remains popular',
    style: 'anime',
  },
  {
    id: '6',
    date: '2026-07-13T19:00:00Z',
    prompt: 'dark moody portrait, film noir, dramatic shadows, cinematic',
    caption: 'Shadows tell stories words cannot',
    hashtags: '#AIart #filmnoir #moody #cinematic #portrait',
    imageUrl: 'https://placehold.co/400x400/0d0d0d/8b8b8b?text=Noir',
    mediaId: '',
    mediaUrl: '',
    status: 'pending',
    trendReport: 'Film noir aesthetic showing renewed interest',
    style: 'noir',
  },
];

export const mockPerformance: PerformanceRecord[] = [
  { mediaId: 'mock-media-1', date: '2026-07-18', likes: 342, comments: 28, saves: 56, reach: 4200, followersDelta: 12 },
  { mediaId: 'mock-media-2', date: '2026-07-17', likes: 289, comments: 19, saves: 41, reach: 3600, followersDelta: 8 },
  { mediaId: 'mock-media-3', date: '2026-07-16', likes: 415, comments: 35, saves: 72, reach: 5100, followersDelta: 18 },
  { mediaId: 'mock-media-4', date: '2026-07-15', likes: 198, comments: 14, saves: 29, reach: 2800, followersDelta: 5 },
  { mediaId: 'mock-media-5', date: '2026-07-14', likes: 523, comments: 42, saves: 88, reach: 6200, followersDelta: 24 },
];

export const mockWeeklyEngagement: WeeklyEngagement[] = [
  { date: '07/13', likes: 180, comments: 12, saves: 22 },
  { date: '07/14', likes: 523, comments: 42, saves: 88 },
  { date: '07/15', likes: 198, comments: 14, saves: 29 },
  { date: '07/16', likes: 415, comments: 35, saves: 72 },
  { date: '07/17', likes: 289, comments: 19, saves: 41 },
  { date: '07/18', likes: 342, comments: 28, saves: 56 },
  { date: '07/19', likes: 267, comments: 21, saves: 38 },
];

export const mockDashboard: DashboardSummary = {
  totalPosts: 47,
  totalLikes: 12840,
  followers: 2347,
  recentPosts: mockPosts.slice(0, 3),
  weeklyEngagement: mockWeeklyEngagement,
};

export const mockSettings: AppSettings = {
  autoMode: false,
  postTime: '19:00',
  language: 'ko',
  captionLanguage: 'en',
  trendPreset: 'portrait' as const,
  trendKeywords: '',
  trendPrompt: '',
  trendKeywordPrompts: {},
  generatePrompt: '',
  mediaType: 'image' as const,
  stylePreset: 'photorealistic' as const,
  stylePrompts: {},
  instagramConnected: true,
  googleSheetsConnected: true,
  geminiConnected: true,
};

export interface StylePerformance {
  style: string;
  avgLikes: number;
  avgComments: number;
  avgSaves: number;
}

export const mockStylePerformance: StylePerformance[] = [
  { style: 'anime', avgLikes: 523, avgComments: 42, avgSaves: 88 },
  { style: 'minimal', avgLikes: 415, avgComments: 35, avgSaves: 72 },
  { style: 'cyberpunk', avgLikes: 342, avgComments: 28, avgSaves: 56 },
  { style: 'watercolor', avgLikes: 289, avgComments: 19, avgSaves: 41 },
  { style: 'surreal', avgLikes: 198, avgComments: 14, avgSaves: 29 },
];

export interface HashtagStat {
  hashtag: string;
  avgLikes: number;
  postsUsed: number;
}

export const mockHashtagStats: HashtagStat[] = [
  { hashtag: '#AIart', avgLikes: 354, postsUsed: 47 },
  { hashtag: '#digitalart', avgLikes: 412, postsUsed: 32 },
  { hashtag: '#cyberpunk', avgLikes: 389, postsUsed: 12 },
  { hashtag: '#anime', avgLikes: 478, postsUsed: 8 },
  { hashtag: '#portrait', avgLikes: 321, postsUsed: 18 },
  { hashtag: '#minimal', avgLikes: 402, postsUsed: 10 },
  { hashtag: '#fantasy', avgLikes: 267, postsUsed: 6 },
];
