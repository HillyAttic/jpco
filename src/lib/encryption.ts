import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts plaintext using AES-256-CBC.
 * Returns "iv:ciphertext" as hex-encoded colon-delimited string.
 * A fresh random IV is generated per call for security.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an "iv:ciphertext" string produced by encrypt().
 */
export function decrypt(encryptedData: string): string {
  const key = getKey();
  const colonIndex = encryptedData.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('Invalid encrypted data format');
  }
  const ivHex = encryptedData.slice(0, colonIndex);
  const ciphertext = encryptedData.slice(colonIndex + 1);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
