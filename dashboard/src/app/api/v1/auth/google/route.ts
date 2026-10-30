import { NextRequest, NextResponse } from "next/server";
import * as oidc from "openid-client";
import { db } from "@/server/db";
import { actor, ApiError, handleError } from "@/server/http";
import { deviceCookieName, makeSession, recordLogin } from "@/server/client-auth";
import { hashToken, normalizeEmail } from "@/server/security";
import { safeApplicationReturn } from "@/lib/application-return";

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
  try {
    const { clientId, clientSecret, origin, callback } = settings();
    const incoming = request.nextUrl.searchParams;
    const isCallback = incoming.has("code") || incoming.has("error") || incoming.has("state");
    let state: string | null = null;
    if (isCallback) {
      state = incoming.get("state");
      const cookieState = request.cookies.get(stateCookie)?.value;
      if (!state || !cookieState || state !== cookieState || incoming.has("error") || !incoming.has("code")) throw new ApiError(400, "Google sign-in was cancelled or expired");
    }
    const config = await oidc.discovery(new URL("https://accounts.google.com"), clientId, clientSecret);
    if (!isCallback) {
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      const verifier = oidc.randomPKCECodeVerifier();
      const challenge = await oidc.calculatePKCECodeChallenge(verifier);
      const nextPath = safeApplicationReturn(incoming.get("next"));
      let userId: string | null = null;
      if (incoming.get("link") === "1") userId = (await actor(request)).id;
      await db.oAuthAttempt.create({ data: { stateHash: hashToken(state), nonce, verifier, userId, nextPath, expiresAt: new Date(Date.now() + 10 * 60_000) } });
      const redirectTo = oidc.buildAuthorizationUrl(config, { redirect_uri: callback, scope: "openid email profile", response_type: "code", state, nonce, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" });
      const response = NextResponse.redirect(redirectTo);
      response.cookies.set(stateCookie, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
      return response;
    }
    const verifiedState = state!;
    const attempt = await db.oAuthAttempt.findUnique({ where: { stateHash: hashToken(verifiedState) } });
    if (!attempt || attempt.expiresAt <= new Date()) throw new ApiError(400, "Google sign-in expired");
    const callbackUrl = new URL(`${callback}${request.nextUrl.search}`);
    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, { pkceCodeVerifier: attempt.verifier, expectedState: verifiedState, expectedNonce: attempt.nonce, idTokenExpected: true });
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
        await db.googleAccount.create({ data: { userId: current.id, subject: claims.sub } });
        user = await db.user.findUniqueOrThrow({ where: { id: current.id } });
      }
    } else if (!user) {
      if (await db.user.findUnique({ where: { emailNormalized: normalized } })) throw new ApiError(409, "An account already uses this email. Sign in with your password and link Google from account settings.");
      user = await db.user.create({ data: { fullName: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 120) : normalized.split("@")[0], email: normalized, emailNormalized: normalized, emailVerifiedAt: new Date(), role: "CLIENT", googleAccounts: { create: { subject: claims.sub } } } });
      await db.auditLog.create({ data: { actorUserId: user.id, action: "GOOGLE_ACCOUNT_REGISTERED", resourceType: "User", resourceId: user.id } });
    }
    if (user.status !== "ACTIVE" || !["OWNER", "CLIENT"].includes(user.role)) throw new ApiError(403, "This account cannot sign in");
    const response = attempt.userId ? NextResponse.redirect(`${origin}/${user.role === "OWNER" ? "admin/settings" : "client/profile"}`) : NextResponse.redirect(new URL(user.role === "OWNER" ? "/admin/dashboard" : attempt.nextPath ?? "/client/dashboard", origin));
    if (!attempt.userId) {
      const session = await makeSession(user.id, user.role as "OWNER" | "CLIENT");
      const authCookie = session.cookies.get(process.env.NODE_ENV === "production" ? "__Host-apex_session" : "apex_session");
      if (authCookie) response.cookies.set(authCookie);
      const device = await recordLogin(user.id, request.cookies.get(deviceCookieName)?.value);
      response.cookies.set(deviceCookieName, device, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    response.cookies.set(stateCookie, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return handleError(error); }
}
