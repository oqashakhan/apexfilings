// Frontend contracts only. The future API must enforce ownership and permissions server-side.
export type ClientUser = { id: string; fullName: string; email: string; phone?: string; country?: string };
export type ClientCompany = { id: string; name: string; state: string; businessType: string; applicationIds: string[] };
export type ApplicationStatus =
  | "Draft" | "Awaiting Payment" | "Payment Received" | "Under Review"
  | "Information Required" | "Awaiting Customer Confirmation" | "Approved for Filing"
  | "Filing in Progress" | "Submitted to Authority" | "Additional Action Required"
  | "Completed" | "On Hold" | "Cancelled" | "Refund Requested" | "Refunded";
export type StatusEvent = { id: string; status: ApplicationStatus; date: string; detail: string };
export type ClientApplication = {
  id: string; companyId: string; packageName: string; status: ApplicationStatus;
  updatedAt: string; nextAction: string | null; progress: number; history: StatusEvent[];
};
export type ApplicationOwner = {
  fullName: string; email: string; phone: string; nationality: string;
  residenceCountry: string; residentialAddress: string; ownershipPercent: number;
};
export type ClientDocument = {
  id: string; companyId: string; name: string; type: string; status: string;
  date: string; sampleFileName?: string;
};
export type ClientOrder = {
  id: string; companyId: string; applicationId: string; packageName: string;
  date: string; serviceFee: number; governmentFee: number | null;
  additionalFee: number | null; discount: number | null; paymentStatus: PaymentStatus;
};
export type PaymentStatus = "Pending" | "Awaiting Verification" | "Paid" | "Failed" | "Refunded";
export type ClientPayment = { id: string; orderId: string; status: PaymentStatus; date: string };
export type SupportTicket = { id: string; companyId: string; applicationId?: string; subject: string; status: string; updatedAt: string; messages: { date: string; text: string }[] };
export type ClientNotification = { id: string; companyId: string; text: string; date: string; read: boolean };

// Replace these read-only fixture calls with authenticated API requests in the backend phase.
export interface ClientDashboardApi {
  getCompanies(): Promise<ClientCompany[]>;
  getApplications(companyId: string): Promise<ClientApplication[]>;
  getDocuments(companyId: string): Promise<ClientDocument[]>;
  getOrders(companyId: string): Promise<ClientOrder[]>;
  getPayments(orderId: string): Promise<ClientPayment[]>;
  getTickets(companyId: string): Promise<SupportTicket[]>;
  getNotifications(companyId: string): Promise<ClientNotification[]>;
}
