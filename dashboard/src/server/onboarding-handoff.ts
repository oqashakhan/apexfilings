import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { formationStates } from "@/lib/formation-states";
import { ApiError } from "@/server/http";

export const onboardingCookieName = process.env.NODE_ENV === "production" ? "__Host-apex_onboarding" : "apex_onboarding";
export const onboardingMaxAge = 15 * 60;

const detailsSchema = z.object({
  businessType: z.literal("LLC"),
  country: z.string().regex(/^[A-Z]{2}$/),
  formationState: z.string().refine((value) => formationStates.some((state) => state === value)),
  preferredName: z.string().trim().min(2).max(150),
});
const sealedSchema = detailsSchema.extend({ version: z.literal(1), expiresAt: z.number().int() });
export type OnboardingDetails = z.infer<typeof detailsSchema>;

export function validatedOnboardingDetails(value: unknown): OnboardingDetails {
  const details = detailsSchema.parse(value);
  const region = new Intl.DisplayNames(["en"], { type: "region" }).of(details.country);
  if (!region || region === details.country) throw new ApiError(400, "Choose a valid country of residence");
  return details;
}

function key() {
  const encoded = process.env.ONBOARDING_HANDOFF_SECRET;
  const secret = encoded ? Buffer.from(encoded, "base64url") : Buffer.alloc(0);
  if (secret.length !== 32) throw new ApiError(503, "Onboarding is temporarily unavailable");
  return secret;
}

export function sealOnboardingDetails(details: OnboardingDetails): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const value = Buffer.from(JSON.stringify({ ...details, version: 1, expiresAt: Date.now() + onboardingMaxAge * 1000 }));
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function openOnboardingDetails(token: string | undefined): OnboardingDetails | null {
  if (!token || token.length > 2048) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const parsed = sealedSchema.parse(JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")));
    if (parsed.expiresAt <= Date.now()) return null;
    return validatedOnboardingDetails(parsed);
  } catch { return null; }
}

export const onboardingCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: onboardingMaxAge };
