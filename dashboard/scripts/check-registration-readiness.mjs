import { PrismaClient } from "@prisma/client";

const required = ["DATABASE_URL", "APP_ORIGIN", "PUBLIC_SITE_ORIGIN", "ONBOARDING_HANDOFF_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "ADMIN_NOTIFICATION_EMAIL", "EMAIL_OTP_SECRET", "EMAIL_JOB_SECRET"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) console.error(`Missing server variables: ${missing.join(", ")}`);

const otpSecret = process.env.EMAIL_OTP_SECRET ? Buffer.from(process.env.EMAIL_OTP_SECRET, "base64url") : null;
if (otpSecret && otpSecret.length !== 32) console.error("EMAIL_OTP_SECRET must decode to exactly 32 bytes.");
if (process.env.EMAIL_FROM && !/@apexfilings\.com$/i.test(process.env.EMAIL_FROM)) console.error("EMAIL_FROM must use the verified apexfilings.com domain.");

let databaseReady = false;
if (process.env.DATABASE_URL) {
  const db = new PrismaClient();
  try {
    const [row] = await db.$queryRaw`SELECT to_regclass('public."EmailVerification"')::text AS verification, to_regclass('public."EmailOutbox"')::text AS outbox`;
    databaseReady = Boolean(row?.verification && row?.outbox);
    console.log(databaseReady ? "Database and email tables: ready" : "Database connected, but required email tables are missing. Run npm run db:deploy.");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "unknown";
    console.error(`Database readiness failed (code: ${code}).`);
  } finally { await db.$disconnect(); }
}

const ready = !missing.length && (!otpSecret || otpSecret.length === 32) && (!process.env.EMAIL_FROM || /@apexfilings\.com$/i.test(process.env.EMAIL_FROM)) && databaseReady;
console.log(ready ? "Registration prerequisites: ready. Confirm the Coolify email scheduled task and Resend sender separately." : "Registration prerequisites: not ready.");
if (!ready) process.exitCode = 1;
