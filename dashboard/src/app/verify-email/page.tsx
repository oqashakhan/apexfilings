import { safeApplicationReturn } from "@/lib/application-return";
import { VerifyEmailScreen } from "@/components/forms/VerifyEmailScreen";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const query = await searchParams;
  return <VerifyEmailScreen next={safeApplicationReturn(query.next)} legacyToken={typeof query.token === "string" ? query.token : null} />;
}
