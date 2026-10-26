import { ClientDemoProvider } from "@/components/dashboard/ClientDemoContext";
import { requirePageRole } from "@/server/session";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("CLIENT");
  return <ClientDemoProvider>{children}</ClientDemoProvider>;
}
