import { createCipheriv, createDecipheriv } from 'node:crypto';
import type { EnvConfig } from '../config.js';

// ─── AES-CTR Encryption for ProjeQtOr write operations ────────────────────────

/**
 * ProjeQtOr requires AES-CTR encryption for PUT/POST/DELETE operations.
 * This module implements the AES-CTR encryption/decryption with
 * configurable key lengths (128/192/256 bits).
 */

/**
 * Derive an AES key of the correct length from the API key string
 * by taking the first N bytes (128=16, 192=24, 256=32).
 */
function deriveKey(apiKey: string, keyLength: EnvConfig['PROJEQTOR_AES_KEY_LENGTH']): Buffer {
  const keyBytes = keyLength === '128' ? 16 : keyLength === '192' ? 24 : 32;
  const buffer = Buffer.from(apiKey, 'utf-8');

  if (buffer.length < keyBytes) {
    // Pad with zeros if key is too short
    return Buffer.concat([buffer, Buffer.alloc(keyBytes - buffer.length)]);
  }
  return buffer.slice(0, keyBytes);
}

/**
 * Encrypt a JSON payload using AES-CTR mode.
 *
 * @param data - The data to encrypt
 * @param apiKey - The user API key from ProjeQtOr
 * @param keyLength - AES key length
 * @returns Base64-encoded ciphertext with prepended IV (hex)
 */
export function encryptPayload(
  data: unknown,
  config: EnvConfig,
): { encrypted: string; iv: string } {
  const json = JSON.stringify(data);
  const key = deriveKey(config.PROJEQTOR_API_KEY, config.PROJEQTOR_AES_KEY_LENGTH);
  const iv = Buffer.from(crypto.getRandomValues(new Uint8Array(16)));

  const cipher = createCipheriv('aes-' + config.PROJEQTOR_AES_KEY_LENGTH + '-ctr', key, iv);
  const encrypted = Buffer.concat([cipher.update(json, 'utf-8'), cipher.final()]);

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypt a response body from ProjeQtOr.
 */
export function decryptPayload(
  encryptedBase64: string,
  ivHex: string,
  config: EnvConfig,
): unknown {
  const key = deriveKey(config.PROJEQTOR_API_KEY, config.PROJEQTOR_AES_KEY_LENGTH);
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedBase64, 'base64');

  const decipher = createDecipheriv('aes-' + config.PROJEQTOR_AES_KEY_LENGTH + '-ctr', key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return JSON.parse(decrypted.toString('utf-8'));
}
