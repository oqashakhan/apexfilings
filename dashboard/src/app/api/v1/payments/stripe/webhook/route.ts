import { NextRequest } from "next/server";
import { ApiError, handleError, json } from "@/server/http";
import { stripeClient, stripeWebhookSecret } from "@/server/stripe-config";
import { processStripeEvent } from "@/server/stripe-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new ApiError(400, "Invalid Stripe signature");
    const payload = await request.text();
    if (Buffer.byteLength(payload) > 1024 * 1024) throw new ApiError(413, "Webhook too large");
    let event;
    try { event = stripeClient().stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret()); }
    catch { throw new ApiError(400, "Invalid Stripe signature"); }
    await processStripeEvent(event);
    return json({ received: true });
  } catch (error) { return handleError(error); }
}
