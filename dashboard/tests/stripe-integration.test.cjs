/* eslint-disable @typescript-eslint/no-require-imports */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { randomBytes, createHash, createHmac } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const root = "http://localhost:3002";
const suffix = randomBytes(6).toString("hex");
let session;
let sessionCount=0;
let settingsBackup;
let invoice;
let refundCount = 0;
const refunds = new Map();
const stripeMock = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  const path = new URL(request.url, "http://127.0.0.1:3034").pathname;
  let result;
  if (request.method === "POST" && path === "/v1/customers") result = { id: `cus_${suffix}`, object: "customer", email: form.get("email") };
  else if (request.method === "POST" && path === "/v1/checkout/sessions") {
    const amount = [...form.entries()].filter(([key]) => key.endsWith("[unit_amount]")).reduce((sum, [, value]) => sum + Number(value), 0);
    session = { id: `cs_test_${suffix}_${++sessionCount}`, object: "checkout.session", url: `https://checkout.stripe.com/c/pay/${suffix}`, amount_total: amount, currency: "usd", livemode: false, status: "open", payment_status: "unpaid", expires_at: Math.floor(Date.now() / 1000) + 3600, metadata: { orderId: form.get("metadata[orderId]"), checkoutId: form.get("metadata[checkoutId]") }, client_reference_id: form.get("client_reference_id"), customer: form.get("customer"), payment_intent: `pi_${suffix}`, invoice: `in_${suffix}` };
    invoice = { id: session.invoice, object: "invoice", metadata: { orderId: session.client_reference_id }, livemode: false, status: "paid", amount_paid: amount, currency: "usd", number: `TEST-${suffix}`, hosted_invoice_url: `https://invoice.stripe.com/i/${suffix}`, invoice_pdf: `https://pay.stripe.com/invoice/${suffix}/pdf`, status_transitions: { paid_at: Math.floor(Date.now() / 1000) } };
    result = session;
  } else if (request.method === "GET" && path === `/v1/checkout/sessions/${session?.id}`) result = session;
  else if (request.method === "GET" && path === `/v1/payment_intents/pi_${suffix}`) result = { id: `pi_${suffix}`, object: "payment_intent", status: "succeeded", amount_received: session.amount_total, currency: "usd", metadata: { orderId: session.client_reference_id }, customer: session.customer, latest_charge: { id: `ch_${suffix}`, receipt_url: `https://pay.stripe.com/receipts/${suffix}` } };
  else if (request.method === "GET" && path === `/v1/invoices/in_${suffix}`) result = invoice;
  else if (request.method === "POST" && path === "/v1/refunds") {
    const id = `re_${suffix}_${++refundCount}`;
    result = { id, object: "refund", payment_intent: form.get("payment_intent"), amount: Number(form.get("amount")), status: "pending", metadata: { refundRequestId: form.get("metadata[refundRequestId]"), orderId: form.get("metadata[orderId]") } };
    refunds.set(id, result);
  } else if (request.method === "GET" && path.startsWith("/v1/refunds/")) result = refunds.get(path.split("/").pop());
  if (!result) { response.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: { type: "invalid_request_error", message: "Mock route missing" } })); return; }
  response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
});
before(async () => { settingsBackup=await db.invoiceSettings.findUnique({where:{id:"default"}});await new Promise((resolve) => stripeMock.listen(3034, "127.0.0.1", resolve)); });
after(async () => { await new Promise((resolve) => stripeMock.close(resolve));if(settingsBackup){const {id,...data}=settingsBackup;await db.invoiceSettings.upsert({where:{id},create:{id,...data},update:data});}else await db.invoiceSettings.deleteMany({where:{id:"default"}});await db.$disconnect(); });

const cookie = (token) => `__Host-apex_session=${token}`;
async function api(path, method, payload, token, signature) {
  const headers = { Origin: root, "Content-Type": "application/json" };
  if (token) headers.Cookie = cookie(token);
  if (signature) headers["Stripe-Signature"] = signature;
  const response = await fetch(root + path, { method, headers, body: typeof payload === "string" ? payload : payload === undefined ? undefined : JSON.stringify(payload) });
  return { status: response.status, data: await response.json() };
}
async function webhook(type, object, eventId) {
  const payload = JSON.stringify({ id: eventId, object: "event", type, livemode: false, data: { object } });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");
  return api("/api/v1/payments/stripe/webhook", "POST", payload, null, `t=${timestamp},v1=${signature}`);
}

