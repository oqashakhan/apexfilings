"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminDemo } from "@/components/dashboard/AdminDemoContext";

const types = ["PROOF_OF_ADDRESS", "OWNER_ID", "BUSINESS_ADDRESS_PROOF", "FORMATION_SUPPORTING_DOCUMENT", "OTHER_SUPPORTING_DOCUMENT"];

export function AdminDocumentRequestForm({ applicationId, owners }: { applicationId: string; owners: { id: string; name: string }[] }) {
  const { refresh } = useAdminDemo();
  const [documentType, setDocumentType] = useState(types[0]);
  const [ownerId, setOwnerId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<{ id: string; documentType: string; reason: string; status: string }[]>([]);
  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/admin/applications/${applicationId}/document-requests`, { cache: "no-store" });
    if (response.ok) setRequests((await response.json()).requests);
  }, [applicationId]);
  useEffect(() => { const frame = requestAnimationFrame(() => { void load(); }); return () => cancelAnimationFrame(frame); }, [load]);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/applications/${applicationId}/document-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentType, ownerId: ownerId || undefined, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not request this document.");
      setReason(""); await Promise.all([refresh(), load()]); setMessage("Document request sent to the client.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not request this document."); }
    finally { setBusy(false); }
  }
  return <div className="admin-subcard admin-stack"><strong>Request a missing document</strong>{requests.length > 0 && <div className="admin-stack">{requests.map((item) => <div className="admin-row" key={item.id}><span>{item.documentType.replaceAll("_", " ")}</span><small>{item.status.replaceAll("_", " ")}</small></div>)}</div>}<div className="form-grid"><label>Document type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{types.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label><label>Related owner<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}><option value="">Company document</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label></div><label className="admin-form-field">What the client should provide<textarea rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the document needed and why" /></label><button className="button button-secondary" disabled={busy || reason.trim().length < 5 || (documentType === "OWNER_ID" && !ownerId)} onClick={() => void submit()}>{busy ? "Sending…" : "Send document request"}</button>{message && <p role="status">{message}</p>}</div>;
}
