import { ClientView } from "@/components/dashboard/ClientView";
export default async function ClientDetail({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  return <ClientView section={section} detailId={id} />;
}
