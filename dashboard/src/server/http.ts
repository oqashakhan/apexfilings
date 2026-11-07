import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { ZodError } from "zod";
import { Prisma, Role, type User } from "@prisma/client";
import { db } from "@/server/db";
import { hashToken } from "@/server/security";

const apiErrorBrand: unique symbol = Symbol.for("apex.api-error");

export class ApiError extends Error {
  readonly [apiErrorBrand] = true;
  constructor(public status: number, message: string) { super(message); }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
export const fail = (message: string, status: number) => json({ error: message }, status);
export function handleError(error: unknown) {
  if (error instanceof ApiError || (error instanceof Error && (error as ApiError)[apiErrorBrand] === true && Number.isInteger((error as ApiError).status))) return fail(error.message, (error as ApiError).status);
  if (error instanceof ZodError) return json({ error: "Invalid request", issues: error.issues.map((item) => ({ path: item.path, message: item.message })) }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("This request has already been completed", 409);
  // Never return database, filesystem, token, or customer details in an error response.
  const errorId = randomBytes(6).toString("hex");
  const errorName = error instanceof Error ? error.name : "unknown";
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : undefined;
  console.error("API request failed", { errorId, errorName, code });
  return json({ error: "Request could not be completed", errorId }, 500);
}

export function checkOrigin(request: NextRequest) {
  const configured = process.env.APP_ORIGIN;
  if (process.env.NODE_ENV === "production" && !configured) throw new ApiError(503, "Server is not configured");
  const expected = configured ?? new URL(request.url).origin;
  if (request.headers.get("origin") !== expected) throw new ApiError(403, "Invalid request origin");
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site)) throw new ApiError(403, "Cross-site request blocked");
}

export async function body(request: NextRequest, maxBytes = 65536): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) throw new ApiError(413, "Request too large");
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw new ApiError(413, "Request too large");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new ApiError(400, "Invalid JSON"); }
  if (parsed && typeof parsed === 'object' && Object.hasOwn(parsed, 'clientReference')) throw new ApiError(400, 'Client reference numbers are assigned automatically and cannot be changed.');
  return parsed;
}

export const cookieName = process.env.NODE_ENV === "production" ? "__Host-apex_session" : "apex_session";
export type Actor = Pick<User, "id" | "clientReference" | "fullName" | "email" | "role" | "status" | "verificationRequired" | "emailVerifiedAt">;

export async function actor(request: NextRequest): Promise<Actor> {
  const raw = request.cookies.get(cookieName)?.value;
  if (!raw || raw.length < 40) throw new ApiError(401, "Sign in required");
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") throw new ApiError(401, "Session expired");
  const { id, clientReference, fullName, email, role, status, verificationRequired, emailVerifiedAt } = session.user;
  return { id, clientReference, fullName, email, role, status, verificationRequired, emailVerifiedAt };
}

export function assertVerifiedClient(user: Actor) {
  if (user.role === "CLIENT" && user.verificationRequired && !user.emailVerifiedAt) throw new ApiError(403, "Verify your email address before continuing");
}

export async function requireRole(request: NextRequest, role: Role) {
  const user = await actor(request);
  if (user.role !== role) throw new ApiError(403, "Not authorized");
  if (role === "CLIENT") assertVerifiedClient(user);
  return user;
}

export const date = (value: Date | null | undefined) => value?.toISOString() ?? null;
