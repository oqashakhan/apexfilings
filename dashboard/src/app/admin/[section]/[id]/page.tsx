import { AdminView } from "@/components/dashboard/AdminView";
export default async function AdminDetail({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  return <AdminView section={section} detailId={id} />;
}
