"use client";

import { useState } from "react";
import type { ClientRecord } from "@/components/dashboard/ClientDemoContext";
import { Panel } from "@/components/ui/DashboardUI";

export function DocumentRequests({ application, refresh }: { application: ClientRecord; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requests = application.nextAction.documentRequests;
  if (!requests.length && !application.documents.some((document) => document.replacesDocumentId && document.reviewStatus === "UNDER_REVIEW")) return null;
  async function upload(request: (typeof requests)[number], file: File | undefined) {
    if (!file) return;
    setBusy(request.id); setError(null); setNotice(null);
    try {
      const body = new FormData();
      body.set("file", file); body.set("applicationId", application.id); body.set("documentType", request.documentType);
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
    {requests.length ? <div className="document-request-list">{requests.map((request) => <div className="document-request-item" key={request.id}><div><strong>{request.documentType.replaceAll("_", " ")}</strong>{request.reason && <p>{request.reason}</p>}</div><label className="button button-secondary">{busy === request.id ? "Uploading…" : request.replacesDocumentId ? "Upload Replacement" : "Upload Document"}<input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={!!busy} onChange={(event) => { void upload(request, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label></div>)}</div> : <p className="panel-body-copy">Your replacement is awaiting review.</p>}
    {error && <p role="alert" className="document-request-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </Panel></div>;
}
