import { AuthScreen } from "@/components/forms/AuthScreen";
import { safeApplicationReturn } from "@/lib/application-return";
import { serverActor } from "@/server/session";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeApplicationReturn((await searchParams).next);
  const user = await serverActor();
  if (user) redirect(user.role === "OWNER" ? "/admin/dashboard" : next ?? "/client/dashboard");
  return <AuthScreen mode="login" next={next} googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />;
}
