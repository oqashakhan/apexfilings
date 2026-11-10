/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const root = "http://localhost:3002";

async function actor(role, suffix) {
  const user = await db.user.create({ data: { fullName: `Service Request Test ${suffix}`, email: `${role.toLowerCase()}-${suffix}@example.test`, emailNormalized: `${role.toLowerCase()}-${suffix}@example.test`, role, emailVerifiedAt: new Date() } });
  const token = randomUUID() + randomUUID();
  await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
  return { user, token };
}

async function api(path, token, method = "GET", value) {
  const response = await fetch(root + path, { method, headers: { Origin: root, "Content-Type": "application/json", ...(token ? { Cookie: `__Host-apex_session=${token}` } : {}) }, body: value === undefined ? undefined : JSON.stringify(value) });
  return { status: response.status, data: await response.json() };
}

test("additional service requests enforce ownership, persist once and notify both workspaces", async (t) => {
  const suffix = randomUUID();
  const createdIds = [];
  let companyIds = [];
  let serviceId;
  const users = [];
  t.after(async () => {
    if (createdIds.length) {
      await db.notification.deleteMany({ where: { relatedEntity: { in: createdIds } } });
      await db.auditLog.deleteMany({ where: { resourceType: "ServiceRequest", resourceId: { in: createdIds } } });
      await db.serviceRequest.deleteMany({ where: { id: { in: createdIds } } });
    }
    if (serviceId) await db.service.deleteMany({ where: { id: serviceId } });
    if (companyIds.length) await db.company.deleteMany({ where: { id: { in: companyIds } } });
    if (users.length) {
      await db.session.deleteMany({ where: { userId: { in: users.map((item) => item.user.id) } } });
      await db.notification.deleteMany({ where: { userId: { in: users.map((item) => item.user.id) } } });
      await db.user.deleteMany({ where: { id: { in: users.map((item) => item.user.id) } } });
    }
    if (createdIds.length) await db.emailOutbox.deleteMany({ where: { OR: createdIds.flatMap((id) => [{ eventKey: { startsWith: `service-request-new:${id}:` } }, { eventKey: { startsWith: `service-request-status:${id}:` } }]) } });
    await db.$disconnect();
  });

  const client = await actor("CLIENT", suffix);
  const stranger = await actor("CLIENT", `${suffix}-stranger`);
  const owner = await actor("OWNER", suffix);
  users.push(client, stranger, owner);
  const company = await db.company.create({ data: { customerId: client.user.id, preferredName: `Service Request Test LLC ${suffix}`, formationState: "Wyoming", businessActivity: "Test", businessDescription: "Fictional integration test company" } });
  const otherCompany = await db.company.create({ data: { customerId: stranger.user.id, preferredName: `Other Service Request LLC ${suffix}`, formationState: "Wyoming", businessActivity: "Test", businessDescription: "Fictional integration test company" } });
  companyIds = [company.id, otherCompany.id];
  const service = await db.service.create({ data: { slug: `service-request-test-${suffix}`, name: "Fictional service request test", category: "Test", description: "Integration test only", available: true, priceCents: 12500, currency: "USD", priceApproved: true } });
  serviceId = service.id;

  const empty = await api("/api/v1/client/service-requests", client.token, "POST", { serviceId, companyId: company.id, details: "short", idempotencyKey: randomUUID() });
  assert.equal(empty.status, 400, "backend rejects invalid request details");
  const foreign = await api("/api/v1/client/service-requests", client.token, "POST", { serviceId, companyId: otherCompany.id, details: "A valid length request for another client's company", idempotencyKey: randomUUID() });
  assert.equal(foreign.status, 404, "client cannot submit for a company owned by another account");

  const payload = { serviceId, companyId: company.id, details: "Please contact me to discuss this service.", idempotencyKey: randomUUID() };
  const submitted = await api("/api/v1/client/service-requests", client.token, "POST", payload);
  assert.equal(submitted.status, 201, JSON.stringify(submitted.data));
  const requestId = submitted.data.request.id;
  createdIds.push(requestId);
  const repeated = await api("/api/v1/client/service-requests", client.token, "POST", payload);
  assert.equal(repeated.status, 200);
  assert.equal(repeated.data.request.id, requestId, "same idempotency key returns the existing request");

  const clientHistory = await api("/api/v1/client/service-requests", client.token);
  assert.equal(clientHistory.status, 200);
  assert.equal(clientHistory.data.requests.length, 1);
  assert.equal(clientHistory.data.requests[0].company.id, company.id);
  const strangerHistory = await api("/api/v1/client/service-requests", stranger.token);
  assert.equal(strangerHistory.status, 200);
  assert.equal(strangerHistory.data.requests.length, 0, "another client cannot see this request");
  assert.equal((await api("/api/v1/admin/service-requests", client.token)).status, 403, "client cannot access Admin request list");

  const adminList = await api("/api/v1/admin/service-requests", owner.token);
  assert.equal(adminList.status, 200);
  assert.ok(adminList.data.requests.some((item) => item.id === requestId));
  assert.equal((await api(`/api/v1/admin/service-requests/${requestId}`, client.token, "PATCH", { status: "APPROVED" })).status, 403);
  const missingNote = await api(`/api/v1/admin/service-requests/${requestId}`, owner.token, "PATCH", { status: "INFORMATION_REQUIRED", note: " " });
  assert.equal(missingNote.status, 400, "information requests require a client-facing message");
  const update = await api(`/api/v1/admin/service-requests/${requestId}`, owner.token, "PATCH", { status: "INFORMATION_REQUIRED", note: "Please confirm the preferred service date." });
  assert.equal(update.status, 200, JSON.stringify(update.data));
  const refreshed = await api("/api/v1/client/service-requests", client.token);
  assert.equal(refreshed.data.requests[0].status, "INFORMATION_REQUIRED");
  assert.equal(refreshed.data.requests[0].statusNote, "Please confirm the preferred service date.");
  assert.ok(await db.notification.findFirst({ where: { userId: owner.user.id, relatedEntity: requestId } }), "Admin received an in-app notification");
  assert.ok(await db.emailOutbox.findFirst({ where: { eventKey: `service-request-new:${requestId}:admin` } }), "Admin email is queued through the existing outbox");
  assert.ok(await db.notification.findFirst({ where: { userId: client.user.id, relatedEntity: requestId, title: "Service request information required" } }), "client status notification is in-app");
  assert.ok(await db.emailOutbox.findFirst({ where: { eventKey: { startsWith: `service-request-status:${requestId}:` } } }), "client status email is queued through the existing outbox");
  const approved = await api(`/api/v1/admin/service-requests/${requestId}`, owner.token, "PATCH", { status: "APPROVED" });
  assert.equal(approved.status, 200);
  const approvedHistory = await api("/api/v1/client/service-requests", client.token);
  assert.equal(approvedHistory.data.requests[0].status, "APPROVED", "Admin status changes appear in the client request history");
});