test("Stripe Checkout and provider events preserve the order lifecycle", async () => {
  const service = await db.service.create({ data: { slug: `stripe-llc-${suffix}`, name: "Fictional LLC formation", category: "Formation", description: "Local test only", available: true } });
  const pack = await db.package.create({ data: { slug: `stripe-premium-${suffix}`, name: "Premium All-In", serviceFeeCents: 29900, available: true } });
  const client = await db.user.create({ data: { fullName: "Fictional Stripe Client", email: `stripe-${suffix}@example.test`, emailNormalized: `stripe-${suffix}@example.test`, role: "CLIENT", emailVerifiedAt: new Date() } });
  const stranger = await db.user.create({ data: { fullName: "Other Fictional Client", email: `stripe-other-${suffix}@example.test`, emailNormalized: `stripe-other-${suffix}@example.test`, role: "CLIENT", emailVerifiedAt: new Date() } });
  const owner = await db.user.create({ data: { fullName: "Fictional Owner", email: `stripe-owner-${suffix}@example.test`, emailNormalized: `stripe-owner-${suffix}@example.test`, role: "OWNER", emailVerifiedAt: new Date() } });
  async function sessionFor(user) { const token = randomBytes(40).toString("base64url"); await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } }); return token; }
  const clientToken = await sessionFor(client), strangerToken = await sessionFor(stranger), ownerToken = await sessionFor(owner);
  const seller={displayName:'Fictional Stripe Test Seller',legalName:'Fictional Test Business',address:'Fictional test address only',email:'billing@example.test',website:'https://example.test',taxDetails:'',prefix:'INV',footer:'Fictional integration test',termsDays:7,remindersEnabled:false,creditNotesEnabled:true};
  assert.equal((await api('/api/v1/invoices/settings','PATCH',{data:seller,approved:true,verifiedDetails:true},ownerToken)).status,200);
  const company = await db.company.create({ data: { customerId: client.id, preferredName: `Fictional Stripe Company ${suffix}`, formationState: "Wyoming", businessActivity: "Software", businessDescription: "Fictional test company" } });
  const application = await db.application.create({ data: { customerId: client.id, companyId: company.id, serviceId: service.id, packageId: pack.id, status: "AWAITING_PAYMENT", customerConfirmedAt: new Date(), submittedAt: new Date() } });
  const order = await db.order.create({ data: { applicationId: application.id, serviceFeeCents: pack.serviceFeeCents, governmentFeeCents: 10200, thirdPartyFeeCents: 0, additionalFeeCents: 0, discountCents: 0, totalCents: pack.serviceFeeCents + 10200, pricingSnapshot:{pricingComplete:true,totalCents:pack.serviceFeeCents+10200,taxCents:0,items:[{description:pack.name,amountCents:pack.serviceFeeCents},{description:'Government filing fee — Wyoming',amountCents:10200}]},items:{create:[{description:pack.name,amountCents:pack.serviceFeeCents},{description:'Government filing fee — Wyoming',amountCents:10200}]} } });
  const path = "/api/v1/payments/checkout";
  const forbiddenCheckout = await api(path, "POST", { orderId: order.id }, strangerToken);
  assert.equal(forbiddenCheckout.status, 404, `other customer cannot pay order: ${JSON.stringify(forbiddenCheckout.data)}`);
  const checkout = await api(path, "POST", { orderId: order.id }, clientToken);
  assert.equal(checkout.status, 200, JSON.stringify(checkout.data));
  const canonical=await db.invoice.findUniqueOrThrow({where:{orderId:order.id}});assert.equal(canonical.lifecycle,'ISSUED');assert.match(canonical.number,/^INV-/);const frozenSnapshot=canonical.snapshot;
  assert.match(checkout.data.url, /^https:\/\/checkout\.stripe\.com\//);
  assert.equal((await api(path, "POST", { orderId: order.id }, clientToken)).data.url, checkout.data.url, "duplicate checkout reuses session");
  assert.equal((await api(`/api/v1/admin/orders/${order.id}`, "PATCH", { governmentFeeCents: 10200, thirdPartyFeeCents: 0, additionalFeeCents: 0, discountCents: 0 }, ownerToken)).status, 409, "fees locked after Checkout starts");
  assert.equal((await api("/api/v1/admin/payments", "POST", { orderId: order.id, amountCents: order.totalCents, reference: "fictional-manual" }, ownerToken)).status, 409, "manual payment cannot overlap Stripe checkout");
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, "UNPAID", "checkout return is not payment proof");
  assert.equal((await api("/api/v1/payments/stripe/webhook", "POST", "{}", null, "t=1,v1=wrong")).status, 400, "invalid signature rejected");
  assert.equal(await db.paymentAttempt.count({where:{orderId:order.id}}),1,'session reuse retains one attempt');
  session.status='complete';
  assert.equal((await webhook('checkout.session.completed',{id:session.id},`evt_${suffix}_processing`)).status,200);
  assert.equal((await api(`/api/v1/invoices/${canonical.id}`,'GET',undefined,clientToken)).data.invoice.presentationStatus,'PROCESSING');
  assert.equal((await webhook('checkout.session.async_payment_failed',{id:session.id},`evt_${suffix}_failed`)).status,200);
  assert.equal((await db.paymentAttempt.findFirstOrThrow({where:{orderId:order.id}})).status,'FAILED');
  assert.equal((await api(`/api/v1/invoices/${canonical.id}`,'GET',undefined,clientToken)).data.invoice.presentationStatus,'FAILED');
  assert.equal((await api(path,'POST',{orderId:order.id},clientToken)).status,200,'failed attempt can retry');
  assert.equal(await db.paymentAttempt.count({where:{orderId:order.id}}),2,'retry preserves failed attempt');
  session.payment_status = "paid"; session.status = "complete";
  session.amount_total += 1;
  assert.equal((await webhook("checkout.session.completed", { id: session.id }, `evt_${suffix}_mismatch`)).status, 409, "wrong provider amount rejected");
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, "UNPAID");
  session.amount_total -= 1;
  const paid = await webhook("checkout.session.completed", { id: session.id }, `evt_${suffix}_paid`);
  assert.equal(paid.status, 200, JSON.stringify(paid.data));
  assert.equal(await db.paymentAttempt.count({where:{orderId:order.id,status:"PAID"}}),1);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, "VERIFIED");
  assert.equal((await db.application.findUniqueOrThrow({ where: { id: application.id } })).status, "PAYMENT_RECEIVED");
  assert.equal((await db.payment.count({ where: { orderId: order.id, method: "STRIPE" } })), 1);
  assert.equal((await db.notification.count({ where: { eventKey: `stripe-paid:pi_${suffix}:client` } })), 1, "client receives one payment notification");
  assert.equal((await db.emailOutbox.count({ where: { eventKey: `stripe-paid:pi_${suffix}:client` } })), 0, "canonical invoice replaces duplicate payment-confirmation email");
  const verifiedPayment=await db.payment.findFirstOrThrow({where:{orderId:order.id,method:'STRIPE'}});
  assert.equal(await db.emailOutbox.count({where:{eventKey:`invoice-payment:${verifiedPayment.id}`}}),1);
  assert.equal((await api(`/api/v1/invoices/${canonical.id}`,'GET',undefined,clientToken)).data.invoice.status,'PAID');
  assert.equal((await api(path, "POST", { orderId: order.id }, clientToken)).status, 409, "paid order cannot open another Checkout");
  assert.equal((await webhook("checkout.session.completed", { id: session.id }, `evt_${suffix}_paid`)).status, 200, "duplicate event accepted idempotently");
  assert.equal((await db.payment.count({ where: { orderId: order.id, method: "STRIPE" } })), 1);
  assert.equal((await webhook("invoice.paid", { id: invoice.id }, `evt_${suffix}_invoice`)).status, 200);
  assert.equal((await db.invoice.findUniqueOrThrow({ where: { orderId: order.id } })).stripeInvoiceId, invoice.id);
  assert.equal((await db.invoice.findUniqueOrThrow({where:{orderId:order.id}})).number,canonical.number,'Stripe number never replaces canonical number');
  assert.equal((await api(`/api/v1/client/orders/${order.id}`, "GET", undefined, strangerToken)).status, 404, "invoice is customer isolated");
  const ownOrder = await api(`/api/v1/client/orders/${order.id}`, "GET", undefined, clientToken);
  assert.equal(ownOrder.data.orders[0].payments[0].method, "STRIPE");
  assert.match(ownOrder.data.orders[0].invoice.hostedInvoiceUrl, /^https:\/\/invoice\.stripe\.com/);
  const dispute = { id: `dp_${suffix}`, object: "dispute", payment_intent: `pi_${suffix}`, status: "needs_response" };
  assert.equal((await webhook("charge.dispute.created", dispute, `evt_${suffix}_dispute`)).status, 200);
  assert.equal((await db.payment.findFirstOrThrow({ where: { orderId: order.id, method: "STRIPE" } })).stripeDisputeStatus, "needs_response");
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, "DISPUTED");
  assert.equal((await api("/api/v1/payments/refunds", "POST", { refundRequestId: "other", amountCents: 100 }, clientToken)).status, 403, "refund execution is owner only");
  const firstRefund = await db.refundRequest.create({ data: { orderId: order.id, reason: "Fictional partial refund test", status: "APPROVED", reviewedById: owner.id, reviewedAt: new Date() } });
  assert.equal((await api("/api/v1/payments/refunds", "POST", { refundRequestId: firstRefund.id, amountCents: 5000 }, ownerToken)).status, 409, "active dispute blocks refund");
  dispute.status = "won";
  assert.equal((await webhook("charge.dispute.closed", dispute, `evt_${suffix}_dispute_closed`)).status, 200);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, "VERIFIED");
  const partial = await api("/api/v1/payments/refunds", "POST", { refundRequestId: firstRefund.id, amountCents: 5000 }, ownerToken);
  assert.equal(partial.status, 200, JSON.stringify(partial.data));
  const stripeRefund = refunds.get((await db.refundRequest.findUniqueOrThrow({ where: { id: firstRefund.id } })).stripeRefundId);
  stripeRefund.status = "succeeded";
  assert.equal((await webhook("refund.updated", stripeRefund, `evt_${suffix}_partial`)).status, 200);
  assert.equal((await webhook("refund.updated", stripeRefund, `evt_${suffix}_partial_retry`)).status, 200, "refund retry is idempotent");
  assert.equal((await db.notification.count({ where: { eventKey: `stripe-refund:${stripeRefund.id}:succeeded` } })), 1);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, "VERIFIED", "partial refund leaves paid balance");
  const partialInvoice=(await api(`/api/v1/invoices/${canonical.id}`,'GET',undefined,clientToken)).data.invoice;assert.equal(partialInvoice.status,'PARTIALLY_REFUNDED');assert.equal(partialInvoice.refundedCents,5000);assert.equal(partialInvoice.balanceCents,0);
  assert.equal(await db.invoiceCreditNote.count({where:{invoiceId:canonical.id}}),1);
  const credit=await db.invoiceCreditNote.findFirstOrThrow({where:{invoiceId:canonical.id}});
  const creditPdf=await fetch(`${root}/api/v1/invoices/${canonical.id}/pdf?creditNoteId=${credit.id}`,{headers:{Cookie:cookie(clientToken)}});assert.equal(creditPdf.status,200);require('node:fs').writeFileSync('.local/invoice-credit-note.pdf',Buffer.from(await creditPdf.arrayBuffer()));
  assert.equal((await webhook('refund.updated',{...stripeRefund,status:'pending'},`evt_${suffix}_late_pending`)).status,200);assert.equal((await api(`/api/v1/invoices/${canonical.id}`,'GET',undefined,clientToken)).data.invoice.refundedCents,5000);

  const secondRefund = await db.refundRequest.create({ data: { orderId: order.id, reason: "Fictional remaining refund test", status: "APPROVED", reviewedById: owner.id, reviewedAt: new Date() } });
  const rest = order.totalCents - 5000;
  assert.equal((await api("/api/v1/payments/refunds", "POST", { refundRequestId: secondRefund.id, amountCents: rest + 1 }, ownerToken)).status, 409, "over-refund blocked");
  assert.equal((await api("/api/v1/payments/refunds", "POST", { refundRequestId: secondRefund.id, amountCents: rest }, ownerToken)).status, 200);
  const finalStripeRefund = refunds.get((await db.refundRequest.findUniqueOrThrow({ where: { id: secondRefund.id } })).stripeRefundId);
  finalStripeRefund.status = "succeeded";
  assert.equal((await webhook("refund.updated", finalStripeRefund, `evt_${suffix}_full`)).status, 200);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, "REFUNDED");
  const finalInvoice=(await api(`/api/v1/invoices/${canonical.id}`,'GET',undefined,clientToken)).data.invoice;assert.equal(finalInvoice.status,'REFUNDED');assert.equal(finalInvoice.balanceCents,0);assert.equal(finalInvoice.refundedCents,order.totalCents);assert.equal(await db.invoiceCreditNote.count({where:{invoiceId:canonical.id}}),2);assert.deepEqual(finalInvoice.snapshot,frozenSnapshot);assert.equal(finalInvoice.lifecycle,'ISSUED');
  assert.equal((await webhook('invoice.paid',{id:invoice.id},`evt_${suffix}_late_invoice`)).status,200);assert.equal((await api(`/api/v1/invoices/${canonical.id}`,'GET',undefined,clientToken)).data.invoice.status,'REFUNDED');

  assert.equal((await api("/api/v1/payments/reconcile", "POST", { orderId: order.id }, clientToken)).status, 403, "reconciliation is owner only");
});
