/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, createHash } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

const root = "http://localhost:3002";
const db = new PrismaClient();
const suffix = randomBytes(6).toString("hex");
const password = `Apex!${randomBytes(16).toString("hex")}7`;
const ownerPassword = `Owner!${randomBytes(16).toString("hex")}7`;

async function call(path, method = "GET", payload, cookie = "") {
  const headers = { Origin: root };
  if (cookie) headers.Cookie = cookie;
  let body;
  if (payload instanceof FormData) body = payload;
  else if (payload !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
  const response = await fetch(root + path, { method, headers, body, redirect: "manual" });
  const type = response.headers.get("content-type") ?? "";
  const data = type.includes("application/json") ? await response.json() : null;
  return { response, data, cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "" };
}
function expect(actual, expected, label) { assert.equal(actual.response.status, expected, `${label}: ${JSON.stringify(actual.data)}`); }

test("public onboarding handoff uses the dashboard session and protects its origin", async () => {
  const origin = "http://localhost:3000";
  const details = { businessType: "LLC", country: "PK", formationState: "Wyoming", preferredName: `Example Ventures ${suffix}` };
  const headers = { Origin: origin, "Sec-Fetch-Site": "same-site", "Content-Type": "application/json" };
  const endpoint = `${root}/api/v1/onboarding`;
  const preflight = await fetch(`${endpoint}/register`, { method: "OPTIONS", headers: { Origin: origin, "Sec-Fetch-Site": "same-site", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");
  const forbidden = await fetch(`${endpoint}/prepare`, { method: "POST", headers: { ...headers, Origin: "https://untrusted.example" }, body: JSON.stringify(details) });
  assert.equal(forbidden.status, 403);
  const badState = await fetch(`${endpoint}/prepare`, { method: "POST", headers, body: JSON.stringify({ ...details, formationState: "Atlantis" }) });
  assert.equal(badState.status, 400);
  const created = await fetch(`${endpoint}/register`, { method: "POST", headers, body: JSON.stringify({ fullName: "Onboarding Test Client", email: `onboarding-${suffix}@example.test`, phone: "+1 555 000 0012", password, confirm: password, acceptedTerms: true, details }) });
  assert.equal(created.status, 200, await created.text());
  const cookies = created.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  assert.match(cookies, /apex_session=/);
  assert.match(cookies, /apex_onboarding=/);
  const current = await fetch(`${endpoint}/current`, { headers: { Cookie: cookies } });
  assert.equal(current.status, 200);
  assert.deepEqual((await current.json()).details, details);
  const account = await fetch(`${root}/api/v1/auth/current`, { headers: { Cookie: cookies } });
  assert.equal((await account.json()).user.role, "CLIENT");
  const clientPage = await fetch(`${root}/client/applications/new?handoff=1`, { headers: { Cookie: cookies }, redirect: "manual" });
  assert.equal(clientPage.status, 200);
  const registeredUser = await db.user.findUniqueOrThrow({ where: { emailNormalized: `onboarding-${suffix}@example.test` } });
  assert.equal(await db.application.count({ where: { customerId: registeredUser.id } }), 0, "opening the wizard does not create a duplicate draft");
  const cleared = await fetch(`${endpoint}/current`, { method: "DELETE", headers: { Cookie: cookies, Origin: root } });
  assert.equal(cleared.status, 200);
  assert.match(cleared.headers.get("set-cookie") ?? "", /Max-Age=0/i);
  const afterClear = await fetch(`${endpoint}/current`, { headers: { Cookie: cookies.split("; ").filter((cookie) => !cookie.startsWith("__Host-apex_onboarding=") && !cookie.startsWith("apex_onboarding=")).join("; ") } });
  assert.equal((await afterClear.json()).details, null);
  const prepared = await fetch(`${endpoint}/prepare`, { method: "POST", headers, body: JSON.stringify(details) });
  assert.equal(prepared.status, 200);
  const handoffCookie = prepared.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const signIn = await call("/api/v1/auth/login", "POST", { email: `onboarding-${suffix}@example.test`, password });
  expect(signIn, 200, "existing-client sign in");
  const resumed = await fetch(`${endpoint}/current`, { headers: { Cookie: `${handoffCookie}; ${signIn.cookie}` } });
  assert.deepEqual((await resumed.json()).details, details);
  await db.$disconnect();
});

test("authenticated dashboard workflow and ownership", async () => {
  try {
    expect(await call("/api/v1/health"), 200, "health");
    expect(await call("/api/v1/client/dashboard"), 401, "anonymous client data");
    expect(await call("/api/v1/auth/register", "POST", { fullName: "Test User", email: "invalid", phone: "12345678", password, confirm: password }), 400, "registration validation");
    const first = await call("/api/v1/auth/register", "POST", { fullName: "Apex Test Client", email: `client-${suffix}@example.test`, phone: "+1 555 000 0000", password, confirm: password, role: "OWNER" });
    expect(first, 200, "register first client");
    const who = await call("/api/v1/auth/current", "GET", undefined, first.cookie);
    expect(who, 200, "current session");
    assert.equal(who.data.user.role, "CLIENT", "registration cannot escalate role");
    const clientPage = await fetch(root + "/client/dashboard", { headers: { Cookie: first.cookie }, redirect: "manual" });
    assert.equal(clientPage.status, 200, "authenticated client page renders");
    const adminPage = await fetch(root + "/admin/dashboard", { headers: { Cookie: first.cookie }, redirect: "manual" });
    assert.equal(adminPage.status, 307, "client blocked from owner page");
    const crossSite = await fetch(root + "/api/v1/auth/logout", { method: "POST", headers: { Cookie: first.cookie, Origin: "https://untrusted.example" } });
    assert.equal(crossSite.status, 403, "cross-origin mutation blocked");
    const second = await call("/api/v1/auth/register", "POST", { fullName: "Second Test Client", email: `other-${suffix}@example.test`, phone: "+1 555 000 0001", password, confirm: password });
    expect(second, 200, "register second client");
    const otherUser = await db.user.findUniqueOrThrow({ where: { emailNormalized: `other-${suffix}@example.test` } });
    const user = await db.user.findUniqueOrThrow({ where: { emailNormalized: `client-${suffix}@example.test` } });
    assert.notEqual(user.passwordHash, password);
    assert.equal(await argon2.verify(user.passwordHash, password), true);
    expect(await call("/api/v1/admin/dashboard", "GET", undefined, first.cookie), 403, "client cannot read admin");
    expect(await call("/api/v1/auth/login", "POST", { email: user.email, password: "wrong" }), 401, "wrong password");
    expect(await call("/api/v1/auth/login", "POST", { email: user.email.toUpperCase(), password }), 200, "normalized login");
    const resetKnown = await call("/api/v1/auth/request-reset", "POST", { email: user.email });
    const resetUnknown = await call("/api/v1/auth/request-reset", "POST", { email: `missing-${suffix}@example.test` });
    expect(resetKnown, 200, "known-account reset request");
    expect(resetUnknown, 200, "unknown-account reset request");
    assert.deepEqual(resetKnown.data, resetUnknown.data, "reset response does not enumerate accounts");

    const draftInput = { preferredName: `Test LLC ${suffix}`, firstAlternativeName: `Backup LLC ${suffix}`, secondAlternativeName: "", formationState: "Wyoming", businessActivity: "Consulting", description: "Software consulting services", addressRequirement: "I need guidance", membership: "single", management: "member-managed", packageSlug: "basic", additionalServices: [], owners: [{ fullName: "Apex Test Owner", email: `owner-${suffix}@example.test`, phone: "+1 555 000 0002", nationality: "Test", residence: "United States", address: "100 Example Street, Test City", ownership: 100 }] };
    const draft = await call("/api/v1/client/applications", "POST", draftInput, first.cookie);
    expect(draft, 201, "create draft");
    const app = draft.data.application;
    expect(await call(`/api/v1/client/applications/${app.id}`, "GET", undefined, second.cookie), 404, "cross-customer application read");
    expect(await call(`/api/v1/client/applications/${app.id}`, "PATCH", { ...draftInput, description: "Updated software consulting services" }, first.cookie), 200, "update draft");
    expect(await call(`/api/v1/client/applications/${app.id}/submit`, "POST", { confirmed: true }, first.cookie), 409, "missing owner ID");
    const ownerId = app.company.owners[0].id;
    const bad = new FormData(); bad.set("applicationId", app.id); bad.set("ownerId", ownerId); bad.set("documentType", "OWNER_ID"); bad.set("file", new Blob(["not a pdf"], { type: "application/pdf" }), "id.pdf");
    expect(await call("/api/v1/documents/upload", "POST", bad, first.cookie), 400, "invalid file signature");
    const valid = new FormData(); valid.set("applicationId", app.id); valid.set("ownerId", ownerId); valid.set("documentType", "OWNER_ID"); valid.set("file", new Blob(["%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"], { type: "application/pdf" }), "test-id.pdf");
    expect(await call("/api/v1/documents/upload", "POST", valid, second.cookie), 403, "cross-customer upload");
    const upload = await call("/api/v1/documents/upload", "POST", valid, first.cookie);
    expect(upload, 201, "private document upload");
    expect(await call(`/api/v1/documents/${upload.data.document.id}`, "GET", undefined, second.cookie), 403, "cross-customer download");
    expect(await call(`/api/v1/documents/${upload.data.document.id}`, "GET", undefined, first.cookie), 403, "unreviewed client download");
    const submitted = await call(`/api/v1/client/applications/${app.id}/submit`, "POST", { confirmed: true }, first.cookie);
    expect(submitted, 200, "submit application");
    expect(await call(`/api/v1/client/applications/${app.id}/submit`, "POST", { confirmed: true }, first.cookie), 409, "duplicate submission");
    const orderId = submitted.data.orderId;

    const ownerEmail = `admin-${suffix}@example.test`;
    await db.user.create({ data: { fullName: "Apex Test Admin", email: ownerEmail, emailNormalized: ownerEmail, passwordHash: await argon2.hash(ownerPassword, { type: argon2.argon2id }), role: "OWNER" } });
    const admin = await call("/api/v1/auth/login", "POST", { email: ownerEmail, password: ownerPassword });
    expect(admin, 200, "owner login");
    expect(await call("/api/v1/admin/payment-instructions", "PATCH", { body: "TEST ONLY: contact the owner before transferring funds." }, first.cookie), 403, "client cannot edit payment instructions");
    expect(await call("/api/v1/admin/payment-instructions", "PATCH", { body: "TEST ONLY: contact the owner before transferring funds." }, admin.cookie), 200, "owner saves payment instructions");
    const clientWithInstructions = await call("/api/v1/client/dashboard", "GET", undefined, first.cookie);
    expect(clientWithInstructions, 200, "client dashboard includes payment instructions");
    assert.equal(clientWithInstructions.data.paymentInstructions, "TEST ONLY: contact the owner before transferring funds.");
    expect(await call(`/api/v1/admin/clients/${otherUser.id}`, "PATCH", { status: "SUSPENDED" }, first.cookie), 403, "client cannot suspend another client");
    expect(await call(`/api/v1/admin/documents/${upload.data.document.id}/review`, "POST", { status: "ACCEPTED" }, admin.cookie), 200, "document review");
    expect(await call(`/api/v1/documents/${upload.data.document.id}`, "GET", undefined, first.cookie), 200, "accepted document download");
    expect(await call(`/api/v1/admin/applications/${app.id}/status`, "POST", { status: "COMPLETED", reason: "Invalid skip" }, admin.cookie), 409, "invalid transition");
    expect(await call(`/api/v1/admin/orders/${orderId}`, "PATCH", { governmentFeeCents: 10000, thirdPartyFeeCents: 0, additionalFeeCents: 0, discountCents: 0 }, admin.cookie), 200, "confirm fictional test fees");
    const payment = await call("/api/v1/admin/payments", "POST", { orderId, amountCents: 29900, reference: `TEST-${suffix}` }, admin.cookie);
    expect(payment, 201, "record manual payment");
    expect(await call("/api/v1/admin/payments", "POST", { orderId, amountCents: 1, reference: `BAD-${suffix}` }, admin.cookie), 400, "reject incomplete payment");
    expect(await call("/api/v1/admin/payments", "POST", { orderId, amountCents: 29900, reference: `DUP-${suffix}` }, admin.cookie), 409, "reject duplicate payment review");
    expect(await call(`/api/v1/admin/payments/${payment.data.payment.id}/verify`, "POST", {}, first.cookie), 403, "client cannot verify payment");
    expect(await call(`/api/v1/admin/payments/${payment.data.payment.id}/verify`, "POST", {}, admin.cookie), 200, "owner verifies payment");
    expect(await call(`/api/v1/admin/payments/${payment.data.payment.id}/verify`, "POST", {}, admin.cookie), 409, "duplicate payment verification");
    const updated = await call(`/api/v1/client/applications/${app.id}`, "GET", undefined, first.cookie);
    expect(updated, 200, "client sees updated status");
    assert.equal(updated.data.application.status, "Payment Received");
    expect(await call(`/api/v1/admin/applications/${app.id}/status`, "POST", { status: "INFORMATION_REQUIRED", reason: "Please clarify the business activity." }, admin.cookie), 200, "owner requests information");
    expect(await call(`/api/v1/client/applications/${app.id}/respond`, "POST", { message: "This application is not mine." }, second.cookie), 404, "other client cannot respond");
    const customerResponse = await call(`/api/v1/client/applications/${app.id}/respond`, "POST", { message: "We provide software consulting services to business customers." }, first.cookie);
    expect(customerResponse, 201, "customer responds to information request");
    assert.equal(customerResponse.data.application.responses.length, 1);
    expect(await call(`/api/v1/client/applications/${app.id}/respond`, "POST", { message: "A repeated message for the same request." }, first.cookie), 409, "duplicate customer response rejected");
    const ownerApplication = await call(`/api/v1/admin/applications/${app.id}`, "GET", undefined, admin.cookie);
    expect(ownerApplication, 200, "owner reads customer response");
    assert.equal(ownerApplication.data.application.customerResponses.length, 1);
    expect(await call(`/api/v1/admin/applications/${app.id}/status`, "POST", { status: "APPROVED_FOR_FILING", reason: "Premature approval" }, admin.cookie), 409, "approval prerequisites enforced");
    expect(await call(`/api/v1/admin/applications/${app.id}/status`, "POST", { status: "UNDER_REVIEW", reason: "Owner started application review" }, admin.cookie), 200, "valid review transition");
    for (const check of ["CUSTOMER_INFORMATION", "COMPANY_DETAILS", "OWNER_INFORMATION", "REQUIRED_DOCUMENTS", "CUSTOMER_CONFIRMATION", "PAYMENT_VERIFIED"]) {
      expect(await call(`/api/v1/admin/applications/${app.id}/checks`, "POST", { check, checked: true }, admin.cookie), 200, `review check ${check}`);
    }
    expect(await call(`/api/v1/admin/applications/${app.id}/status`, "POST", { status: "APPROVED_FOR_FILING", reason: "Internal review prerequisites satisfied" }, admin.cookie), 200, "internal filing approval");
    expect(await call(`/api/v1/admin/clients/${otherUser.id}`, "PATCH", { status: "SUSPENDED" }, admin.cookie), 200, "owner suspends client");
    expect(await call("/api/v1/client/dashboard", "GET", undefined, second.cookie), 401, "suspended client session revoked");
    expect(await call("/api/v1/auth/logout", "POST", {}, first.cookie), 200, "logout");
    expect(await call("/api/v1/client/dashboard", "GET", undefined, first.cookie), 401, "revoked session");

    const resetToken = randomBytes(32).toString("base64url");
    await db.passwordReset.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(resetToken).digest("hex"), expiresAt: new Date(Date.now() + 60_000) } });
    const newPassword = `New!${randomBytes(16).toString("hex")}7`;
    expect(await call("/api/v1/auth/reset-password", "POST", { token: resetToken, password: newPassword, confirm: newPassword }), 200, "password reset");
    expect(await call("/api/v1/auth/reset-password", "POST", { token: resetToken, password: newPassword, confirm: newPassword }), 400, "single-use reset token");
    expect(await call("/api/v1/auth/login", "POST", { email: user.email, password: newPassword }), 200, "new password login");
    const expiring = await call("/api/v1/auth/login", "POST", { email: user.email, password: newPassword });
    expect(expiring, 200, "session for expiry test");
    const rawToken = expiring.cookie.split("=")[1];
    await db.session.update({ where: { tokenHash: createHash("sha256").update(rawToken).digest("hex") }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await call("/api/v1/client/dashboard", "GET", undefined, expiring.cookie), 401, "expired session");
  } finally { await db.$disconnect(); }
});
