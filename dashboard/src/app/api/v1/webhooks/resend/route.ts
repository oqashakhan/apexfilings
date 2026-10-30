import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { db } from "@/server/db";
import { json } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return json({ error: "Webhook is not configured" }, 503);
  let event: { type?: string; data?: { email_id?: string } };
  try {
    const raw = await request.text();
    event = new Webhook(secret).verify(raw, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    }) as typeof event;
  } catch { return json({ error: "Invalid webhook signature" }, 400); }
  const providerId = event.data?.email_id;
  if (!providerId) return json({ ok: true });
  if (event.type === "email.delivered") await db.emailOutbox.updateMany({ where: { providerId }, data: { status: "DELIVERED", deliveredAt: new Date() } });
  if (["email.bounced", "email.suppressed", "email.complained"].includes(event.type ?? "")) await db.emailOutbox.updateMany({ where: { providerId }, data: { status: "FAILED", lastError: `Resend reported ${event.type}` } });
  return json({ ok: true });
}
