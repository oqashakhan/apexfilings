"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ClientRecord = {
  id: string; companyId: string; company: { id: string; name: string; state: string; owners: { id: string; fullName: string }[] };
  packageName: string; status: string; statusCode: string; updatedAt: string;
  history: { id: string; status: string; reason: string | null; date: string }[];
  responses: { id: string; requestEventId: string; body: string; createdAt: string }[];
  documents: { id: string; documentType: string; reviewStatus: string; originalFilename: string; createdAt: string; ownerId: string | null }[];
  order: { id: string; paymentStatus: string; serviceFeeCents: number; governmentFeeCents: number | null; thirdPartyFeeCents: number | null; additionalFeeCents: number | null; discountCents: number | null; totalCents: number | null } | null;
};
export type ClientService = { id: string; name: string; description: string; slug: string };
export type ClientPackage = { id: string; name: string; slug: string; serviceFeeCents: number; currency: string };
export type ClientNotification = { id: string; title: string; message: string; readAt: string | null; createdAt: string };
type ClientData = {
  companyId: string; setCompanyId: (id: string) => void; applications: ClientRecord[];
  services: ClientService[]; packages: ClientPackage[]; notifications: ClientNotification[];
  paymentInstructions: string;
  user: { id: string; fullName: string; email: string; phone: string | null; country: string | null } | null;
  loading: boolean; error: string | null; refresh: () => Promise<void>;
};
const Context = createContext<ClientData | null>(null);

export function ClientDemoProvider({ children }: { children: React.ReactNode }) {
  const [companyId, setCompanyId] = useState("");
  const [applications, setApplications] = useState<ClientRecord[]>([]);
  const [services, setServices] = useState<ClientService[]>([]);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [user, setUser] = useState<ClientData["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/client/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your workspace. Refresh the page to try again.");
      const data = await response.json();
      setApplications(data.applications);
      setServices(data.services);
      setPackages(data.packages);
      setNotifications(data.notifications);
      setPaymentInstructions(data.paymentInstructions ?? "");
      setUser(data.user);
      setCompanyId((current) => data.applications.some((item: ClientRecord) => item.companyId === current) ? current : (data.applications[0]?.companyId ?? ""));
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load your workspace."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const frame = requestAnimationFrame(() => { void refresh(); }); return () => cancelAnimationFrame(frame); }, [refresh]);
  return <Context.Provider value={{ companyId, setCompanyId, applications, services, packages, notifications, paymentInstructions, user, loading, error, refresh }}>{children}</Context.Provider>;
}

export function useClientDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("Client provider is missing.");
  return value;
}
