import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(value = process.env.GOOGLE_BUSINESS_TOKEN_KEY) {
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error("Google token encryption key is not configured.");
  return Buffer.from(value, "hex");
}

export function encryptGoogleSecret(plaintext: string, context: string, keyHex?: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(keyHex), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptGoogleSecret(payload: string, context: string, keyHex?: string) {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Invalid encrypted Google secret.");
  const [, iv, tag, encrypted] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key(keyHex), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
