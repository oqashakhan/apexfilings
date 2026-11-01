import "server-only";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { ApiError, cookieName, json } from "@/server/http";
import { hashPassword, hashToken, normalizeEmail, passwordStrong, randomToken } from "@/server/security";
import { emailHtml, mailConfigured, queueEmail, queueNotification } from "@/server/mail";
import { issueEmailOtp, otpDeliveryAvailable } from "@/server/email-otp";
import { dispatchEmail } from "@/server/email-dispatch";
import { limitRegistration } from "@/server/email-rate-limit";

export type ClientRegistration = { fullName: string; email: string; phone: string; password: string; confirm: string };
const sessionAge = 60 * 60 * 24 * 7;

export async function registerClientSession(input: ClientRegistration, request: NextRequest, auditMetadata?: Record<string, string>) {
  otpDeliveryAvailable();
  await limitRegistration(request, input.email);
  if (input.password !== input.confirm || !passwordStrong(input.password)) {
    throw new ApiError(400, "Use a matching password of 12–128 characters with a letter, number, and symbol");
  }
  const normalized = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const token = randomToken();
  try {
    const outboxId = await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { fullName: input.fullName, email: normalized, emailNormalized: normalized, phone: input.phone, passwordHash, role: "CLIENT", verificationRequired: true } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: "ACCOUNT_REGISTERED", resourceType: "User", resourceId: user.id, ...(auditMetadata ? { safeMetadata: auditMetadata } : {}) } });
      await tx.session.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + sessionAge * 1000) } });
      const verification = await issueEmailOtp(tx, user.id, normalized);
      const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
      for (const owner of owners) await queueNotification(tx, `registration:${user.id}:${owner.id}`, owner.id, "NEW_REGISTRATION", "New client registered", `${input.fullName} created a client account.`, user.id);
      if (process.env.ADMIN_NOTIFICATION_EMAIL) await queueEmail(tx, `registration:${user.id}:admin`, process.env.ADMIN_NOTIFICATION_EMAIL, "New client registration — Apex Filings", emailHtml("New client registration", ["A customer created an account and must verify their email before continuing.", `Client reference: ${user.id}`], { label: "View client", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/admin/clients/${user.id}` }));
      return verification.outboxId;
    });
    let emailDeliveryStatus: "accepted" | "unconfirmed" = "unconfirmed";
    try { if ((await dispatchEmail(outboxId)) === "accepted") emailDeliveryStatus = "accepted"; } catch { /* The pending account and outbox remain available for retry. */ }
    const response = json({ ok: true, role: "CLIENT", emailVerificationRequired: true, emailDeliveryConfigured: mailConfigured(), emailDeliveryStatus }, emailDeliveryStatus === "accepted" ? 200 : 202);
    response.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionAge });
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return json({ error: "Account could not be created. If you already have an account, please sign in." }, 400);
    throw error;
  }
}

export async function makeSession(userId: string, role: "OWNER" | "CLIENT", emailVerificationRequired = false) {
  const token = randomToken();
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + sessionAge * 1000) } });
  const response = json({ ok: true, role, emailVerificationRequired });
  response.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionAge });
  return response;
}

export const deviceCookieName = process.env.NODE_ENV === "production" ? "__Host-apex_device" : "apex_device";

export async function recordLogin(userId: string, knownDevice: string | undefined, request: NextRequest) {
  const raw = knownDevice && knownDevice.length >= 40 ? knownDevice : randomToken();
  const deviceHash = hashToken(raw);
  await db.$transaction(async (tx) => {
    const account = await tx.user.findUniqueOrThrow({ where: { id: userId }, include: { notificationPreference: true } });
    const trusted = await tx.trustedDevice.findUnique({ where: { userId_deviceHash: { userId, deviceHash } } });
    const event = await tx.securityEvent.create({ data: { userId, type: trusted ? "LOGIN" : "NEW_DEVICE_LOGIN", deviceHash } });
    if (trusted) await tx.trustedDevice.update({ where: { id: trusted.id }, data: { lastUsedAt: new Date() } });
    else await tx.trustedDevice.create({ data: { userId, deviceHash } });
    if (!trusted) await queueNotification(tx, `new-device:${event.id}`, userId, "SECURITY", "New device sign-in", "Your Apex Filings account was accessed from a new browser or device.");
    if (!trusted || account.notificationPreference?.everyLoginEmail) {
      const agent = request.headers.get("user-agent") ?? "";
      const browser = /Edg\//.test(agent) ? "Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : "Unknown browser";
      const platform = /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Windows/.test(agent) ? "Windows" : /Mac OS/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : "Unknown device";
      const when = new Date().toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" });
      await queueEmail(tx, `login-alert:${event.id}`, account.email, "New Sign-In to Your Apex Filings Account", emailHtml("New sign-in to your account", [`Hello ${account.fullName},`, `Sign-in time: ${when} UTC`, `Device: ${platform} · ${browser}`, trusted ? "This was a sign-in from a previously used browser." : "This appears to be a new browser or device.", "If this was not you, reset your password and contact our team."], { label: "Review account security", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/${account.role === "OWNER" ? "admin" : "client"}/settings` }));
    }
  });
  return raw;
}
