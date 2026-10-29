import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerClientSession } from "@/server/client-auth";
import { ApiError, body, checkOrigin, handleError, json, requireRole } from "@/server/http";
import { onboardingCookieName, onboardingCookieOptions, openOnboardingDetails, sealOnboardingDetails, validatedOnboardingDetails } from "@/server/onboarding-handoff";

export const runtime = "nodejs";
const registration = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().trim().min(5).max(40),
  password: z.string(),
  confirm: z.string(),
  acceptedTerms: z.literal(true),
  details: z.unknown(),
});

function publicOrigin(request: NextRequest) {
  const expected = process.env.PUBLIC_SITE_ORIGIN ?? (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
  if (!expected) throw new ApiError(503, "Onboarding is temporarily unavailable");
  if (request.headers.get("origin") !== expected) throw new ApiError(403, "Invalid request origin");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-site" && site !== "same-origin") throw new ApiError(403, "Cross-site request blocked");
  return expected;
}

function cors(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Vary", "Origin");
  return response;
}

export async function OPTIONS(request: NextRequest) {
  try {
    const origin = publicOrigin(request);
    const headers = request.headers.get("access-control-request-headers")?.toLowerCase() ?? "";
    if (request.headers.get("access-control-request-method") !== "POST" || (headers && headers !== "content-type")) throw new ApiError(403, "Invalid preflight request");
    const response = new NextResponse(null, { status: 204 });
    response.headers.set("Access-Control-Allow-Methods", "POST");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Access-Control-Max-Age", "600");
    return cors(response, origin);
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  let origin: string;
  try { origin = publicOrigin(request); } catch (error) { return handleError(error); }
  try {
    const { action } = await context.params;
    if (action !== "register" && action !== "prepare") throw new ApiError(404, "Not found");
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415, "JSON required");
    const raw = await body(request, 8192);
    if (action === "prepare") {
      const details = validatedOnboardingDetails(raw);
      const response = json({ ok: true });
      response.cookies.set(onboardingCookieName, sealOnboardingDetails(details), onboardingCookieOptions);
      return cors(response, origin);
    }
    const input = registration.parse(raw);
    const details = validatedOnboardingDetails(input.details);
    const sealed = sealOnboardingDetails(details);
    const response = await registerClientSession(input, { termsAcceptedAt: new Date().toISOString(), source: "public-onboarding" });
    response.cookies.set(onboardingCookieName, sealed, onboardingCookieOptions);
    return cors(response, origin);
  } catch (error) { return cors(handleError(error), origin); }
}

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    if ((await context.params).action !== "current") throw new ApiError(404, "Not found");
    await requireRole(request, "CLIENT");
    return json({ details: openOnboardingDetails(request.cookies.get(onboardingCookieName)?.value) });
  } catch (error) { return handleError(error); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    if ((await context.params).action !== "current") throw new ApiError(404, "Not found");
    checkOrigin(request);
    await requireRole(request, "CLIENT");
    const response = json({ ok: true });
    response.cookies.set(onboardingCookieName, "", { ...onboardingCookieOptions, maxAge: 0 });
    return response;
  } catch (error) { return handleError(error); }
}
