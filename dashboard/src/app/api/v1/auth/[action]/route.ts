import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { actor, ApiError, body, checkOrigin, cookieName, date, handleError, json } from "@/server/http";
import { hashPassword, hashToken, normalizeEmail, passwordStrong, randomToken, verifyPassword } from "@/server/security";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const runtime = "nodejs";
const email = z.email().max(254);
const registration = z.object({ fullName: z.string().trim().min(2).max(120), email, phone: z.string().trim().min(5).max(40), password: z.string(), confirm: z.string() });
const credentials = z.object({ email, password: z.string().min(1) });
const resetRequest = z.object({ email });
const resetConfirm = z.object({ token: z.string().min(40).max(200), password: z.string(), confirm: z.string() });
const sessionAge = 60 * 60 * 24 * 7;

async function throttle(emailValue: string, scope = "login") {
  const key = hashToken(`${scope}:${normalizeEmail(emailValue)}`);
  const record = await db.authThrottle.findUnique({ where: { key } });
  if (record?.blockedUntil && record.blockedUntil > new Date()) throw new ApiError(429, "Please try again later");
  if (record?.blockedUntil && record.blockedUntil <= new Date()) await db.authThrottle.update({ where: { key }, data: { failures: 0, blockedUntil: null } });
  return key;
}
async function loginFailure(key: string) {
  const now = new Date();
  const current = await db.authThrottle.findUnique({ where: { key } });
  const failures = (current?.failures ?? 0) + 1;
  await db.authThrottle.upsert({ where: { key }, create: { key, failures }, update: { failures, blockedUntil: failures >= 8 ? new Date(now.getTime() + 15 * 60_000) : null } });
}

async function makeSession(userId: string, role: "OWNER" | "CLIENT") {
  const token = randomToken();
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + sessionAge * 1000) } });
  const response = json({ ok: true, role });
  response.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionAge });
  return response;
}

async function deliverReset(emailValue: string, token: string) {
  if (process.env.NODE_ENV === "production" || process.env.RESET_DELIVERY !== "development-file") return;
  const directory = resolve(process.cwd(), ".local", "reset-outbox");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const url = `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/reset-password?token=${encodeURIComponent(token)}`;
  await writeFile(join(directory, `${hashToken(emailValue)}.txt`), url, { mode: 0o600 });
}

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    if (action !== "current") throw new ApiError(404, "Not found");
    const user = await actor(request);
    return json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status } });
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    checkOrigin(request);
    const { action } = await context.params;
    if (action === "register") {
      const input = registration.parse(await body(request));
      if (input.password !== input.confirm || !passwordStrong(input.password)) throw new ApiError(400, "Use a matching password of 12–128 characters with a letter, number, and symbol");
      const normalized = normalizeEmail(input.email);
      const existing = await db.user.findUnique({ where: { emailNormalized: normalized }, select: { id: true } });
      if (existing) throw new ApiError(400, "Account could not be created");
      let user;
      try { user = await db.user.create({ data: { fullName: input.fullName, email: normalized, emailNormalized: normalized, phone: input.phone, passwordHash: await hashPassword(input.password), role: "CLIENT" } }); }
      catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiError(400, "Account could not be created"); throw error; }
      await db.auditLog.create({ data: { actorUserId: user.id, action: "ACCOUNT_REGISTERED", resourceType: "User", resourceId: user.id } });
      return makeSession(user.id, "CLIENT");
    }
    if (action === "login") {
      const input = credentials.parse(await body(request));
      const key = await throttle(input.email);
      const user = await db.user.findUnique({ where: { emailNormalized: normalizeEmail(input.email) } });
      if (!user || user.status !== "ACTIVE" || !(await verifyPassword(user.passwordHash, input.password))) {
        await loginFailure(key);
        throw new ApiError(401, "Invalid email or password");
      }
      await db.authThrottle.deleteMany({ where: { key } });
      if (user.role !== "OWNER" && user.role !== "CLIENT") throw new ApiError(403, "This account cannot access the current dashboard");
      return makeSession(user.id, user.role);
    }
    if (action === "logout") {
      const token = request.cookies.get(cookieName)?.value;
      if (token) await db.session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
      const response = json({ ok: true });
      response.cookies.set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
      return response;
    }
    if (action === "request-reset") {
      const input = resetRequest.parse(await body(request));
      const normalized = normalizeEmail(input.email);
      const key = await throttle(normalized, "reset");
      const user = await db.user.findUnique({ where: { emailNormalized: normalized }, select: { id: true } });
      if (user && (process.env.NODE_ENV !== "production" && process.env.RESET_DELIVERY === "development-file")) {
        const token = randomToken();
        await db.passwordReset.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
        await deliverReset(normalized, token);
      }
      await loginFailure(key);
      return json({ ok: true, message: "If the account exists, reset instructions will be sent when email delivery is configured." });
    }
    if (action === "reset-password") {
      const input = resetConfirm.parse(await body(request));
      if (input.password !== input.confirm || !passwordStrong(input.password)) throw new ApiError(400, "Password does not meet requirements");
      const reset = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(input.token) } });
      if (!reset || reset.usedAt || reset.expiresAt <= new Date()) throw new ApiError(400, "Invalid or expired reset link");
      await db.$transaction(async (tx) => {
        const claimed = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
        if (claimed.count !== 1) throw new ApiError(400, "Invalid or expired reset link");
        await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(input.password) } });
        await tx.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.auditLog.create({ data: { actorUserId: reset.userId, action: "PASSWORD_RESET", resourceType: "User", resourceId: reset.userId } });
      });
      return json({ ok: true, resetAt: date(new Date()) });
    }
    throw new ApiError(404, "Not found");
  } catch (error) { return handleError(error); }
}
