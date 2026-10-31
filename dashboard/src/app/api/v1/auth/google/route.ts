import { NextRequest, NextResponse } from "next/server";
import * as oidc from "openid-client";
import { db } from "@/server/db";
import { actor, ApiError, handleError } from "@/server/http";
import { deviceCookieName, makeSession, recordLogin } from "@/server/client-auth";
import { hashToken, normalizeEmail } from "@/server/security";
import { safeApplicationReturn } from "@/lib/application-return";
import { googleOAuthErrorCode } from "@/lib/google-oauth-feedback";
import { emailHtml, queueEmail, queueNotification } from "@/server/mail";

export const runtime = "nodejs";
const stateCookie = process.env.NODE_ENV === "production" ? "__Host-apex_google_state" : "apex_google_state";

function settings() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = process.env.APP_ORIGIN;
  if (!clientId || !clientSecret || !origin) throw new ApiError(503, "Google sign-in is not configured");
  let url: URL;
  try { url = new URL(origin); } catch { throw new ApiError(503, "Google sign-in origin is invalid"); }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local && url.protocol === "http:")) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new ApiError(503, "Google sign-in origin is invalid");
  }
  return { clientId, clientSecret, origin: url.origin, callback: `${url.origin}/api/v1/auth/google` };
}

export async function GET(request: NextRequest) {
  let origin: string | null = null;
  let nextPath: string | null = null;
  let linkUserId: string | null = null;
  let validatedState: string | null = null;
  try {
    const incoming = request.nextUrl.searchParams;
    const isCallback = incoming.has("code") || incoming.has("error") || incoming.has("state");
    if (!isCallback) nextPath = safeApplicationReturn(incoming.get("next"));
    const configured = settings();
    const { clientId, clientSecret, callback } = configured;
    origin = configured.origin;
    if (!isCallback) {
      const config = await oidc.discovery(new URL("https://accounts.google.com"), clientId, clientSecret);
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      const verifier = oidc.randomPKCECodeVerifier();
      const challenge = await oidc.calculatePKCECodeChallenge(verifier);
      let userId: string | null = null;
      if (incoming.get("link") === "1") userId = (await actor(request)).id;
      await db.oAuthAttempt.create({ data: { stateHash: hashToken(state), nonce, verifier, userId, nextPath, expiresAt: new Date(Date.now() + 10 * 60_000) } });
      const redirectTo = oidc.buildAuthorizationUrl(config, { redirect_uri: callback, scope: "openid email profile", response_type: "code", state, nonce, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" });
      const response = NextResponse.redirect(redirectTo);
      response.cookies.set(stateCookie, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
      return response;
    }
    const state = incoming.get("state");
    const cookieState = request.cookies.get(stateCookie)?.value;
    if (!state || !cookieState || state !== cookieState) throw new ApiError(400, "Google sign-in expired");
    validatedState = state;
    const attempt = await db.oAuthAttempt.findUnique({ where: { stateHash: hashToken(state) } });
    if (!attempt || attempt.expiresAt <= new Date()) throw new ApiError(400, "Google sign-in expired");
    nextPath = safeApplicationReturn(attempt.nextPath);
    linkUserId = attempt.userId;
    if (incoming.has("error")) {
      await db.oAuthAttempt.deleteMany({ where: { stateHash: attempt.stateHash } });
      throw new ApiError(400, "Google sign-in was cancelled");
    }
    if (!incoming.has("code")) throw new ApiError(400, "Google sign-in expired");
    const config = await oidc.discovery(new URL("https://accounts.google.com"), clientId, clientSecret);
    const callbackUrl = new URL(`${callback}${request.nextUrl.search}`);
    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, { pkceCodeVerifier: attempt.verifier, expectedState: state, expectedNonce: attempt.nonce, idTokenExpected: true });
    const claims = tokens.claims();
    if (!claims?.sub || typeof claims.email !== "string" || claims.email_verified !== true) throw new ApiError(403, "A verified Google email is required");
    const removed = await db.oAuthAttempt.deleteMany({ where: { stateHash: attempt.stateHash, expiresAt: { gt: new Date() } } });
    if (!removed.count) throw new ApiError(400, "Google sign-in was already used");
    const normalized = normalizeEmail(claims.email);
    let user = await db.user.findFirst({ where: { googleAccounts: { some: { subject: claims.sub } } } });
    if (attempt.userId) {
      const current = await actor(request);
      if (current.id !== attempt.userId) throw new ApiError(403, "Account linking session expired");
      if (user && user.id !== current.id) throw new ApiError(409, "This Google account is linked elsewhere");
      if (normalizeEmail(current.email) !== normalized) throw new ApiError(409, "Google email must match your account email to link it");
      if (!user) {
        await db.$transaction(async (tx) => {
          await tx.googleAccount.create({ data: { userId: current.id, subject: claims.sub } });
          await queueNotification(tx, `google-linked:${current.id}:${claims.sub}`, current.id, "SECURITY", "Google account connected", "A Google account was connected to your Apex Filings sign-in.");
          await queueEmail(tx, `google-linked:${current.id}:${claims.sub}`, current.email, "Google account connected — Apex Filings", emailHtml("Google account connected", ["A Google account was connected to your Apex Filings account.", "If this was not you, reset your password and contact our team."], { label: "Account settings", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/${current.role === "OWNER" ? "admin/settings" : "client/settings"}` }));
        });
        user = await db.user.findUniqueOrThrow({ where: { id: current.id } });
      }
      // Linking requires an authenticated session and a matching verified Google email.
      // That verified claim also proves control of the mailbox for a pending OTP account.
      if (!user.emailVerifiedAt) user = await db.user.update({ where: { id: current.id }, data: { emailVerifiedAt: new Date() } });
    } else if (!user) {
      const existing = await db.user.findUnique({ where: { emailNormalized: normalized } });
      if (existing?.passwordHash) throw new ApiError(409, "An account already uses this email. Sign in with your password and link Google from account settings.");
      if (existing) throw new ApiError(409, "This email belongs to a different account");
      user = await db.$transaction(async (tx) => {
        const created = await tx.user.create({ data: { fullName: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 120) : normalized.split("@")[0], email: normalized, emailNormalized: normalized, emailVerifiedAt: new Date(), role: "CLIENT", googleAccounts: { create: { subject: claims.sub } } } });
        await tx.auditLog.create({ data: { actorUserId: created.id, action: "GOOGLE_ACCOUNT_REGISTERED", resourceType: "User", resourceId: created.id } });
        await queueEmail(tx, `welcome:${created.id}`, created.email, "Welcome to Apex Filings", emailHtml("Your account is ready", ["Your Google email was verified. You can continue in your dashboard."], { label: "Open dashboard", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/client/dashboard` }));
        const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
        for (const owner of owners) await queueNotification(tx, `registration:${created.id}:${owner.id}`, owner.id, "NEW_REGISTRATION", "New client registered", `${created.fullName} created a client account.`, created.id);
        if (process.env.ADMIN_NOTIFICATION_EMAIL) await queueEmail(tx, `registration:${created.id}:admin`, process.env.ADMIN_NOTIFICATION_EMAIL, "New client registration — Apex Filings", emailHtml("New client registration", [`Client reference: ${created.id}`, "The customer signed up using a verified Google email."], { label: "View client", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/admin/clients/${created.id}` }));
        return created;
      });
    }
    if (user && !user.emailVerifiedAt && normalizeEmail(user.email) === normalized) {
      user = await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }
    if (user.status !== "ACTIVE" || !["OWNER", "CLIENT"].includes(user.role)) throw new ApiError(403, "This account cannot sign in");
    const response = attempt.userId ? NextResponse.redirect(`${origin}/${user.role === "OWNER" ? "admin/settings" : "client/profile"}`) : NextResponse.redirect(new URL(user.role === "OWNER" ? "/admin/dashboard" : nextPath ?? "/client/dashboard", origin));
    if (!attempt.userId) {
      const session = await makeSession(user.id, user.role as "OWNER" | "CLIENT");
      const authCookie = session.cookies.get(process.env.NODE_ENV === "production" ? "__Host-apex_session" : "apex_session");
      if (authCookie) response.cookies.set(authCookie);
      const device = await recordLogin(user.id, request.cookies.get(deviceCookieName)?.value);
      response.cookies.set(deviceCookieName, device, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    response.cookies.set(stateCookie, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    // Browser navigation must never display raw API errors or provider details.
    if (!(error instanceof ApiError)) void handleError(error);
    const code = error instanceof ApiError ? googleOAuthErrorCode(error.status, error.message) : "failed";
    const targetOrigin = origin ?? request.nextUrl.origin;
    let destination = "/login";
    if (linkUserId) {
      try {
        const current = await actor(request);
        if (current.id === linkUserId) destination = current.role === "OWNER" ? "/admin/settings" : "/client/profile";
      } catch { /* Expired account-linking sessions return to login. */ }
    }
    const redirectTo = new URL(destination, targetOrigin);
    redirectTo.searchParams.set("oauth_error", code);
    if (destination === "/login" && nextPath) redirectTo.searchParams.set("next", nextPath);
    const response = NextResponse.redirect(redirectTo);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    if (validatedState) response.cookies.set(stateCookie, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  }
}
