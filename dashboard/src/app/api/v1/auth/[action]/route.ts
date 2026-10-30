import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { actor, ApiError, body, checkOrigin, cookieName, date, handleError, json } from "@/server/http";
import { hashPassword, hashToken, normalizeEmail, passwordStrong, randomToken, verifyPassword } from "@/server/security";
import { deviceCookieName, makeSession, recordLogin, registerClientSession } from "@/server/client-auth";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { emailHtml, mailConfigured, queueEmail, queueNotification } from "@/server/mail";

export const runtime = "nodejs";
const email = z.email().max(254);
const registration = z.object({ fullName: z.string().trim().min(2).max(120), email, phone: z.string().trim().min(5).max(40), password: z.string(), confirm: z.string() });
const credentials = z.object({ email, password: z.string().min(1) });
const resetRequest = z.object({ email });
const resetConfirm = z.object({ token: z.string().min(40).max(200), password: z.string(), confirm: z.string() });

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
  return failures;
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
    const verification = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { emailVerifiedAt: true, verificationRequired: true } });
    return json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status, emailVerified: !verification.verificationRequired || Boolean(verification.emailVerifiedAt) } });
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    checkOrigin(request);
    const { action } = await context.params;
    if (action === "register") {
      const input = registration.parse(await body(request));
      return registerClientSession(input);
    }
    if (action === "verify-email") {
      const input = z.object({ token: z.string().min(40).max(200) }).parse(await body(request));
      const record = await db.emailVerification.findUnique({ where: { tokenHash: hashToken(input.token) }, include: { user: true } });
      if (!record || record.usedAt || record.expiresAt <= new Date()) throw new ApiError(400, "Invalid or expired verification link");
      await db.$transaction(async (tx) => {
        const claimed = await tx.emailVerification.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
        if (!claimed.count) throw new ApiError(400, "Invalid or expired verification link");
        await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
        await tx.auditLog.create({ data: { actorUserId: record.userId, action: "EMAIL_VERIFIED", resourceType: "User", resourceId: record.userId } });
        await queueEmail(tx, `welcome:${record.userId}`, record.user.email, "Welcome to Apex Filings", emailHtml("Your account is ready", ["Your email address has been verified. You can continue your business formation in your dashboard."], { label: "Open dashboard", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/client/dashboard` }));
      });
      return json({ ok: true });
    }
    if (action === "resend-verification") {
      const user = await actor(request);
      const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      if (account.emailVerifiedAt) return json({ ok: true, message: "Email already verified" });
      if (process.env.NODE_ENV === "production" && !mailConfigured()) throw new ApiError(503, "Account email delivery is not configured");
      const key = await throttle(account.email, "verify");
      const recent = await db.emailVerification.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
      if (recent) throw new ApiError(429, "Please wait before requesting another email");
      const token = randomToken();
      await db.$transaction(async (tx) => {
        const record = await tx.emailVerification.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } });
        await queueEmail(tx, `verify:${user.id}:${record.id}`, account.email, "Verify your email — Apex Filings", emailHtml("Verify your email", ["Confirm your email address to activate your Apex Filings account. This link expires in 24 hours."], { label: "Verify email", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/verify-email?token=${encodeURIComponent(token)}` }));
      });
      await db.authThrottle.deleteMany({ where: { key } });
      return json({ ok: true, message: "A new verification link has been queued" });
    }
    if (action === "change-password") {
      const user = await actor(request);
      const input = z.object({ currentPassword: z.string().min(1), password: z.string(), confirm: z.string() }).parse(await body(request));
      const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!account.passwordHash || !(await verifyPassword(account.passwordHash, input.currentPassword))) throw new ApiError(403, "Current password is incorrect");
      if (input.password !== input.confirm || !passwordStrong(input.password)) throw new ApiError(400, "Password does not meet requirements");
      const passwordHash = await hashPassword(input.password);
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
        await tx.session.updateMany({ where: { userId: user.id, tokenHash: { not: hashToken(request.cookies.get(cookieName)?.value ?? "") }, revokedAt: null }, data: { revokedAt: new Date() } });
        const event = await tx.securityEvent.create({ data: { userId: user.id, type: "PASSWORD_CHANGED" } });
        await queueNotification(tx, `password-changed:${event.id}`, user.id, "SECURITY", "Password changed", "Your account password was changed.");
        await queueEmail(tx, `password-changed:${event.id}`, account.email, "Your Apex Filings password changed", emailHtml("Password changed", ["Your account password was changed. Other sessions were signed out.", "If this was not you, contact our team immediately."]));
      });
      return json({ ok: true });
    }
    if (action === "request-email-change") {
      const user = await actor(request);
      const input = z.object({ newEmail: email, password: z.string().min(1) }).parse(await body(request));
      const normalized = normalizeEmail(input.newEmail);
      const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!account.passwordHash || !(await verifyPassword(account.passwordHash, input.password))) throw new ApiError(403, "Current password is incorrect");
      if (normalized === account.emailNormalized || await db.user.findUnique({ where: { emailNormalized: normalized } })) throw new ApiError(409, "Email address is unavailable");
      if (process.env.NODE_ENV === "production" && !mailConfigured()) throw new ApiError(503, "Account email delivery is not configured");
      const token = randomToken();
      await db.$transaction(async (tx) => {
        const change = await tx.emailChange.create({ data: { userId: user.id, tokenHash: hashToken(token), newEmail: input.newEmail.trim(), newEmailNormalized: normalized, expiresAt: new Date(Date.now() + 30 * 60_000) } });
        await queueEmail(tx, `email-change-request:${change.id}`, normalized, "Confirm your new email — Apex Filings", emailHtml("Confirm your new email", ["Use this link to confirm your new Apex Filings email address. The link expires in 30 minutes."], { label: "Confirm email", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/confirm-email-change?token=${encodeURIComponent(token)}` }));
      });
      return json({ ok: true, message: "Confirmation email queued for the new address" });
    }
    if (action === "confirm-email-change") {
      const input = z.object({ token: z.string().min(40).max(200) }).parse(await body(request));
      const change = await db.emailChange.findUnique({ where: { tokenHash: hashToken(input.token) }, include: { user: true } });
      if (!change || change.usedAt || change.expiresAt <= new Date()) throw new ApiError(400, "Invalid or expired email change link");
      if (await db.user.findUnique({ where: { emailNormalized: change.newEmailNormalized } })) throw new ApiError(409, "Email address is unavailable");
      await db.$transaction(async (tx) => {
        const claimed = await tx.emailChange.updateMany({ where: { id: change.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
        if (!claimed.count) throw new ApiError(400, "Invalid or expired email change link");
        await tx.user.update({ where: { id: change.userId }, data: { email: change.newEmail, emailNormalized: change.newEmailNormalized, emailVerifiedAt: new Date() } });
        await tx.session.updateMany({ where: { userId: change.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.auditLog.create({ data: { actorUserId: change.userId, action: "EMAIL_CHANGED", resourceType: "User", resourceId: change.userId } });
        await queueEmail(tx, `email-changed:${change.id}:old`, change.user.email, "Apex Filings email address changed", emailHtml("Email address changed", ["The email address on your account was changed. If this was not you, contact our team immediately."]));
        await queueEmail(tx, `email-changed:${change.id}:new`, change.newEmail, "Apex Filings email address changed", emailHtml("Email address changed", ["Your new email address was confirmed. Sign in again to continue."]));
      });
      return json({ ok: true });
    }
    if (action === "login") {
      const input = credentials.parse(await body(request));
      const key = await throttle(input.email);
      const user = await db.user.findUnique({ where: { emailNormalized: normalizeEmail(input.email) } });
      if (!user || user.status !== "ACTIVE" || !user.passwordHash || !(await verifyPassword(user.passwordHash, input.password))) {
        const failures = await loginFailure(key);
        if (user && failures === 8) await db.$transaction(async (tx) => {
          const event = await tx.securityEvent.create({ data: { userId: user.id, type: "LOGIN_THROTTLED" } });
          await queueNotification(tx, `login-throttled:${event.id}`, user.id, "SECURITY", "Sign-in attempts blocked", "Several unsuccessful sign-in attempts were detected. New attempts are temporarily blocked.");
          await queueEmail(tx, `login-throttled:${event.id}`, user.email, "Unusual sign-in activity — Apex Filings", emailHtml("Sign-in attempts blocked", ["Several unsuccessful sign-in attempts were detected on your account. New attempts are temporarily blocked.", "If this was not you, reset your password and contact our team."]));
        });
        throw new ApiError(401, "Invalid email or password");
      }
      await db.authThrottle.deleteMany({ where: { key } });
      if (user.role !== "OWNER" && user.role !== "CLIENT") throw new ApiError(403, "This account cannot access the current dashboard");
      const response = await makeSession(user.id, user.role);
      const device = await recordLogin(user.id, request.cookies.get(deviceCookieName)?.value);
      response.cookies.set(deviceCookieName, device, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
      return response;
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
      if (user && (mailConfigured() || (process.env.NODE_ENV !== "production" && process.env.RESET_DELIVERY === "development-file"))) {
        const token = randomToken();
        await db.$transaction(async (tx) => {
          const reset = await tx.passwordReset.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
          if (mailConfigured()) await queueEmail(tx, `password-reset:${reset.id}`, normalized, "Reset your Apex Filings password", emailHtml("Reset your password", ["A password reset was requested for your account. This link expires in 30 minutes. If you did not request it, you can ignore this email."], { label: "Reset password", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/reset-password?token=${encodeURIComponent(token)}` }));
        });
        await deliverReset(normalized, token);
      }
      await loginFailure(key);
      return json({ ok: true, message: "If the account exists, reset instructions have been queued when email delivery is configured." });
    }
    if (action === "reset-password") {
      const input = resetConfirm.parse(await body(request));
      if (input.password !== input.confirm || !passwordStrong(input.password)) throw new ApiError(400, "Password does not meet requirements");
      const reset = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(input.token) } });
      if (!reset || reset.usedAt || reset.expiresAt <= new Date()) throw new ApiError(400, "Invalid or expired reset link");
      await db.$transaction(async (tx) => {
        const claimed = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
        if (claimed.count !== 1) throw new ApiError(400, "Invalid or expired reset link");
        const changedUser = await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(input.password) } });
        await tx.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.auditLog.create({ data: { actorUserId: reset.userId, action: "PASSWORD_RESET", resourceType: "User", resourceId: reset.userId } });
        await queueNotification(tx, `password-changed:${reset.id}`, reset.userId, "PASSWORD_CHANGED", "Password changed", "Your account password was changed.");
        if (mailConfigured()) await queueEmail(tx, `password-changed:${reset.id}`, changedUser.email, "Your Apex Filings password changed", emailHtml("Password changed", ["Your account password was changed. If this was not you, contact our team immediately."]));
      });
      return json({ ok: true, resetAt: date(new Date()) });
    }
    throw new ApiError(404, "Not found");
  } catch (error) { return handleError(error); }
}
