'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Camera, FileSpreadsheet, Cpu, Check, Trash2, Key, Eye, EyeOff, HelpCircle, RotateCcw } from 'lucide-react';
import type { AppSettings, CaptionLanguage, MediaType, StylePreset, TrendPreset, CredentialKey, CredentialStatus } from '@/types';
import { DEFAULT_STYLE_PROMPTS, DEFAULT_TREND_PROMPT, DEFAULT_TREND_KEYWORDS, DEFAULT_GENERATE_PROMPT } from '@/types';

const TREND_PRESET_OPTIONS: { value: TrendPreset; labelKey: string }[] = [
  { value: 'portrait', labelKey: 'trendPortrait' },
  { value: 'anime', labelKey: 'trendAnime' },
  { value: 'dark_mood', labelKey: 'trendDarkMood' },
  { value: 'minimal', labelKey: 'trendMinimal' },
  { value: 'trend_tracking', labelKey: 'trendTracking' },
];

interface KeyConfig {
  key: CredentialKey;
  label: string;
  icon: typeof Camera;
  color: string;
}

const CAPTION_LANGUAGE_OPTIONS: { value: CaptionLanguage; labelKey: string }[] = [
  { value: 'ko', labelKey: 'langKo' },
  { value: 'en', labelKey: 'langEn' },
  { value: 'ko+en', labelKey: 'langKoEn' },
  { value: 'ja', labelKey: 'langJa' },
  { value: 'ja+ko', labelKey: 'langJaKo' },
];

const STYLE_PRESET_OPTIONS: { value: StylePreset; labelKey: string }[] = [
  { value: 'photorealistic', labelKey: 'stylePhotorealistic' },
  { value: 'anime', labelKey: 'styleAnime' },
  { value: 'ghibli', labelKey: 'styleGhibli' },
  { value: 'vintage_film', labelKey: 'styleVintageFilm' },
  { value: 'watercolor', labelKey: 'styleWatercolor' },
  { value: '3d_render', labelKey: 'style3dRender' },
  { value: 'pop_art', labelKey: 'stylePopArt' },
];

const defaultSettings: AppSettings = {
  autoMode: false,
  postTime: '19:00',
  language: 'ko',
  captionLanguage: 'ko+en',
  trendPreset: 'portrait' as const,
  trendKeywords: '',
  trendPrompt: DEFAULT_TREND_PROMPT,
  trendKeywordPrompts: { ...DEFAULT_TREND_KEYWORDS },
  generatePrompt: DEFAULT_GENERATE_PROMPT,
  mediaType: 'image' as const,
  stylePreset: 'photorealistic' as const,
  stylePrompts: { ...DEFAULT_STYLE_PROMPTS },
  instagramConnected: false,
  googleSheetsConnected: false,
  geminiConnected: false,
};

