import { FileText } from "lucide-react";
import type { ClientRecord } from "@/components/dashboard/ClientDemoContext";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui/DashboardUI";

type Document = ClientRecord["documents"][number] & { applicationId: string };
const label = (value: string) => value.replaceAll("_", " ");
function Files({ items }: { items: Document[] }) {
  if (!items.length) return <p className="panel-body-copy">No documents in this category.</p>;
  return <div className="client-document-list">{items.map((item) => <div key={item.id}><span className="concept-icon"><FileText size={18} /></span><div className="document-copy"><strong>{label(item.documentType)}</strong><small>{item.originalFilename} · {new Date(item.createdAt).toLocaleDateString()}</small></div><StatusBadge status={label(item.reviewStatus)} />{["ACCEPTED", "COMPLETED_COMPANY_DOCUMENT"].includes(item.reviewStatus) && <a className="text-action" href={`/api/v1/documents/${item.id}`}>Download</a>}</div>)}</div>;
}

export function ClientDocumentCenter({ applications }: { applications: ClientRecord[] }) {
  const documents = applications.flatMap((item) => item.documents.map((document) => ({ ...document, applicationId: item.id })));
  const required = applications.flatMap((item) => item.requiredDocuments.filter((requirement) => !item.documents.some((document) => document.documentType === requirement.documentType && document.reviewStatus !== "REPLACEMENT_REQUIRED")).map((requirement) => ({ ...requirement, applicationId: item.id })));
  const attention = documents.filter((item) => item.reviewStatus === "REPLACEMENT_REQUIRED" && !documents.some((replacement) => replacement.replacesDocumentId === item.id));
  const official = documents.filter((item) => item.reviewStatus === "COMPLETED_COMPANY_DOCUMENT");
  const uploaded = documents.filter((item) => item.reviewStatus !== "COMPLETED_COMPANY_DOCUMENT" && item.reviewStatus !== "REPLACEMENT_REQUIRED");
  return <><PageHeader eyebrow="DOCUMENT CENTER" title="Documents" description="Private files for your selected company." />{!applications.length ? <EmptyState title="No company selected" description="Start an application to see its document requirements." /> : <><Panel title="Required documents" subtitle="Outstanding requirements from your service"><div className="admin-stack">{required.map((item) => <div className="admin-row admin-subcard" key={`${item.applicationId}:${item.id}`}><strong>{label(item.documentType)}</strong><span>Not provided</span></div>)}{!required.length && <p className="panel-body-copy">No outstanding document requirements are listed.</p>}</div></Panel><Panel title="Documents needing attention"><Files items={attention} /></Panel><Panel title="Uploaded documents"><Files items={uploaded} /></Panel><Panel title="Official and completed documents" subtitle="Shown only after Apex Filings shares a file with you"><Files items={official} /></Panel></>}</>;
}
