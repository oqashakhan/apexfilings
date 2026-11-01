/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require("@next/env");
const path = require("node:path");
const { randomBytes } = require("node:crypto");

loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL);
if (!["127.0.0.1", "localhost"].includes(url.hostname) || !["/apex_dashboard", "/apex_dashboard_test"].includes(url.pathname)) {
  throw new Error("Integration tests require the local Apex development database URL.");
}
url.pathname = "/apex_dashboard_test";
process.env.DATABASE_URL = url.toString();
process.env.APP_ORIGIN = "http://localhost:3002";
process.env.PRIVATE_DOCUMENT_DIR = path.resolve(process.cwd(), ".local", "test-documents");
process.env.PUBLIC_SITE_ORIGIN = "http://localhost:3000";
process.env.ONBOARDING_HANDOFF_SECRET = randomBytes(32).toString("base64url");
process.env.TEST_EMAIL_OUTBOX = "1";
process.env.TEST_RESEND_BASE_URL = "http://127.0.0.1:3033";
process.env.RESEND_API_KEY = "re_local_mock_only";
process.env.EMAIL_FROM = "test@apexfilings.com";
process.env.EMAIL_JOB_SECRET = "test-only-email-job-secret";
process.env.ADMIN_NOTIFICATION_EMAIL = "admin-notifications@example.test";
process.env.EMAIL_OTP_SECRET = Buffer.alloc(32, 42).toString("base64url");