export default function SettingsPage() {
  const t = useTranslations('settings');
  const currentLocale = useLocale() as 'ko' | 'en';
  const [settings, setSettings] = useState<AppSettings>({ ...defaultSettings, language: currentLocale });
  const [saved, setSaved] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const [credentials, setCredentials] = useState<CredentialStatus[]>([]);
  const [inputValues, setInputValues] = useState<Record<CredentialKey, string>>({
    INSTAGRAM_ACCESS_TOKEN: '',
    INSTAGRAM_USER_ID: '',
    GEMINI_KEY: '',
  });
  const [showKey, setShowKey] = useState<Record<CredentialKey, boolean>>({
    INSTAGRAM_ACCESS_TOKEN: false,
    INSTAGRAM_USER_ID: false,
    GEMINI_KEY: false,
  });
  const [savingKey, setSavingKey] = useState<CredentialKey | null>(null);
  const [savedKey, setSavedKey] = useState<CredentialKey | null>(null);
  const [saveError, setSaveError] = useState<CredentialKey | null>(null);

  const keyConfigs: KeyConfig[] = [
    { key: 'INSTAGRAM_ACCESS_TOKEN', label: t('instagramToken'), icon: Camera, color: 'from-purple-500 to-pink-500' },
    { key: 'INSTAGRAM_USER_ID', label: t('instagramUserId'), icon: Camera, color: 'from-purple-500 to-pink-500' },
    { key: 'GEMINI_KEY', label: t('geminiApiKey'), icon: Cpu, color: 'from-blue-500 to-indigo-600' },
  ];

  useEffect(() => {
    async function init() {
      // 1) 설정 로드 먼저 — autoMode 등 Sheets 값 반영
      try {
        const res = await fetch('/api/sheets/settings');
        const json = await res.json();
        if (json.success && json.data) {
          setSettings((prev) => ({ ...prev, ...json.data, language: currentLocale }));
        }
      } catch {
        // use defaults
      }

      // 2) 인증 상태 확인 — 설정 로드 후 실행하여 race condition 방지
      await fetchCredentialStatus();
    }
    init();
  }, [currentLocale]);

  async function fetchCredentialStatus() {
    try {
      const res = await fetch('/api/settings/credentials');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCredentials(json.data);
          const creds = json.data as CredentialStatus[];
          const hasToken = creds.find((c) => c.key === 'INSTAGRAM_ACCESS_TOKEN')?.configured ?? false;
          const hasUserId = creds.find((c) => c.key === 'INSTAGRAM_USER_ID')?.configured ?? false;
          const hasGemini = creds.find((c) => c.key === 'GEMINI_KEY')?.configured ?? false;
          setSettings((prev) => ({
            ...prev,
            instagramConnected: hasToken && hasUserId,
            geminiConnected: hasGemini,
            googleSheetsConnected: true, // API succeeded → GOOGLE_SHEETS_ID is configured
          }));
          return;
        }
      }
      setFallbackCredentials();
    } catch {
      setFallbackCredentials();
    }
  }

  function setFallbackCredentials() {
    setCredentials([
      { key: 'INSTAGRAM_ACCESS_TOKEN', configured: false },
      { key: 'INSTAGRAM_USER_ID', configured: false },
      { key: 'GEMINI_KEY', configured: false },
    ]);
  }

  function isConfigured(key: CredentialKey): boolean {
    return credentials.find((c) => c.key === key)?.configured ?? false;
  }

  async function handleSaveKey(key: CredentialKey) {
    const value = inputValues[key].trim();
    if (!value) return;

    setSavingKey(key);
    setSaveError(null);
    try {
      const res = await fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setInputValues((prev) => ({ ...prev, [key]: '' }));
        setCredentials((prev) =>
          prev.map((c) => (c.key === key ? { ...c, configured: true, updatedAt: new Date().toISOString() } : c))
        );
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2000);
      } else {
        setSaveError(key);
        setTimeout(() => setSaveError(null), 2000);
      }
    } catch {
      setSaveError(key);
      setTimeout(() => setSaveError(null), 2000);
    } finally {
      setSavingKey(null);
    }
  }

  async function handleDeleteKey(key: CredentialKey) {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      const res = await fetch('/api/settings/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        setCredentials((prev) =>
          prev.map((c) => (c.key === key ? { ...c, configured: false, updatedAt: undefined } : c))
        );
      }
    } catch {
      // silently fail
    }
  }

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSettingsSaveError(null);
    try {
      // language는 항상 현재 쿠키 로케일과 동기화하여 저장
      const res = await fetch('/api/sheets/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, language: currentLocale }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setSettingsSaveError('Failed to save');
        setTimeout(() => setSettingsSaveError(null), 3000);
      }
    } catch {
      setSettingsSaveError('Failed to save');
      setTimeout(() => setSettingsSaveError(null), 3000);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>

      {/* Auto Mode */}
      <Card className={cn("border-slate-800 bg-slate-900", settings.autoMode && "border-emerald-500/50")}>
        <CardContent className="flex items-center justify-between p-5">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">{t('autoMode')}</p>
            <p className="text-xs text-slate-400">{t('autoModeDesc')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              settings.autoMode
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-slate-700/50 text-slate-500"
            )}>
              {settings.autoMode ? 'ON' : 'OFF'}
            </span>
            <Switch
              checked={settings.autoMode}
              onCheckedChange={(checked) => update('autoMode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Time & Caption Language — visible only when autoMode is ON */}
      {settings.autoMode && (
        <>
          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-5">
              <Label htmlFor="postTime" className="mb-2 block text-sm text-white">
                {t('postTime')} <span className="text-slate-500 font-normal">(KST)</span>
              </Label>
              <Input
                id="postTime"
                type="time"
                value={settings.postTime}
                onChange={(e) => update('postTime', e.target.value)}
                className="w-40 border-slate-700 bg-slate-950 text-slate-200"
              />
              <p className="mt-2 text-xs text-slate-500">{t('postTimeDesc')}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-5">
              <Label htmlFor="captionLanguage" className="mb-2 block text-sm text-white">
                {t('captionLanguage')}
              </Label>
              <select
                id="captionLanguage"
                value={settings.captionLanguage}
                onChange={(e) => update('captionLanguage', e.target.value as CaptionLanguage)}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
              >
                {CAPTION_LANGUAGE_OPTIONS.map(({ value, labelKey }) => (
                  <option key={value} value={value}>
                    {t(labelKey)}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-5">
              <Label className="mb-3 block text-sm text-white">
                {t('mediaType')}
              </Label>
              <div className="flex gap-1 rounded-lg bg-slate-800 p-0.5 w-fit">
                {(['image', 'reels'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => update('mediaType', type)}
                    className={cn(
                      'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                      settings.mediaType === type
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {t(type === 'image' ? 'mediaImage' : 'mediaReels')}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{t('mediaTypeDesc')}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-white">{t('stylePreset')}</Label>
                <button
                  onClick={() => update('stylePrompts', { ...DEFAULT_STYLE_PROMPTS })}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-400 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('resetDefaults')}
                </button>
              </div>
              <select
                value={settings.stylePreset}
                onChange={(e) => update('stylePreset', e.target.value as StylePreset)}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none w-full"
              >
                {STYLE_PRESET_OPTIONS.map(({ value, labelKey }) => (
                  <option key={value} value={value}>
                    {t(labelKey)}
                  </option>
                ))}
              </select>
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">{t('stylePromptLabel')}</label>
                <textarea
                  value={settings.stylePrompts?.[settings.stylePreset] || DEFAULT_STYLE_PROMPTS[settings.stylePreset] || ''}
                  onChange={(e) => {
                    const updated = { ...(settings.stylePrompts || {}), [settings.stylePreset]: e.target.value };
                    update('stylePrompts', updated);
                  }}
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-slate-500">{t('stylePresetDesc')}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-white">{t('generatePromptLabel')}</Label>
                <button
                  onClick={() => update('generatePrompt', DEFAULT_GENERATE_PROMPT)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-400 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('resetDefaults')}
                </button>
              </div>
              <textarea
                value={settings.generatePrompt || DEFAULT_GENERATE_PROMPT}
                onChange={(e) => update('generatePrompt', e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500">{t('generatePromptDesc')}</p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Trend Analysis — always visible */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-white">{t('trendPreset')}</Label>
            <button
              onClick={() => update('trendKeywordPrompts', { ...DEFAULT_TREND_KEYWORDS })}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-400 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              {t('resetDefaults')}
            </button>
          </div>
          <select
            value={settings.trendPreset}
            onChange={(e) => {
              const preset = e.target.value as TrendPreset;
              update('trendPreset', preset);
              // trendKeywords를 선택된 프리셋의 키워드로 자동 설정
              const keywords = settings.trendKeywordPrompts?.[preset] || DEFAULT_TREND_KEYWORDS[preset] || '';
              update('trendKeywords', keywords);
            }}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none w-full"
          >
            {TREND_PRESET_OPTIONS.map(({ value, labelKey }) => (
              <option key={value} value={value}>{t(labelKey)}</option>
            ))}
          </select>
          <div>
            <label className="mb-1.5 block text-xs text-slate-500">{t('trendKeywordLabel')}</label>
            <textarea
              value={settings.trendKeywordPrompts?.[settings.trendPreset] || DEFAULT_TREND_KEYWORDS[settings.trendPreset] || ''}
              onChange={(e) => {
                const updated = { ...(settings.trendKeywordPrompts || {}), [settings.trendPreset]: e.target.value };
                update('trendKeywordPrompts', updated);
                update('trendKeywords', e.target.value);
              }}
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
            />
          </div>
          <p className="text-xs text-slate-500">{t('trendKeywordsDesc')}</p>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Key className="h-5 w-5" />
            {t('apiKeys')}
          </CardTitle>
          <p className="text-xs text-slate-400">{t('apiKeysDesc')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {keyConfigs.map(({ key, label, icon: Icon, color }) => (
            <div
              key={key}
              className="rounded-lg border border-slate-800 bg-slate-950 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'border-0 text-xs',
                      isConfigured(key)
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    )}
                  >
                    {isConfigured(key) ? t('configured') : t('notConfigured')}
                  </Badge>
                  {isConfigured(key) && (
                    <button
                      onClick={() => handleDeleteKey(key)}
                      className="text-red-400 hover:text-red-300 text-xs transition-colors"
                    >
                      {t('deleteKey')}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey[key] ? 'text' : 'password'}
                    placeholder={t('enterKey')}
                    value={inputValues[key]}
                    onChange={(e) => setInputValues((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-600 focus:border-purple-500 pr-10"
                  />
                  {!isConfigured(key) && inputValues[key] && (
                    <button
                      type="button"
                      onClick={() => setShowKey((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showKey[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <Button
                  onClick={() => handleSaveKey(key)}
                  disabled={!inputValues[key].trim() || savingKey === key}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 shrink-0"
                >
                  {savingKey === key ? (
                    '...'
                  ) : savedKey === key ? (
                    <><Check className="mr-1 h-3 w-3" />{t('saved')}</>
                  ) : saveError === key ? (
                    t('saveError')
                  ) : (
                    t('save')
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-5">
          <Label className="mb-3 block text-sm text-white">{t('language')}</Label>
          <div className="flex gap-1 rounded-lg bg-slate-800 p-0.5 w-fit">
            {(['ko', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  if (lang === settings.language) return;
                  document.cookie = `locale=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
                  window.location.reload();
                }}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  settings.language === lang
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {lang === 'ko' ? 'Korean' : 'English'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
        >
          {saved ? (
            <>
              <Check className="mr-1.5 h-4 w-4" />
              {t('saved')}
            </>
          ) : (
            t('save')
          )}
        </Button>
        {settingsSaveError && (
          <span className="text-sm text-red-400">{settingsSaveError}</span>
        )}
      </div>
    </div>
  );
}
