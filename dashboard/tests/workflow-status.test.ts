import assert from "node:assert/strict";
import test from "node:test";
import { ApplicationStatus as PrismaApplicationStatus } from "@prisma/client";
import { applicationStatuses } from "@/lib/display";
import { statusInput } from "@/server/validation";
import { canTransition, statusNames, transitionBlockReason } from "@/server/workflow";

const statuses = Object.values(PrismaApplicationStatus);
const allowed: Record<string, string[]> = {
  DRAFT: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PAYMENT_RECEIVED", "INFORMATION_REQUIRED", "ON_HOLD", "CANCELLED"],
  PAYMENT_RECEIVED: ["UNDER_REVIEW", "INFORMATION_REQUIRED", "ON_HOLD", "REFUND_REQUESTED"],
  UNDER_REVIEW: ["INFORMATION_REQUIRED", "AWAITING_CUSTOMER_CONFIRMATION", "APPROVED_FOR_FILING", "ON_HOLD", "REFUND_REQUESTED"],
  INFORMATION_REQUIRED: ["UNDER_REVIEW", "ON_HOLD", "CANCELLED"],
  AWAITING_CUSTOMER_CONFIRMATION: ["UNDER_REVIEW", "APPROVED_FOR_FILING", "INFORMATION_REQUIRED", "ON_HOLD"],
  APPROVED_FOR_FILING: ["FILING_IN_PROGRESS", "ON_HOLD"],
  FILING_IN_PROGRESS: ["SUBMITTED_TO_AUTHORITY", "ADDITIONAL_ACTION_REQUIRED", "ON_HOLD"],
  SUBMITTED_TO_AUTHORITY: ["ADDITIONAL_ACTION_REQUIRED", "COMPLETED", "ON_HOLD"],
  ADDITIONAL_ACTION_REQUIRED: ["UNDER_REVIEW", "FILING_IN_PROGRESS", "SUBMITTED_TO_AUTHORITY", "ON_HOLD"],
  COMPLETED: ["REFUND_REQUESTED"],
  ON_HOLD: ["UNDER_REVIEW", "CANCELLED"],
  CANCELLED: [],
  REFUND_REQUESTED: ["REFUNDED", "UNDER_REVIEW", "COMPLETED"],
  REFUNDED: [],
};

test("all database application statuses have matching client labels and API validation", () => {
  assert.deepEqual(Object.keys(statusNames).sort(), [...statuses].sort());
  assert.deepEqual([...applicationStatuses].sort(), Object.values(statusNames).sort());
  for (const status of statuses) {
    assert.equal(statusInput.safeParse({ status, reason: "Status validation test" }).success, true, `${status} is accepted by the API`);
  }
});

test("every application status pair follows the explicit transition matrix", () => {
  for (const from of statuses) for (const to of statuses) {
    assert.equal(canTransition(from, to), allowed[from].includes(to), `${from} -> ${to}`);
  }
  assert.match(transitionBlockReason("DRAFT", "COMPLETED"), /Allowed next statuses: Awaiting Payment, Cancelled/);
  assert.match(transitionBlockReason("COMPLETED", "COMPLETED"), /already Completed/);
});
