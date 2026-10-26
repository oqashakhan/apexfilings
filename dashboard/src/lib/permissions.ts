export type PreviewRole = "admin" | "client";
export type FutureRole = "staff" | "partner";

// UI navigation only. A future backend must enforce permissions server-side.
export const previewPermissions: Record<PreviewRole, readonly string[]> = {
  admin: ["dashboard", "applications", "clients", "orders", "documents", "payments", "services", "website-content", "notifications", "settings"],
  client: ["dashboard", "companies", "applications", "orders", "documents", "payments", "services", "support", "profile", "settings"],
};

export const futureRoles: FutureRole[] = ["staff", "partner"];

// Product scope for future server-side authorization. These labels do not grant access.
export const plannedRoleScope = {
  owner: "all customers, applications, billing, catalog, content, staff, and settings",
  staff: "assigned applications and minimum customer data needed to process them",
  partner: "the partner's own clients, applications, orders, and permitted documents",
  client: "the customer's own companies, applications, orders, and documents",
} as const;

// Frontend configuration only. Hidden controls do not enforce access to data or actions.
export const demoRolePermissions = {
  owner: ["applications.read", "applications.review", "applications.approve", "documents.review", "documents.publish", "payments.verify", "refunds.review", "catalog.edit", "content.edit", "content.publish", "settings.manage"],
  staff: ["applications.read", "applications.review", "documents.review"],
  partner: [],
  client: [],
} as const;
