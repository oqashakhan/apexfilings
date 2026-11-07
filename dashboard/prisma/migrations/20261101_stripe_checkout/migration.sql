ALTER TABLE "Invoice" ADD COLUMN "stripeInvoiceId" TEXT, ADD COLUMN "hostedInvoiceUrl" TEXT, ADD COLUMN "invoicePdfUrl" TEXT;
ALTER TABLE "ApplicationStatusHistory" DROP CONSTRAINT "ApplicationStatusHistory_changedById_fkey";
ALTER TABLE "ApplicationStatusHistory" ALTER COLUMN "changedById" DROP NOT NULL;
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");
ALTER TABLE "Payment" ADD COLUMN "stripePaymentIntentId" TEXT, ADD COLUMN "stripeCheckoutSessionId" TEXT, ADD COLUMN "stripeReceiptUrl" TEXT, ADD COLUMN "stripeDisputeStatus" TEXT;
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");
ALTER TABLE "RefundRequest" ADD COLUMN "stripeRefundId" TEXT, ADD COLUMN "stripeStatus" TEXT, ADD COLUMN "initiatedById" TEXT, ADD COLUMN "reviewedById" TEXT;
CREATE UNIQUE INDEX "RefundRequest_stripeRefundId_key" ON "RefundRequest"("stripeRefundId");
CREATE TABLE "StripeCustomer" (
  "userId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  CONSTRAINT "StripeCustomer_pkey" PRIMARY KEY ("userId", "mode")
);
CREATE UNIQUE INDEX "StripeCustomer_stripeCustomerId_key" ON "StripeCustomer"("stripeCustomerId");
ALTER TABLE "StripeCustomer" ADD CONSTRAINT "StripeCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "StripeCheckout" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "sessionId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATING',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StripeCheckout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StripeCheckout_orderId_key" ON "StripeCheckout"("orderId");
CREATE UNIQUE INDEX "StripeCheckout_sessionId_key" ON "StripeCheckout"("sessionId");
CREATE UNIQUE INDEX "StripeCheckout_idempotencyKey_key" ON "StripeCheckout"("idempotencyKey");
ALTER TABLE "StripeCheckout" ADD CONSTRAINT "StripeCheckout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);
