import { test } from "node:test";
import assert from "node:assert/strict";
import type { ApplicationStatus, DocumentStatus, PaymentStatus } from "@prisma/client";
import { deriveNextAction } from "../src/server/next-action";

type Input = Parameters<typeof deriveNextAction>[0];
const document = (id: string, status: DocumentStatus, replacesDocumentId: string | null = null): Input["documents"][number] => ({ id, documentType: "OWNER_ID", ownerId: "owner-1", reviewStatus: status, reviewReason: status === "REPLACEMENT_REQUIRED" ? "Please upload a clearer scan." : null, replacesDocumentId, requestId: null, createdAt: new Date() });
const base = (status: ApplicationStatus, changes: Partial<Input> = {}): Input => ({ id: "app-1", status, companyName: "Example LLC", formationState: "WY", ownerIds: ["owner-1"], order: { id: "order-1", paymentStatus: "UNPAID" as PaymentStatus }, documents: [], requirements: [{ id: "requirement-1", documentType: "OWNER_ID", required: true, stateCode: null }], requests: [], finalDocuments: [], history: [], responses: [], ...changes });

test("draft and unpaid applications lead to their existing flows", () => {
  assert.equal(deriveNextAction(base("DRAFT")).href, "/client/applications/new?draft=app-1");
  assert.equal(deriveNextAction(base("AWAITING_PAYMENT")).href, "/client/orders/order-1");
});

test("document requests outrank informational status and stay application scoped", () => {
  const missing = deriveNextAction(base("INFORMATION_REQUIRED"));
  assert.equal(missing.documentRequests[0].ownerId, "owner-1");
  assert.equal(missing.href, "/client/applications/app-1#document-requests");
  const rejected = deriveNextAction(base("UNDER_REVIEW", { documents: [document("doc-1", "REPLACEMENT_REQUIRED")] }));
  assert.equal(rejected.documentRequests[0].replacesDocumentId, "doc-1");
  assert.match(rejected.description, /clearer scan/);
  const awaiting = deriveNextAction(base("UNDER_REVIEW", { documents: [document("doc-1", "REPLACEMENT_REQUIRED"), document("doc-2", "UNDER_REVIEW", "doc-1")] }));
  assert.equal(awaiting.kind, "waiting");
});

test("typed Admin requests become actionable and clear after upload", () => {
  const request = { id: "request-1", documentType: "PROOF_OF_ADDRESS", ownerId: null, reason: "Provide a recent address document." };
  const open = deriveNextAction(base("AWAITING_PAYMENT", { requests: [request] }));
  assert.equal(open.documentRequests[0].requestId, request.id);
  const sent = deriveNextAction(base("AWAITING_PAYMENT", { requests: [request], documents: [{ ...document("doc-1", "UNDER_REVIEW"), documentType: request.documentType, ownerId: null, requestId: request.id }] }));
  assert.equal(sent.documentRequests.length, 0);
  assert.equal(sent.href, "/client/orders/order-1");
});

test("customer response and later Admin status remain current", () => {
  const event = { id: "event-1", newStatus: "INFORMATION_REQUIRED" as ApplicationStatus, reason: "Please clarify." };
  assert.equal(deriveNextAction(base("INFORMATION_REQUIRED", { documents: [document("doc-1", "ACCEPTED")], history: [event] })).kind, "action");
  assert.equal(deriveNextAction(base("INFORMATION_REQUIRED", { documents: [document("doc-1", "ACCEPTED")], history: [event], responses: [{ requestEventId: event.id }] })).kind, "waiting");
  assert.match(deriveNextAction(base("APPROVED_FOR_FILING")).description, /not government approval/);
});

test("terminal states override old document requests", () => {
  const stale = { documents: [document("doc-1", "REPLACEMENT_REQUIRED")] };
  assert.equal(deriveNextAction(base("CANCELLED", stale)).documentRequests.length, 0);
  assert.equal(deriveNextAction(base("REFUNDED", stale)).documentRequests.length, 0);
  assert.equal(deriveNextAction(base("COMPLETED", stale)).ctaLabel, "Contact Support");
  assert.equal(deriveNextAction(base("COMPLETED", { ...stale, finalDocuments: [document("final-1", "COMPLETED_COMPANY_DOCUMENT")] })).ctaLabel, "View Documents");
});
