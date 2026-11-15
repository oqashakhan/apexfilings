"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ClientRecord = {
  payment: ReturnType<typeof import("@/lib/client-workspace").dashboardPayment>;
  milestones: ReturnType<typeof import("@/lib/client-workspace").formationMilestones>;
  accountManager: string | null;
  paymentEvents: { id: string; date: string; status: string }[];
  draftQuote: import("@/lib/pricing").QuoteSnapshot | null;
  id: string; companyId: string; company: { id: string; name: string; state: string; owners: { id: string; fullName: string }[] };
  packageName: string; packageSlug: string; status: string; statusCode: string; updatedAt: string; submittedAt: string | null;
  history: { id: string; status: string; reason: string | null; date: string }[];
  responses: { id: string; requestEventId: string; body: string; createdAt: string }[];
  requiredDocuments: { id: string; documentType: string }[];
  documents: { title?: string | null; description?: string | null; id: string; documentType: string; reviewStatus: string; reviewReason: string | null; replacesDocumentId: string | null; requestId: string | null; originalFilename: string; createdAt: string; ownerId: string | null }[];
  documentRequests: { id: string; documentType: string; ownerId: string | null; reason: string; customTitle?:string|null;dueDate?:string|null;cancelledAt?:string|null }[];
  nextAction: { kind: "action" | "waiting" | "complete"; title: string; description: string; ctaLabel: string; href: string; documentRequests: { id: string; documentType: string; ownerId: string | null; reason: string | null; replacesDocumentId: string | null; requestId: string | null }[] };
  order: { id: string; paymentStatus: string; pricingQuote: import("@/lib/pricing").QuoteSnapshot | null; pricingSnapshot: import("@/lib/pricing").QuoteSnapshot | null; serviceFeeCents: number; governmentFeeCents: number | null; thirdPartyFeeCents: number | null; additionalFeeCents: number | null; discountCents: number | null; totalCents: number | null; stripeCheckoutStatus: string | null; invoice: { id:string; number: string; issuedAt: string | null } | null } | null;
};
export type ClientService = { id: string; name: string; description: string; slug: string; priceCents: number | null; currency: string; priceApproved: boolean };
export type ClientPackage = { id: string; name: string; slug: string; serviceFeeCents: number; currency: string; includedServiceSlugs: string[]; includedServices: string[] };
export type ClientNotification = { id: string; title: string; message: string; readAt: string | null; createdAt: string };
export type SupportUpdate = { id: string; companyId: string; subject: string; status: string; updatedAt: string; replies: { id: string; createdAt: string }[] };
type ClientData = {
  companyId: string; setCompanyId: (id: string) => void; applications: ClientRecord[];
  services: ClientService[]; packages: ClientPackage[]; notifications: ClientNotification[];
  supportUpdates: SupportUpdate[]; revision: number;
  paymentInstructions: string;
  user: { id: string; clientReference: string | null; fullName: string; email: string; phone: string | null; country: string | null } | null;
  loading: boolean; error: string | null; refresh: () => Promise<void>;
};
const Context = createContext<ClientData | null>(null);

function savedCompany() { try { return window.localStorage.getItem("apex-selected-company") ?? ""; } catch { return ""; } }

export function ClientDemoProvider({ children }: { children: React.ReactNode }) {
  const refreshSequence = useRef(0);
  const [revision, setRevision] = useState(0);
  const [companyId, setCompanyId] = useState("");
  const [supportUpdates, setSupportUpdates] = useState<SupportUpdate[]>([]);
  const [applications, setApplications] = useState<ClientRecord[]>([]);
  const [services, setServices] = useState<ClientService[]>([]);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [user, setUser] = useState<ClientData["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const response = await fetch("/api/v1/client/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your workspace. Refresh the page to try again.");
      const data = await response.json();
      if (sequence !== refreshSequence.current) return;
      setRevision(sequence);
      setApplications(data.applications);
      setSupportUpdates(data.supportUpdates ?? []);
      setServices(data.services);
      setPackages(data.packages);
      setNotifications(data.notifications);
      setPaymentInstructions(data.paymentInstructions ?? "");
      setUser(data.user);
      setCompanyId((current) => {
        const saved = current || savedCompany();
        return data.applications.some((item: ClientRecord) => item.companyId === saved) ? saved : (data.applications[0]?.companyId ?? "");
      });
      setError(null);
    } catch (cause) { if (sequence === refreshSequence.current) setError(cause instanceof Error ? cause.message : "Could not load your workspace."); }
    finally { if (sequence === refreshSequence.current) setLoading(false); }
  }, []);
  const selectCompany = useCallback((id: string) => {
    try { window.localStorage.setItem("apex-selected-company", id); } catch { /* Selection still works when browser storage is unavailable. */ }
    setCompanyId(id);
    void refresh();
  }, [refresh]);
  useEffect(() => { const frame = requestAnimationFrame(() => { void refresh(); }); return () => cancelAnimationFrame(frame); }, [refresh]);
  useEffect(() => {
    const sync = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(sync, 30000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", sync); window.removeEventListener("focus", sync); };
  }, [refresh]);
  return <Context.Provider value={{ companyId, setCompanyId: selectCompany, supportUpdates, revision, applications, services, packages, notifications, paymentInstructions, user, loading, error, refresh }}>{children}</Context.Provider>;
}

export function useClientDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("Client provider is missing.");
  return value;
}
