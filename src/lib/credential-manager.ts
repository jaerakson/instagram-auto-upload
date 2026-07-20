import { encrypt, decrypt } from './crypto';
import { sheetsService } from './google-sheets';

export type CredentialKey = 'INSTAGRAM_ACCESS_TOKEN' | 'INSTAGRAM_USER_ID' | 'GEMINI_KEY';

export interface CredentialStatus {
  key: CredentialKey;
  configured: boolean;
  updatedAt?: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.');
  return key;
}

export async function getCredential(key: CredentialKey): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const row = await sheetsService.getCredentialRow(key);
  if (!row || !row.ciphertext) return null;

  const encryptionKey = getEncryptionKey();
  const plaintext = decrypt({ iv: row.iv, ciphertext: row.ciphertext, tag: row.tag }, encryptionKey);

  cache.set(key, { value: plaintext, expiresAt: Date.now() + CACHE_TTL_MS });
  return plaintext;
}

export async function setCredential(key: CredentialKey, value: string): Promise<void> {
  const encryptionKey = getEncryptionKey();
  const encrypted = encrypt(value, encryptionKey);

  await sheetsService.setCredentialRow(key, encrypted.iv, encrypted.ciphertext, encrypted.tag);

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function deleteCredential(key: CredentialKey): Promise<void> {
  await sheetsService.deleteCredentialRow(key);
  cache.delete(key);
}

export async function listCredentials(): Promise<CredentialStatus[]> {
  const allKeys: CredentialKey[] = ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_USER_ID', 'GEMINI_KEY'];
  const rows = await sheetsService.getAllCredentialRows();

  return allKeys.map((key) => {
    const row = rows.find((r) => r.key === key);
    return {
      key,
      configured: !!row?.ciphertext,
      updatedAt: row?.updatedAt,
    };
  });
}

export function clearCache(): void {
  cache.clear();
}
