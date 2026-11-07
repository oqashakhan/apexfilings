import "server-only";
import Stripe from "stripe";
import { ApiError } from "@/server/http";

export type StripeMode = "test" | "live";

export function stripeMode(): StripeMode {
  const mode = process.env.STRIPE_PAYMENT_MODE || "test";
  if (mode !== "test" && mode !== "live") throw new ApiError(503, "Stripe payment mode is not configured");
  return mode;
}

export function stripeClient() {
  const mode = stripeMode();
  const key = process.env.STRIPE_SECRET_KEY;
  if (mode === "live" && process.env.STRIPE_LIVE_PAYMENTS_ENABLED !== "true") throw new ApiError(503, "Live payments are not enabled");
  if (!key || !key.startsWith(mode === "live" ? "sk_live_" : "sk_test_")) throw new ApiError(503, "Stripe secret key is not configured for the selected mode");
  const localMock = process.env.TEST_STRIPE_BASE_URL;
  if (localMock) {
    const database = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
    const mock = new URL(localMock);
    if (mode !== "test" || process.env.TEST_EMAIL_OUTBOX !== "1" || !database || !["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/apex_dashboard_test" || !["localhost", "127.0.0.1"].includes(mock.hostname) || mock.protocol !== "http:") throw new ApiError(503, "Local Stripe test transport is not configured safely");
    return { stripe: new Stripe(key, { host: mock.hostname, port: Number(mock.port), protocol: "http" }), mode };
  }
  return { stripe: new Stripe(key), mode };
}

export function stripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) throw new ApiError(503, "Stripe webhook secret is not configured");
  return secret;
}

export function stripeAppOrigin() {
  const raw = process.env.APP_ORIGIN;
  if (!raw) throw new ApiError(503, "APP_ORIGIN is not configured");
  const url = new URL(raw);
  const localTest = process.env.TEST_EMAIL_OUTBOX === "1" && process.env.DATABASE_URL?.includes("/apex_dashboard_test") && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !localTest) throw new ApiError(503, "APP_ORIGIN must use HTTPS");
  if (!['https:', 'http:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) throw new ApiError(503, "APP_ORIGIN must be an origin URL");
  return url.origin;
}

export function checkoutAmounts(order: { serviceFeeCents: number; governmentFeeCents: number | null; thirdPartyFeeCents: number | null; additionalFeeCents: number | null; discountCents: number | null; totalCents: number | null; currency: string }, packageName: string) {
  const fields = [order.serviceFeeCents, order.governmentFeeCents, order.thirdPartyFeeCents, order.additionalFeeCents, order.discountCents, order.totalCents];
  if (fields.some((value) => value === null || !Number.isSafeInteger(value) || value! < 0) || order.currency !== "USD") throw new ApiError(409, "Order fees must be confirmed before checkout");
  const expected = order.serviceFeeCents + order.governmentFeeCents! + order.thirdPartyFeeCents! + order.additionalFeeCents! - order.discountCents!;
  if (expected !== order.totalCents || expected < 50) throw new ApiError(409, "Order total needs review before checkout");
  let discount = order.discountCents!;
  const parts = [
    { name: packageName, amount: order.serviceFeeCents },
    { name: "State filing fee", amount: order.governmentFeeCents! },
    { name: "Third-party fees", amount: order.thirdPartyFeeCents! },
    { name: "Additional services", amount: order.additionalFeeCents! },
  ].map((part) => { const reduction = Math.min(part.amount, discount); discount -= reduction; return { ...part, amount: part.amount - reduction, reduction }; });
  if (discount) throw new ApiError(409, "Discount exceeds order fees");
  return parts.filter((part) => part.amount > 0).map((part) => ({ price_data: { currency: "usd", product_data: { name: part.reduction ? `${part.name} (discount applied)` : part.name }, unit_amount: part.amount }, quantity: 1 })) satisfies Stripe.Checkout.SessionCreateParams.LineItem[];
}
