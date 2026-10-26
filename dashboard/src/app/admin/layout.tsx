import { AdminDemoProvider } from "@/components/dashboard/AdminDemoContext";
import { requirePageRole } from "@/server/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("OWNER");
  return <AdminDemoProvider>{children}</AdminDemoProvider>;
}
