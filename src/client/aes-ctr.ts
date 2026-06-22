import { createCipheriv, createHash, randomBytes } from "node:crypto";

export type AesKeyLength = 128 | 192 | 256;

function deriveKey(apiKey: string, bits: AesKeyLength): Buffer {
  const bytes = bits / 8;
  // ProjeQtOr API keys are user supplied strings. Hashing gives deterministic key material
  // with the exact size expected by AES-CTR while avoiding raw key length assumptions.
  return createHash("sha256").update(apiKey, "utf8").digest().subarray(0, bytes);
}

/**
 * Encrypts a UTF-8 payload using AES-CTR. The returned format is base64(iv):base64(ciphertext).
 * If your ProjeQtOr instance/plugin expects another envelope, adapt only this function.
 */
export function encryptAesCtr(plainText: string, apiKey: string, bits: AesKeyLength): string {
  const iv = randomBytes(16);
  const key = deriveKey(apiKey, bits);
  const cipher = createCipheriv(`aes-${bits}-ctr`, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}:${encrypted.toString("base64")}`;
}
