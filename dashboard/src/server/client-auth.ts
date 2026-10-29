import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError, cookieName, json } from "@/server/http";
import { hashPassword, hashToken, normalizeEmail, passwordStrong, randomToken } from "@/server/security";

export type ClientRegistration = { fullName: string; email: string; phone: string; password: string; confirm: string };
const sessionAge = 60 * 60 * 24 * 7;

export async function registerClientSession(input: ClientRegistration, auditMetadata?: Record<string, string>) {
  if (input.password !== input.confirm || !passwordStrong(input.password)) {
    throw new ApiError(400, "Use a matching password of 12–128 characters with a letter, number, and symbol");
  }
  const normalized = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const token = randomToken();
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { fullName: input.fullName, email: normalized, emailNormalized: normalized, phone: input.phone, passwordHash, role: "CLIENT" } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: "ACCOUNT_REGISTERED", resourceType: "User", resourceId: user.id, ...(auditMetadata ? { safeMetadata: auditMetadata } : {}) } });
      await tx.session.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + sessionAge * 1000) } });
    });
    const response = json({ ok: true, role: "CLIENT" });
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
