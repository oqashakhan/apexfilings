import { AdminView } from "@/components/dashboard/AdminView";
export default async function AdminSection({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ oauth_error?: string }> }) {
  const { section } = await params;
  return <AdminView section={section} oauthError={(await searchParams).oauth_error} />;
}
