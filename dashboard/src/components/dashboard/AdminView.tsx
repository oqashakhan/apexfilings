"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui/DashboardUI";
import { AdminOverview } from "@/components/dashboard/AdminOverview";
import { AdminApplications } from "@/components/dashboard/AdminApplications";
import { AdminApplicationDetail } from "@/components/dashboard/AdminApplicationDetail";
import { AdminClients, AdminClientDetail, AdminOrders, AdminOrderDetail, AdminDocuments, AdminPayments } from "@/components/dashboard/AdminOperations";
import { AdminServices, AdminWebsiteContent, AdminNotifications, AdminSettings } from "@/components/dashboard/AdminManagement";

const titles: Record<string, string> = {
  dashboard: "Dashboard", applications: "Applications", clients: "Clients", orders: "Orders",
  documents: "Documents", payments: "Payments", services: "Services & Pricing",
  "website-content": "Website Content", notifications: "Notifications", settings: "Settings",
};

export function AdminView({ section, detailId }: { section: string; detailId?: string }) {
  let content: React.ReactNode;
  if (detailId && section === "applications") content = <AdminApplicationDetail id={detailId} />;
  else if (detailId && section === "clients") content = <AdminClientDetail id={detailId} />;
  else if (detailId && section === "orders") content = <AdminOrderDetail id={detailId} />;
  else switch (section) {
    case "dashboard": content = <AdminOverview />; break;
    case "applications": content = <AdminApplications />; break;
    case "clients": content = <AdminClients />; break;
    case "orders": content = <AdminOrders />; break;
    case "documents": content = <AdminDocuments />; break;
    case "payments": content = <AdminPayments />; break;
    case "services": content = <AdminServices />; break;
    case "website-content": content = <AdminWebsiteContent />; break;
    case "notifications": content = <AdminNotifications />; break;
    case "settings": content = <AdminSettings />; break;
    default: content = <PageHeader title="Page not found" description="Choose a page from the dashboard navigation." />;
  }
  return <DashboardShell role="admin" title={titles[section] ?? "Not Found"}>{content}</DashboardShell>;
}
