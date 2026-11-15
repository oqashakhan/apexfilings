"use client";

import { useState } from "react";
import type { ClientRecord } from "@/components/dashboard/ClientDemoContext";
import { Panel } from "@/components/ui/DashboardUI";

export function DocumentRequests({ application, refresh }: { application: ClientRecord; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tracked = application.documentRequests.map(request => {
    let file = application.documents.find(document => document.requestId === request.id);
    while (file) { const next = application.documents.find(document => document.replacesDocumentId === file?.id); if (!next) break; file = next; }
    return { ...request, documentType:file?.documentType ?? request.documentType, reason: file?.reviewStatus === "REPLACEMENT_REQUIRED" ? file.reviewReason || request.reason : request.reason, requestId: request.id, replacesDocumentId: file?.reviewStatus === "REPLACEMENT_REQUIRED" ? file.id : null, status: request.cancelledAt ? "CANCELLED" : file?.reviewStatus ?? "REQUESTED" };
  });
  const [identity,setIdentity]=useState<Record<string,string>>({});
  const requests = [...tracked, ...application.nextAction.documentRequests.filter(request => !tracked.some(item => item.id === request.requestId || item.replacesDocumentId === request.replacesDocumentId && request.replacesDocumentId)).map(request => ({ ...request, status: request.replacesDocumentId ? "REPLACEMENT_REQUIRED" : "REQUESTED" }))];
  if (!requests.length) return null;
  async function upload(request: (typeof requests)[number], file: File | undefined) {
    if (!file) return;
    setBusy(request.id); setError(null); setNotice(null);
    try {
      const body = new FormData();
      body.set("file", file); body.set("applicationId", application.id); body.set("documentType", request.documentType==="OWNER_ID" && !request.replacesDocumentId ? identity[request.id] || "PASSPORT" : request.documentType);
      if (request.ownerId) body.set("ownerId", request.ownerId);
      if (request.replacesDocumentId) body.set("replacesDocumentId", request.replacesDocumentId);
      else if (request.requestId) body.set("requestId", request.requestId);
      else body.set("requirementId", request.id.split(":")[0]);
      const response = await fetch("/api/v1/documents/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The document could not be uploaded.");
      await refresh();
      setNotice("Document received. It is awaiting review.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The document could not be uploaded."); }
    finally { setBusy(null); }
  }
  return <div id="document-requests" className="document-requests-anchor"><Panel title="Document requests" subtitle="Upload files for this application only">
    <div className="document-request-list">{requests.map((request) => <div className="document-request-item" key={request.id}><div><strong>{("customTitle" in request && request.customTitle) || request.documentType.replaceAll("_", " ")}</strong>{"dueDate" in request && request.dueDate && <p>Due {request.dueDate.slice(0,10)}</p>}<p>{application.company.name} · {({ REQUESTED: "Requested", UNDER_REVIEW: "Uploaded · Pending review", ACCEPTED: "Approved", REPLACEMENT_REQUIRED: "Reupload required" } as Record<string,string>)[request.status] ?? request.status.replaceAll("_", " ")}</p>{request.reason && <p>{request.reason}</p>}</div>{request.documentType==="OWNER_ID" && request.status==="REQUESTED" && <label>Identity document<select value={identity[request.id] || "PASSPORT"} onChange={e=>setIdentity({...identity,[request.id]:e.target.value})}><option value="PASSPORT">Passport</option><option value="CNIC">CNIC</option></select></label>}{["REQUESTED", "REPLACEMENT_REQUIRED"].includes(request.status) && <label className="button button-secondary">{busy === request.id ? "Uploading…" : request.replacesDocumentId ? "Upload Replacement" : "Upload Document"}<input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={!!busy} onChange={(event) => { void upload(request, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>}</div>)}</div>
    {error && <p role="alert" className="document-request-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </Panel></div>;
}
