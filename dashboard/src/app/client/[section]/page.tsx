import { ClientView } from "@/components/dashboard/ClientView";
export default async function ClientSection({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ oauth_error?: string }> }) {
  const { section } = await params;
  return <ClientView section={section} oauthError={(await searchParams).oauth_error} />;
}
