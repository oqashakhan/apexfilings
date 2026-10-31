-- Existing verification links retain the LINK method; new signups use OTP.
ALTER TABLE "EmailVerification"
  ADD COLUMN "method" TEXT NOT NULL DEFAULT 'LINK',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "EmailVerification_userId_method_createdAt_idx"
  ON "EmailVerification"("userId", "method", "createdAt");
