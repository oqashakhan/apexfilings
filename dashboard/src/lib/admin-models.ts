import type { ApplicationStatus, PaymentStatus } from "@/lib/client-models";

export type AdminRole = "owner" | "staff" | "partner" | "client";
export type AdminPermission = "applications.read" | "applications.review" | "applications.approve" | "documents.review" | "documents.publish" | "payments.verify" | "refunds.review" | "catalog.edit" | "content.edit" | "content.publish" | "settings.manage";
export type AdminUser = { id: string; name: string; role: AdminRole; clientId: string | null; active: boolean };
export type AdminOwner = { id: string; name: string; email: string; phone: string; nationality: string; residence: string; address: string; ownership: number };
export type AdminClient = { id: string; name: string; email: string; phone: string; registeredAt: string; status: string; companyIds: string[] };
export type AdminCompany = { id: string; name: string; state: string; clientId: string; type: "US LLC" };
export type AdminApplication = {
  id: string; clientId: string; companyId: string; preferredName: string; alternatives: string[];
  state: string; packageName: "Basic LLC Formation" | "Premium All-In";
  businessActivity: string; description: string; addressRequirement: string; management: string;
  owners: AdminOwner[]; additionalServices: string[]; status: ApplicationStatus;
  submittedAt: string | null; customerConfirmed: boolean;
};
export type AdminDocument = { id: string; applicationId: string; name: string; type: string; relatedOwner: string | null; status: "Required" | "Not Provided" | "Under Review" | "Accepted" | "Replacement Required" | "Completed Company Document"; uploadedAt: string | null; reviewedBy: string | null; sampleFileName?: string };
export type AdminOrder = { id: string; applicationId: string; date: string; serviceFee: number; governmentFee: number | null; additionalFee: number | null; thirdPartyFee: number | null; discount: number | null; paymentStatus: PaymentStatus; status: "Open" | "Fulfilled" | "Cancelled" };
export type AdminPayment = { id: string; orderId: string; amount: number | null; method: string; date: string | null; status: PaymentStatus; reference: string | null; supportingInformation: string };
export type AdminRefund = { id: string; orderId: string; amount: number | null; reason: string; requestedAt: string; status: "Requested" | "Under Review" | "Approved" | "Declined" | "Completed" | "Approved · demo" | "Declined · demo" };
export type AdminService = { id: string; name: string; category: string; description: string; status: "Available" | "Inquiry Only" | "On Hold"; packages: string[] };
export type AdminPackage = { id: string; name: string; serviceFee: number; includedServices: string[]; available: boolean };
export type AdminStateFee = { code: string; state: string; filingFee: number | null; additionalFees: string | null; lastUpdated: string | null; notes: string[] };
export type AdminNotification = { id: string; applicationId: string | null; title: string; detail: string; date: string; read: boolean };
export type AdminContentItem = { id: string; area: string; title: string; summary: string; draft: string };
export type AdminActivity = { id: string; applicationId: string | null; title: string; detail: string; date: string; kind: "client" | "application" | "document" | "payment" | "status" };
export type AdminStatusEvent = { id: string; applicationId: string; status: ApplicationStatus; reason: string; date: string; demo: boolean };

// Boundary to replace with authenticated, audited endpoints after frontend approval.
export interface AdminDashboardApi {
  getUsers(): Promise<AdminUser[]>;
  getRolePermissions(): Promise<Record<AdminRole, readonly AdminPermission[]>>;
  getClients(): Promise<AdminClient[]>;
  getCompanies(): Promise<AdminCompany[]>;
  getOwners(applicationId: string): Promise<AdminOwner[]>;
  getApplications(): Promise<AdminApplication[]>;
  getStatusEvents(applicationId: string): Promise<AdminStatusEvent[]>;
  getDocuments(): Promise<AdminDocument[]>;
  getOrders(): Promise<AdminOrder[]>;
  getPayments(): Promise<AdminPayment[]>;
  getRefunds(): Promise<AdminRefund[]>;
  getServices(): Promise<AdminService[]>;
  getPackages(): Promise<AdminPackage[]>;
  getStateFees(): Promise<AdminStateFee[]>;
  getNotifications(): Promise<AdminNotification[]>;
  getContent(): Promise<AdminContentItem[]>;
  getActivity(): Promise<AdminActivity[]>;
}
