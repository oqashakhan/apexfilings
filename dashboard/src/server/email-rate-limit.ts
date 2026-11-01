import "server-only";
import { isIP } from "node:net";
import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { ApiError } from "@/server/http";
import { hashToken, normalizeEmail } from "@/server/security";

async function consume(scope: string, identity: string, limit: number) {
  const key = hashToken(`${scope}:${identity}`);
  const now = new Date();
  const previous = await db.authThrottle.findUnique({ where: { key } });
  if (previous?.blockedUntil && previous.blockedUntil > now) throw new ApiError(429, "Too many requests. Please try again later.");
  const reset = !previous || previous.updatedAt < new Date(now.getTime() - 60 * 60_000);
  const record = await db.authThrottle.upsert({ where: { key }, create: { key, failures: 1 }, update: reset ? { failures: 1, blockedUntil: null } : { failures: { increment: 1 } } });
  if (record.failures > limit) {
    await db.authThrottle.update({ where: { key }, data: { blockedUntil: new Date(now.getTime() + 60 * 60_000) } });
    throw new ApiError(429, "Too many requests. Please try again later.");
  }
}

function clientIp(request: NextRequest) {
  // Coolify's reverse proxy must replace these headers; do not expose the app directly.
  const candidate = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

export async function limitRegistration(request: NextRequest, email: string) {
  await consume("signup-email", normalizeEmail(email), 5);
  const ip = clientIp(request);
  if (ip) await consume("signup-ip", ip, 20);
}

export async function limitVerificationRequest(request: NextRequest, userId: string, email: string) {
  await consume("otp-request-account", userId, 10);
  await consume("otp-request-email", normalizeEmail(email), 10);
  const ip = clientIp(request);
  if (ip) await consume("otp-request-ip", ip, 30);
}
