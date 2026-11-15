import Link from "next/link";
import { requirePageRole } from "@/server/session";
import { db } from "@/server/db";
import { DocumentRequestEditor } from "@/components/dashboard/AdminDocumentRequestForm";
import { StaffActions } from "@/components/dashboard/StaffActions";
import { AccountSecurity } from "@/components/dashboard/AccountSecurity";

export default async function StaffPage({searchParams}:{searchParams:Promise<{page?:string;q?:string}>}) {
  const user=await requirePageRole("STAFF");
  const params=await searchParams,page=Math.max(1,Math.min(10000,Math.floor(Number(params.page)||1))),q=params.q?.trim().slice(0,120)??"";
  const customer={select:{fullName:true,clientReference:true}};
  const appWhere={assignedStaffId:user.id,...(q?{OR:[{company:{preferredName:{contains:q,mode:"insensitive" as const}}},{customer:{fullName:{contains:q,mode:"insensitive" as const}}},{customer:{clientReference:q}}]}:{})};
  const ticketWhere={assignedToId:user.id,...(q?{OR:[{subject:{contains:q,mode:"insensitive" as const}},{customer:{fullName:{contains:q,mode:"insensitive" as const}}},{customer:{clientReference:q}}]}:{})};
  const paging={take:20,skip:20*(page-1),orderBy:{id:"asc" as const}};
  const [apps,tickets,appCount,ticketCount,notices]=await Promise.all([
    db.application.findMany({where:appWhere,...paging,select:{id:true,status:true,customer,company:{select:{preferredName:true,owners:{select:{id:true,fullLegalName:true}}}},documents:{select:{id:true,documentType:true,reviewStatus:true}},order:{select:{invoice:{select:{id:true,number:true,lifecycle:true}}}}}}),
    db.supportTicket.findMany({where:ticketWhere,...paging,select:{id:true,subject:true,status:true,customer,body:true,replies:{orderBy:{createdAt:"asc"},select:{body:true,author:{select:{fullName:true}}}}}}),
    db.application.count({where:appWhere}),db.supportTicket.count({where:ticketWhere}),db.notification.findMany({where:{userId:user.id,type:"STAFF_ASSIGNMENT"},orderBy:{createdAt:"desc"},take:8,select:{id:true,title:true,message:true}})]);
  return <main className="admin-stack" style={{maxWidth:980,margin:"2rem auto",padding:"1rem"}}><h1>Staff workspace</h1><StaffActions kind="logout" id="logout"/><form><label>Search assigned work<input name="q" defaultValue={q}/></label><button>Search</button></form>
    <section><h2>Assigned applications ({appCount})</h2>{apps.map(a=><details key={a.id} className="admin-subcard"><summary>{a.company.preferredName} · {a.customer.fullName} #{a.customer.clientReference}</summary><p>{a.status.replaceAll("_"," ")}</p>
      {a.order?.invoice && ["ISSUED","VOIDED"].includes(a.order.invoice.lifecycle) &&<a className="table-link" href={"/api/v1/invoices/"+a.order.invoice.id+"/pdf"}>Invoice {a.order.invoice.number} PDF</a>}
      <DocumentRequestEditor applicationId={a.id} owners={a.company.owners.map(o=>({id:o.id,name:o.fullLegalName}))}/>
      {a.documents.map(d=><div key={d.id}><a href={"/api/v1/documents/"+d.id+"?view=1"}>{d.documentType.replaceAll("_"," ")}</a> · {d.reviewStatus.replaceAll("_"," ")}{d.reviewStatus==="UNDER_REVIEW"&&<StaffActions kind="review" id={d.id}/>}</div>)}</details>)}</section>
    <section><h2>Assigned tickets ({ticketCount})</h2>{tickets.map(t=><details key={t.id} className="admin-subcard"><summary>{t.subject} · {t.customer.fullName} #{t.customer.clientReference}</summary><p>{t.status.replaceAll("_"," ")} · {t.body}</p>{t.replies.map((r,i)=><p key={i}><strong>{r.author.fullName}</strong> {r.body}</p>)}<StaffActions kind="reply" id={t.id}/><StaffActions kind="status" id={t.id}/></details>)}</section>
    <nav>{page>1&&<Link href={{pathname:"/staff",query:{q,page:page-1}}}>Previous </Link>}{page*20<Math.max(appCount,ticketCount)&&<Link href={{pathname:"/staff",query:{q,page:page+1}}}>Next</Link>}</nav>
    <section><h2>Assignment notifications</h2>{notices.map(n=><p key={n.id}>{n.title} · {n.message}</p>)}</section><AccountSecurity/></main>;
}
