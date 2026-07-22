import { google } from 'googleapis';
import type { PostRecord, PerformanceRecord, AppSettings, StylePreset, TrendPreset } from '@/types';
import { DEFAULT_STYLE_PROMPTS, DEFAULT_TREND_PROMPT, DEFAULT_TREND_KEYWORDS, DEFAULT_GENERATE_PROMPT } from '@/types';

const SHEET_POSTS = '게시기록';
const SHEET_PERFORMANCE = '성과';
const SHEET_SETTINGS = '설정';
const SHEET_CREDENTIALS = '인증정보';

export class GoogleSheetsService {
  private sheets;
  private spreadsheetId: string;

  constructor() {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
  }

  // 게시기록 CRUD

  async getPosts(): Promise<PostRecord[]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_POSTS}!A2:T`,
    });
    const rows = res.data.values || [];
    return rows.map((row) => ({
      id: row[0] || '',
      date: row[1] || '',
      prompt: row[2] || '',
      caption: row[3] || '',
      hashtags: row[4] || '',
      imageUrl: row[5] || '',
      mediaId: row[6] || '',
      mediaUrl: row[7] || '',
      status: (row[8] || 'pending') as PostRecord['status'],
      trendReport: row[9] || '',
      style: row[10] || '',
      currentStep: row[11] ? Number(row[11]) : undefined,
      mediaType: row[12] || undefined,
      stylePreset: row[13] || undefined,
      captionLang: row[14] || undefined,
      trendPreset: row[15] || undefined,
      totalTokens: row[16] ? Number(row[16]) : undefined,
      totalCost: row[17] ? Number(row[17]) : undefined,
      retryCount: row[18] ? Number(row[18]) : undefined,
      error: row[19] || undefined,
    }));
  }

  async addPost(post: PostRecord): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_POSTS}!A:T`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          post.id,
          post.date,
          post.prompt,
          post.caption,
          post.hashtags,
          post.imageUrl,
          post.mediaId,
          post.mediaUrl,
          post.status,
          post.trendReport,
          post.style,
          post.currentStep ?? '',
          post.mediaType ?? '',
          post.stylePreset ?? '',
          post.captionLang ?? '',
          post.trendPreset ?? '',
          post.totalTokens ?? '',
          post.totalCost ?? '',
          post.retryCount ?? '',
          post.error ?? '',
        ]],
      },
    });
  }

  async updatePost(id: string, updates: Partial<PostRecord>): Promise<void> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_POSTS}!A2:A`,
    });
    const ids = res.data.values || [];
    const rowIndex = ids.findIndex((row) => row[0] === id);
    if (rowIndex === -1) {
      throw new Error(`Post with id ${id} not found`);
    }

    const rowNumber = rowIndex + 2; // 1-indexed + header row
    const currentRow = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_POSTS}!A${rowNumber}:T${rowNumber}`,
    });
    const current = currentRow.data.values?.[0] || [];

    const merged = [
      updates.id ?? current[0] ?? '',
      updates.date ?? current[1] ?? '',
      updates.prompt ?? current[2] ?? '',
      updates.caption ?? current[3] ?? '',
      updates.hashtags ?? current[4] ?? '',
      updates.imageUrl ?? current[5] ?? '',
      updates.mediaId ?? current[6] ?? '',
      updates.mediaUrl ?? current[7] ?? '',
      updates.status ?? current[8] ?? '',
      updates.trendReport ?? current[9] ?? '',
      updates.style ?? current[10] ?? '',
      updates.currentStep ?? current[11] ?? '',
      updates.mediaType ?? current[12] ?? '',
      updates.stylePreset ?? current[13] ?? '',
      updates.captionLang ?? current[14] ?? '',
      updates.trendPreset ?? current[15] ?? '',
      updates.totalTokens ?? current[16] ?? '',
      updates.totalCost ?? current[17] ?? '',
      updates.retryCount ?? current[18] ?? '',
      updates.error ?? current[19] ?? '',
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_POSTS}!A${rowNumber}:T${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [merged] },
    });
  }

  async deletePost(id: string): Promise<void> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_POSTS}!A2:A`,
    });
    const ids = res.data.values || [];
    const rowIndex = ids.findIndex((row) => row[0] === id);
    if (rowIndex === -1) {
      throw new Error(`Post with id ${id} not found`);
    }
    const rowNumber = rowIndex + 2;
    const emptyRow = Array(20).fill('');
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_POSTS}!A${rowNumber}:T${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [emptyRow] },
    });
  }

  async getPendingJob(): Promise<PostRecord | null> {
    const posts = await this.getPosts();
    const pending = posts
      .filter(p => p.status === 'pending' && p.currentStep !== undefined && p.currentStep < 4)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return pending[0] || null;
  }

  // 성과 CRUD

  async getPerformance(): Promise<PerformanceRecord[]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_PERFORMANCE}!A2:G`,
    });
    const rows = res.data.values || [];
    return rows.map((row) => ({
      mediaId: row[0] || '',
      date: row[1] || '',
      likes: Number(row[2]) || 0,
      comments: Number(row[3]) || 0,
      saves: Number(row[4]) || 0,
      reach: Number(row[5]) || 0,
      followersDelta: Number(row[6]) || 0,
    }));
  }

  async addPerformance(record: PerformanceRecord): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_PERFORMANCE}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          record.mediaId,
          record.date,
          record.likes,
          record.comments,
          record.saves,
          record.reach,
          record.followersDelta,
        ]],
      },
    });
  }

  async upsertPerformance(record: PerformanceRecord): Promise<void> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_PERFORMANCE}!A2:A`,
    });
    const mediaIds = res.data.values || [];
    const rowIndex = mediaIds.findIndex((row) => row[0] === record.mediaId);

    const values = [[
      record.mediaId,
      record.date,
      record.likes,
      record.comments,
      record.saves,
      record.reach,
      record.followersDelta,
    ]];

    if (rowIndex >= 0) {
      const rowNumber = rowIndex + 2;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEET_PERFORMANCE}!A${rowNumber}:G${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    } else {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEET_PERFORMANCE}!A:G`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    }
  }

  // 설정

  async getSettings(): Promise<AppSettings> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_SETTINGS}!A2:B`,
    });
    const rows = res.data.values || [];
    const settingsMap = new Map<string, string>();
    for (const row of rows) {
      if (row[0]) settingsMap.set(row[0], row[1] || '');
    }

    const toBool = (v: string | undefined) => v?.toLowerCase() === 'true';

    // 스타일 프롬프트: 시트에 있으면 시트값, 없으면 소스 기본값
    const stylePrompts: Record<string, string> = {};
    for (const key of Object.keys(DEFAULT_STYLE_PROMPTS) as StylePreset[]) {
      const sheetVal = settingsMap.get(`stylePrompt_${key}`);
      stylePrompts[key] = sheetVal || DEFAULT_STYLE_PROMPTS[key];
    }

    // 트렌드 키워드 프롬프트: 동일 패턴
    const trendKeywordPrompts: Record<string, string> = {};
    for (const key of Object.keys(DEFAULT_TREND_KEYWORDS) as TrendPreset[]) {
      const sheetVal = settingsMap.get(`trendKeyword_${key}`);
      trendKeywordPrompts[key] = sheetVal || DEFAULT_TREND_KEYWORDS[key];
    }

    return {
      autoMode: toBool(settingsMap.get('autoMode')),
      postTime: settingsMap.get('postTime') || '19:00',
      language: (settingsMap.get('language') || 'ko') as 'ko' | 'en',
      captionLanguage: (settingsMap.get('captionLanguage') || 'en') as AppSettings['captionLanguage'],
      trendPreset: (settingsMap.get('trendPreset') || 'portrait') as AppSettings['trendPreset'],
      trendKeywords: settingsMap.get('trendKeywords') || '',
      trendPrompt: settingsMap.get('trendPrompt') || DEFAULT_TREND_PROMPT,
      trendKeywordPrompts,
      generatePrompt: settingsMap.get('generatePrompt') || DEFAULT_GENERATE_PROMPT,
      mediaType: (settingsMap.get('mediaType') || 'image') as AppSettings['mediaType'],
      stylePreset: (settingsMap.get('stylePreset') || 'photorealistic') as AppSettings['stylePreset'],
      stylePrompts,
      instagramConnected: toBool(settingsMap.get('instagramConnected')),
      googleSheetsConnected: toBool(settingsMap.get('googleSheetsConnected')),
      geminiConnected: toBool(settingsMap.get('geminiConnected')),
    };
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    const merged = { ...current, ...settings };
    const rows: string[][] = [
      ['autoMode', String(merged.autoMode)],
      ['postTime', merged.postTime],
      ['language', merged.language],
      ['captionLanguage', merged.captionLanguage],
      ['trendPreset', merged.trendPreset || 'portrait'],
      ['trendKeywords', merged.trendKeywords || ''],
      ['trendPrompt', merged.trendPrompt || DEFAULT_TREND_PROMPT],
      ['generatePrompt', merged.generatePrompt || DEFAULT_GENERATE_PROMPT],
      ['mediaType', merged.mediaType || 'image'],
      ['stylePreset', merged.stylePreset || 'photorealistic'],
      ['instagramConnected', String(merged.instagramConnected)],
      ['googleSheetsConnected', String(merged.googleSheetsConnected)],
      ['geminiConnected', String(merged.geminiConnected)],
    ];

    // 스타일 프롬프트 추가
    const sp = merged.stylePrompts || {};
    for (const key of Object.keys(DEFAULT_STYLE_PROMPTS) as StylePreset[]) {
      rows.push([`stylePrompt_${key}`, sp[key] || DEFAULT_STYLE_PROMPTS[key]]);
    }

    // 트렌드 키워드 프롬프트 추가
    const tkp = merged.trendKeywordPrompts || {};
    for (const key of Object.keys(DEFAULT_TREND_KEYWORDS) as TrendPreset[]) {
      rows.push([`trendKeyword_${key}`, tkp[key] || DEFAULT_TREND_KEYWORDS[key]]);
    }

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_SETTINGS}!A2:B${rows.length + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }

  // 인증정보 CRUD

  async getCredentialRow(key: string): Promise<{ iv: string; ciphertext: string; tag: string; updatedAt: string } | null> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_CREDENTIALS}!A2:E`,
    });
    const rows = res.data.values || [];
    const row = rows.find((r) => r[0] === key);
    if (!row) return null;
    return { iv: row[1] || '', ciphertext: row[2] || '', tag: row[3] || '', updatedAt: row[4] || '' };
  }

  async getAllCredentialRows(): Promise<Array<{ key: string; iv: string; ciphertext: string; tag: string; updatedAt: string }>> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_CREDENTIALS}!A2:E`,
    });
    const rows = res.data.values || [];
    return rows
      .filter((r) => r[0])
      .map((r) => ({ key: r[0], iv: r[1] || '', ciphertext: r[2] || '', tag: r[3] || '', updatedAt: r[4] || '' }));
  }

  async setCredentialRow(key: string, iv: string, ciphertext: string, tag: string): Promise<void> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_CREDENTIALS}!A2:A`,
    });
    const keys = res.data.values || [];
    const rowIndex = keys.findIndex((r) => r[0] === key);
    const updatedAt = new Date().toISOString();

    if (rowIndex >= 0) {
      const rowNumber = rowIndex + 2;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEET_CREDENTIALS}!A${rowNumber}:E${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[key, iv, ciphertext, tag, updatedAt]] },
      });
    } else {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEET_CREDENTIALS}!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[key, iv, ciphertext, tag, updatedAt]] },
      });
    }
  }

  async deleteCredentialRow(key: string): Promise<void> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_CREDENTIALS}!A2:A`,
    });
    const keys = res.data.values || [];
    const rowIndex = keys.findIndex((r) => r[0] === key);
    if (rowIndex >= 0) {
      const rowNumber = rowIndex + 2;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEET_CREDENTIALS}!A${rowNumber}:E${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['', '', '', '', '']] },
      });
    }
  }
}

export const sheetsService = new GoogleSheetsService();
