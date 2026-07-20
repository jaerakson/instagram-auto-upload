import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface EncryptedData {
  iv: string;
  ciphertext: string;
  tag: string;
}

export function encrypt(plaintext: string, encryptionKey: string): EncryptedData {
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    iv: iv.toString('hex'),
    ciphertext: encrypted,
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decrypt(data: EncryptedData, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = Buffer.from(data.iv, 'hex');
  const tag = Buffer.from(data.tag, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
