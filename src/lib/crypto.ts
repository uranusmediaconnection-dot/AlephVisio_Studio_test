import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * AES-256-GCM envelope for credentials persisted in the settings table.
 * Key material derives from APP_ENCRYPTION_KEY (any length → sha256 → 32 bytes).
 * Format: enc:v1:<ivB64>:<tagB64>:<cipherB64>
 */

function keyMaterial(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY ?? "alephvisio-dev-key";
  return createHash("sha256").update(String(secret)).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith("enc:v1:")) {
    // Legacy/verbatim value (e.g. migrated from .env) — return as-is.
    return payload;
  }
  const [, , ivB64, tagB64, dataB64] = payload.split(":");
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 12) return "•".repeat(key.length);
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
