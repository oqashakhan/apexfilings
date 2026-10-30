import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError, cookieName, json } from "@/server/http";
import { hashPassword, hashToken, normalizeEmail, passwordStrong, randomToken } from "@/server/security";
import { emailHtml, mailConfigured, queueEmail, queueNotification } from "@/server/mail";

export type ClientRegistration = { fullName: string; email: string; phone: string; password: string; confirm: string };
const sessionAge = 60 * 60 * 24 * 7;

export async function registerClientSession(input: ClientRegistration, auditMetadata?: Record<string, string>) {
  const testOutbox = process.env.TEST_EMAIL_OUTBOX === "1" && /@(?:127\.0\.0\.1|localhost):\d+\/apex_dashboard_test(?:\?|$)/.test(process.env.DATABASE_URL ?? "");
  if (process.env.NODE_ENV === "production" && !mailConfigured() && !testOutbox) throw new ApiError(503, "Account email delivery is not configured");
  if (input.password !== input.confirm || !passwordStrong(input.password)) {
    throw new ApiError(400, "Use a matching password of 12–128 characters with a letter, number, and symbol");
  }
  const normalized = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const token = randomToken();
  const verificationToken = randomToken();
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { fullName: input.fullName, email: normalized, emailNormalized: normalized, phone: input.phone, passwordHash, role: "CLIENT", verificationRequired: true } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: "ACCOUNT_REGISTERED", resourceType: "User", resourceId: user.id, ...(auditMetadata ? { safeMetadata: auditMetadata } : {}) } });
      await tx.session.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + sessionAge * 1000) } });
      await tx.emailVerification.create({ data: { userId: user.id, tokenHash: hashToken(verificationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } });
      const link = `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/verify-email?token=${encodeURIComponent(verificationToken)}`;
      await queueEmail(tx, `verify:${user.id}:initial`, normalized, "Verify your email — Apex Filings", emailHtml("Verify your email", ["Confirm your email address to activate your Apex Filings account. This link expires in 24 hours."], { label: "Verify email", href: link }));
      const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
      for (const owner of owners) await queueNotification(tx, `registration:${user.id}:${owner.id}`, owner.id, "NEW_REGISTRATION", "New client registered", `${input.fullName} created a client account.`, user.id);
    });
    const response = json({ ok: true, role: "CLIENT", emailVerificationRequired: true, emailDeliveryConfigured: mailConfigured() });
    response.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionAge });
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiError(400, "Account could not be created. If you already have an account, please sign in.");
    throw error;
  }
}

export async function makeSession(userId: string, role: "OWNER" | "CLIENT") {
  const token = randomToken();
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + sessionAge * 1000) } });
  const response = json({ ok: true, role });
  response.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionAge });
  return response;
}

export const deviceCookieName = process.env.NODE_ENV === "production" ? "__Host-apex_device" : "apex_device";

export async function recordLogin(userId: string, knownDevice: string | undefined) {
  const raw = knownDevice && knownDevice.length >= 40 ? knownDevice : randomToken();
  const deviceHash = hashToken(raw);
  await db.$transaction(async (tx) => {
    const account = await tx.user.findUniqueOrThrow({ where: { id: userId }, include: { notificationPreference: true } });
    const trusted = await tx.trustedDevice.findUnique({ where: { userId_deviceHash: { userId, deviceHash } } });
    const event = await tx.securityEvent.create({ data: { userId, type: trusted ? "LOGIN" : "NEW_DEVICE_LOGIN", deviceHash } });
    if (trusted) await tx.trustedDevice.update({ where: { id: trusted.id }, data: { lastUsedAt: new Date() } });
    else await tx.trustedDevice.create({ data: { userId, deviceHash } });
    if (!trusted) await queueNotification(tx, `new-device:${event.id}`, userId, "SECURITY", "New device sign-in", "Your Apex Filings account was accessed from a new browser or device.");
    if (!trusted || account.notificationPreference?.everyLoginEmail) await queueEmail(tx, `login-alert:${event.id}`, account.email, trusted ? "Apex Filings sign-in alert" : "New device sign-in — Apex Filings", emailHtml(trusted ? "Account sign-in" : "New device sign-in", [trusted ? "Your account was signed into." : "Your Apex Filings account was signed into from a new browser or device.", "If this was not you, reset your password and contact our team."]));
  });
  return raw;
}
