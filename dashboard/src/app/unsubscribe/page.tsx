import { MarketingPreference } from "@/components/dashboard/MarketingPreference";
export default async function Unsubscribe({searchParams}:{searchParams:Promise<{token?:string}>}){
  const {token}=await searchParams;
  return <main style={{maxWidth:580,margin:"3rem auto"}}>{token?<MarketingPreference token={token}/>:<p>This unsubscribe link is incomplete.</p>}</main>;
}
