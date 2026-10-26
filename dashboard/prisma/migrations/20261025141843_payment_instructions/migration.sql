-- CreateTable
CREATE TABLE "PaymentInstructions" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "body" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInstructions_pkey" PRIMARY KEY ("id")
);
