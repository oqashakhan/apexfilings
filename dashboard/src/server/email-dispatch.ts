import "server-only";
import { Resend } from "resend";
import { db } from "@/server/db";
import { decryptOtpEmail } from "@/server/email-otp";
import { resendSender } from "@/server/email-from";

export type DispatchResult = "accepted" | "pending" | "expired";

export async function dispatchEmail(id: string): Promise<DispatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = resendSender(process.env.EMAIL_FROM);
  if (!apiKey || !from) return "pending";

  const item = await db.emailOutbox.findUnique({ where: { id } });
  if (!item) return "pending";
  if (item.status === "SENT" || item.status === "DELIVERED") return "accepted";
  if (item.status === "FAILED" || (item.status === "SENDING" && item.leaseUntil && item.leaseUntil > new Date())) return "pending";
  if (item.status === "QUEUED" && item.nextAttemptAt > new Date()) return "pending";

  if (item.eventKey.startsWith("verify-otp:")) {
    const verification = await db.emailVerification.findUnique({ where: { id: item.eventKey.slice("verify-otp:".length) }, select: { usedAt: true, expiresAt: true } });
    if (!verification || verification.usedAt || verification.expiresAt <= new Date()) {
      await db.emailOutbox.updateMany({ where: { id, status: item.status }, data: { status: "FAILED", lastError: "Verification code expired or was replaced", leaseUntil: null } });
      return "expired";
    }
  }

  const claimed = await db.emailOutbox.updateMany({ where: { id, status: item.status, attempts: item.attempts }, data: { status: "SENDING", attempts: { increment: 1 }, leaseUntil: new Date(Date.now() + 2 * 60_000) } });
  if (!claimed.count) return "pending";
  try {
    const testBaseUrl = process.env.TEST_EMAIL_OUTBOX === "1" && /@(?:127\.0\.0\.1|localhost):\d+\/apex_dashboard_test(?:\?|$)/.test(process.env.DATABASE_URL ?? "") ? process.env.TEST_RESEND_BASE_URL : undefined;
    const resend = new Resend(apiKey, testBaseUrl ? { baseUrl: testBaseUrl } : undefined);
    const { data, error } = await resend.emails.send({ from, to: [item.toEmail], subject: item.subject, html: decryptOtpEmail(item.html) }, { idempotencyKey: item.eventKey, signal: AbortSignal.timeout(8_000) });
    if (error || !data?.id) throw new Error(error?.name ?? "Delivery request failed");
    await db.emailOutbox.update({ where: { id }, data: { status: "SENT", providerId: data.id, sentAt: new Date(), leaseUntil: null, lastError: null } });
    return "accepted";
  } catch (error) {
    const attempts = item.attempts + 1;
    await db.emailOutbox.update({ where: { id }, data: { status: attempts >= 8 ? "FAILED" : "QUEUED", nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** (attempts - 1)) * 60_000), leaseUntil: null, lastError: error instanceof Error ? error.message.slice(0, 300) : "Delivery failed" } });
    return "pending";
  }
}
