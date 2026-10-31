"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AdminActivity, AdminApplication, AdminClient, AdminCompany, AdminContentItem, AdminDocument, AdminNotification, AdminOrder, AdminPackage, AdminPayment, AdminRefund, AdminService, AdminStateFee, AdminStatusEvent } from "@/lib/admin-models";
import type { ApplicationStatus, PaymentStatus } from "@/lib/client-models";

export const reviewChecks = ["Customer information complete", "Company details reviewed", "Owner information reviewed", "Required documents checked", "Customer confirmation received", "Payment verified"] as const;
const checkCodes: Record<string, string> = { "Customer information complete": "CUSTOMER_INFORMATION", "Company details reviewed": "COMPANY_DETAILS", "Owner information reviewed": "OWNER_INFORMATION", "Required documents checked": "REQUIRED_DOCUMENTS", "Customer confirmation received": "CUSTOMER_CONFIRMATION", "Payment verified": "PAYMENT_VERIFIED" };
const statusCodes: Record<ApplicationStatus, string> = { "Draft": "DRAFT", "Awaiting Payment": "AWAITING_PAYMENT", "Payment Received": "PAYMENT_RECEIVED", "Under Review": "UNDER_REVIEW", "Information Required": "INFORMATION_REQUIRED", "Awaiting Customer Confirmation": "AWAITING_CUSTOMER_CONFIRMATION", "Approved for Filing": "APPROVED_FOR_FILING", "Filing in Progress": "FILING_IN_PROGRESS", "Submitted to Authority": "SUBMITTED_TO_AUTHORITY", "Additional Action Required": "ADDITIONAL_ACTION_REQUIRED", "Completed": "COMPLETED", "On Hold": "ON_HOLD", "Cancelled": "CANCELLED", "Refund Requested": "REFUND_REQUESTED", "Refunded": "REFUNDED" };
type Snapshot = {
  clients: AdminClient[]; companies: AdminCompany[]; applications: AdminApplication[]; documents: AdminDocument[]; orders: AdminOrder[];
  payments: AdminPayment[]; refunds: AdminRefund[]; services: AdminService[]; packages: AdminPackage[]; stateFees: AdminStateFee[];
  content: AdminContentItem[]; notifications: AdminNotification[]; statusEvents: AdminStatusEvent[]; notes: Record<string, string[]>;
  customerResponses: Record<string, { id: string; body: string; createdAt: string }[]>;
  checks: Record<string, string[]>; activity: AdminActivity[];
};
const empty: Snapshot = { clients: [], companies: [], applications: [], documents: [], orders: [], payments: [], refunds: [], services: [], packages: [], stateFees: [], content: [], notifications: [], statusEvents: [], notes: {}, customerResponses: {}, checks: {}, activity: [] };
type ContextValue = Snapshot & {
  loading: boolean; error: string | null; refresh: () => Promise<void>;
  canApprove: (id: string) => boolean;
  changeStatus: (id: string, status: ApplicationStatus, reason: string) => Promise<boolean>;
  reviewDocument: (id: string, status: AdminDocument["status"]) => Promise<void>;
  reviewPayment: (id: string, status: PaymentStatus, reason?: string) => Promise<void>;
  confirmOrderFees: (id: string, fees: { governmentFeeCents: number; thirdPartyFeeCents: number; additionalFeeCents: number; discountCents: number }) => Promise<void>;
  recordManualPayment: (orderId: string, amountCents: number, reference: string, supportingInfo?: string) => Promise<void>;
  reviewRefund: (id: string, status: AdminRefund["status"], reason?: string) => Promise<void>;
  addNote: (id: string, text: string) => Promise<void>;
  toggleCheck: (id: string, check: string) => Promise<void>;
  updateServiceDraft: (id: string, description: string) => Promise<void>;
  updatePackageDraft: (id: string, draft: AdminPackage) => Promise<void>;
  updateContentDraft: (id: string, draft: string) => Promise<void>;
  toggleNotificationRead: (id: string) => Promise<void>;
  setClientStatus: (id: string, status: "ACTIVE" | "SUSPENDED") => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);

