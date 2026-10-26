import { AdminView } from "@/components/dashboard/AdminView";
export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <AdminView section={section} />;
}
