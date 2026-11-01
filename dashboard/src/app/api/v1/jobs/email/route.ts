import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { json } from "@/server/http";
import { dispatchEmail } from "@/server/email-dispatch";

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
  const pending = await db.emailOutbox.findMany({ where: { OR: [{ status: "QUEUED", nextAttemptAt: { lte: now } }, { status: "SENDING", leaseUntil: { lt: now } }] }, orderBy: { createdAt: "asc" }, take: 5 });
  let sent = 0;
  let failed = 0;
  for (const item of pending) {
    const result = await dispatchEmail(item.id);
    if (result === "accepted") sent++;
    else if (result === "pending" || result === "expired") failed++;
  }
  return json({ processed: sent + failed, sent, failed });
}
