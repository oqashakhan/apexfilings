import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { json } from "@/server/http";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.EMAIL_JOB_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return json({ error: "Email delivery is not configured" }, 503);
  const now = new Date();
  const pending = await db.emailOutbox.findMany({ where: { OR: [{ status: "QUEUED", nextAttemptAt: { lte: now } }, { status: "SENDING", leaseUntil: { lt: now } }] }, orderBy: { createdAt: "asc" }, take: 20 });
  let sent = 0;
  let failed = 0;
  for (const item of pending) {
    const lease = new Date(Date.now() + 2 * 60_000);
    const claimed = await db.emailOutbox.updateMany({ where: { id: item.id, status: item.status, attempts: item.attempts }, data: { status: "SENDING", attempts: { increment: 1 }, leaseUntil: lease } });
    if (!claimed.count) continue;
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": item.eventKey }, body: JSON.stringify({ from: `Apex Filings <${from}>`, to: [item.toEmail], subject: item.subject, html: item.html }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json() as { id?: string; message?: string };
      if (!response.ok || !result.id) throw new Error(`Resend returned ${response.status}: ${result.message ?? "delivery request failed"}`);
      await db.emailOutbox.update({ where: { id: item.id }, data: { status: "SENT", providerId: result.id, sentAt: new Date(), leaseUntil: null, lastError: null } });
      sent++;
    } catch (error) {
      const attempts = item.attempts + 1;
      await db.emailOutbox.update({ where: { id: item.id }, data: { status: attempts >= 8 ? "FAILED" : "QUEUED", nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000), leaseUntil: null, lastError: error instanceof Error ? error.message.slice(0, 300) : "Delivery failed" } });
      failed++;
    }
  }
  return json({ processed: sent + failed, sent, failed });
}
