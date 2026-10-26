import { ClientView } from "@/components/dashboard/ClientView";
export default async function ClientSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <ClientView section={section} />;
}
