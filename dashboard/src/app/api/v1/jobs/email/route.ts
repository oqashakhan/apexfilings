import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { json } from "@/server/http";
import { dispatchEmail } from "@/server/email-dispatch";
import { mailConfigured } from "@/server/mail";
import { queueOverdueInvoice } from '@/server/invoices';

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
  if (!mailConfigured()) return json({ error: "Email delivery is not configured" }, 503);
  const now = new Date();
  const overdue=await db.$queryRaw<{id:string}[]>`SELECT i.id FROM "Invoice" i WHERE i.lifecycle='ISSUED' AND i."dueAt"<${now}
    AND i."totalCents">COALESCE((SELECT SUM(p."amountCents") FROM "Payment" p WHERE p."orderId"=i."orderId" AND p."verifiedAt" IS NOT NULL AND p.status IN ('VERIFIED','REFUNDED','DISPUTED')),0)
    AND NOT EXISTS (SELECT 1 FROM "Notification" n WHERE n."eventKey" LIKE 'invoice-overdue:'||i.id||':%') ORDER BY i."dueAt" ASC LIMIT 10`;
  for(const invoice of overdue)await db.$transaction(tx=>queueOverdueInvoice(tx,invoice.id));
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