async function api(path: string, method = "GET", value?: unknown) {
  const response = await fetch(`/api/v1/admin/${path}`, { method, credentials: "same-origin", headers: value == null ? undefined : { "Content-Type": "application/json" }, body: value == null ? undefined : JSON.stringify(value), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed");
  return result;
}

export function AdminDemoProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const result = await api("snapshot");
      const codesToLabels = Object.fromEntries(Object.entries(checkCodes).map(([label, code]) => [code, label]));
      setSnapshot({ ...result, checks: Object.fromEntries(Object.entries(result.checks as Record<string, string[]>).map(([id, codes]) => [id, codes.map((code) => codesToLabels[code] ?? code)])) });
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load dashboard"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const frame = requestAnimationFrame(() => { void refresh(); }); return () => cancelAnimationFrame(frame); }, [refresh]);

  const act = useCallback(async (path: string, method: string, payload?: unknown) => {
    try { await api(path, method, payload); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Action failed"); throw cause; }
  }, [refresh]);

  const value = useMemo<ContextValue>(() => ({
    ...snapshot, loading, error, refresh,
    canApprove: (id) => {
      const application = snapshot.applications.find((item) => item.id === id);
      const order = snapshot.orders.find((item) => item.applicationId === id);
      const files = snapshot.documents.filter((item) => item.applicationId === id && item.status !== "Completed Company Document");
      return Boolean(application?.customerConfirmed && order?.paymentStatus === "Paid" && files.length > 0 && files.every((item) => item.status === "Accepted") && reviewChecks.every((check) => snapshot.checks[id]?.includes(check)));
    },
    changeStatus: async (id, status, reason) => { try { await act(`applications/${id}/status`, "POST", { status: statusCodes[status], reason }); return true; } catch { return false; } },
    reviewDocument: async (id, status) => { await act(`documents/${id}/review`, "POST", { status: status === "Accepted" ? "ACCEPTED" : "REPLACEMENT_REQUIRED" }); },
    reviewPayment: async (id, status, reason) => { if (status === "Paid") await act(`payments/${id}/verify`, "POST", {}); else if (status === "Failed" && reason && reason.trim().length >= 3) await act(`payments/${id}/reject`, "POST", { reason: reason.trim() }); else throw new Error("Choose a review decision and provide a reason for rejection"); },
    confirmOrderFees: async (id, fees) => { await act(`orders/${id}`, "PATCH", fees); },
    recordManualPayment: async (orderId, amountCents, reference, supportingInfo) => { await act("payments", "POST", { orderId, amountCents, reference, supportingInfo }); },
    reviewRefund: async (id, status, reason) => { if (!reason || reason.trim().length < 3) throw new Error("Enter a review reason"); const code = status === "Under Review" ? "UNDER_REVIEW" : status === "Approved" ? "APPROVED" : "DECLINED"; await act(`refunds/${id}/review`, "POST", { status: code, reason: reason.trim() }); },
    addNote: async (id, text) => { await act(`applications/${id}/notes`, "POST", { text }); },
    toggleCheck: async (id, check) => { await act(`applications/${id}/checks`, "POST", { check: checkCodes[check], checked: !(snapshot.checks[id] ?? []).includes(check) }); },
    updateServiceDraft: async (id, description) => { await act(`services/${id}`, "PATCH", { description }); },
    updatePackageDraft: async (id, draft) => { await act(`packages/${id}`, "PATCH", { name: draft.name, serviceFeeCents: Math.round(draft.serviceFee * 100), includedServices: draft.includedServices, available: draft.available }); },
    updateContentDraft: async (id, draft) => { await act(`website-content/${id}`, "PATCH", { title: snapshot.content.find((item) => item.id === id)?.title ?? id, body: draft }); },
    toggleNotificationRead: async (id) => { await act(`notifications/${id}`, "PATCH", {}); },
    setClientStatus: async (id, status) => { await act(`clients/${id}`, "PATCH", { status }); },
  }), [snapshot, loading, error, refresh, act]);
  return <Context.Provider value={value}>{error && <div className="form-error" role="alert">{error}</div>}{children}</Context.Provider>;
}

export function useAdminDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("Admin provider is missing");
  return value;
}
