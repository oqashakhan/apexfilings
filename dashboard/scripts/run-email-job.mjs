const origin = process.env.APP_ORIGIN;
const secret = process.env.EMAIL_JOB_SECRET;
if (!origin || !secret) throw new Error("APP_ORIGIN and EMAIL_JOB_SECRET are required");
const response = await fetch(new URL("/api/v1/jobs/email", origin), { method: "POST", headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Email worker returned ${response.status}`);
const result = await response.json();
console.log(`Email worker processed ${result.processed} queued messages`);
