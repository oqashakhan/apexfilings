import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/server/http";
import { emailHtml, mailConfigured, queueEmail } from "@/server/mail";

const maxAgeMs = 10 * 60_000;
const encryptedPrefix = "apex-otp:v1:";

function secret() {
  const encoded = process.env.EMAIL_OTP_SECRET;
  const value = encoded ? Buffer.from(encoded, "base64url") : Buffer.alloc(0);
  if (value.length !== 32) throw new ApiError(503, "Email verification is not configured");
  return value;
}

function key(purpose: "hash" | "email") {
  return createHmac("sha256", secret()).update(`apex-email-otp:${purpose}`).digest();
}

export function otpDeliveryAvailable() {
  const testOutbox = process.env.TEST_EMAIL_OUTBOX === "1" && /@(?:127\.0\.0\.1|localhost):\d+\/apex_dashboard_test(?:\?|$)/.test(process.env.DATABASE_URL ?? "");
  if (!mailConfigured() && !testOutbox) throw new ApiError(503, "Verification email delivery is not configured");
  secret();
}

export const generateEmailOtp = () => randomInt(0, 1_000_000).toString().padStart(6, "0");

export function hashEmailOtp(userId: string, recordId: string, code: string) {
  return createHmac("sha256", key("hash")).update(userId).update(":").update(recordId).update(":").update(code).digest("hex");
}

export function matchesEmailOtp(userId: string, recordId: string, code: string, storedHash: string) {
  const supplied = Buffer.from(hashEmailOtp(userId, recordId, code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === supplied.length && timingSafeEqual(stored, supplied);
}

export function encryptOtpEmail(html: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("email"), iv);
  const ciphertext = Buffer.concat([cipher.update(html, "utf8"), cipher.final()]);
  return encryptedPrefix + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function decryptOtpEmail(value: string) {
  if (!value.startsWith(encryptedPrefix)) return value;
  const raw = Buffer.from(value.slice(encryptedPrefix.length), "base64url");
  if (raw.length < 29) throw new Error("Invalid encrypted email");
  const decipher = createDecipheriv("aes-256-gcm", key("email"), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

export async function issueEmailOtp(tx: Prisma.TransactionClient, userId: string, toEmail: string) {
  const code = generateEmailOtp();
  const id = randomUUID();
  const record = await tx.emailVerification.create({ data: { id, userId, tokenHash: hashEmailOtp(userId, id, code), method: "OTP", expiresAt: new Date(Date.now() + maxAgeMs) } });
  const html = emailHtml("Verify Your Email", ["Enter this six-digit code to verify your Apex Filings account:", code, "This code expires in 10 minutes. If you did not create this account, you can ignore this message."]);
  await queueEmail(tx, `verify-otp:${record.id}`, toEmail, "Your Apex Filings verification code", encryptOtpEmail(html));
  return record;
}
