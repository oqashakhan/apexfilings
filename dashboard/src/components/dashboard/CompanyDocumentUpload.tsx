"use client";
import { useEffect, useRef, useState } from 'react';

type Props = {
  clientId: string; clientName: string; companyId: string;
  companies: { id: string; name: string }[]; onCompany: (id: string) => void;
  applicationId: string; applications: { id: string; preferredName: string; reference?: string }[]; onApplication: (id: string) => void;
  onClose: () => void; onUploaded: (visible: boolean) => Promise<void>;
};
export function CompanyDocumentUpload(props: Props) {
  const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [type, setType] = useState('COMPANY_DOCUMENT');
  const [file, setFile] = useState<File | null>(null), [visible, setVisible] = useState(true), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState('');
  const key = useRef(''), active = useRef(false);
  const onClose = props.onClose;
  useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !active.current) onClose(); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [onClose]);
  function changed() { key.current = ''; setError(''); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (active.current) return;
    if (!file || !title.trim() || !props.applicationId) { setError('Choose an application, enter a title and select a file.'); return; }
    if (!file.size || file.size > 8 * 1024 * 1024 || !['application/pdf','image/jpeg','image/png'].includes(file.type)) { setError('Select a PDF, JPEG or PNG between 1 byte and 8 MB.'); return; }
    active.current = true; setBusy(true); setProgress(0); setError('');
    if (!key.current) key.current = crypto.randomUUID();
    const form = new FormData();
    for (const [name,value] of Object.entries({ applicationId: props.applicationId, companyId: props.companyId, customerId: props.clientId, documentType: type, title: title.trim(), description: description.trim(), finalDocument: 'true', shareWithClient: String(visible), idempotencyKey: key.current })) form.set(name,value);
    form.set('file',file);
    try {
      const actualVisible = await new Promise<boolean>((resolve,reject) => {
        const request = new XMLHttpRequest(); request.open('POST','/api/v1/documents/upload'); request.timeout = 120000;
        request.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.min(100,Math.round(event.loaded / event.total * 100))); };
        request.onerror = () => reject(new Error('Connection interrupted. Retry this upload to safely resume.'));
        request.ontimeout = () => reject(new Error('Upload timed out. Retry; your upload key prevents duplicate records.'));
        request.onload = () => { try { const result = JSON.parse(request.responseText); if (request.status < 200 || request.status >= 300) throw new Error(result.error ?? 'Upload failed.'); if (typeof result.document?.id !== "string") throw new Error("Upload result could not be confirmed. Retry safely."); resolve(result.document.clientVisible === true); } catch (cause) { reject(cause instanceof Error ? cause : new Error('Upload could not be confirmed. Retry safely.')); } };
        request.send(form);
      });
      await props.onUploaded(actualVisible);
      props.onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed. Please try again.'); }
    finally { active.current = false; setBusy(false); }
  }
  return <div className="client-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) props.onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="company-document-upload-title" className="company-document-upload-dialog">
      <div className="client-service-dialog-head"><h2 id="company-document-upload-title">Upload a company document</h2><button type="button" className="icon-button" disabled={busy} onClick={props.onClose} aria-label="Close upload form">×</button></div>
      <p>Client: <strong>{props.clientName}</strong></p>
      {!props.applications.length && <p role="alert">Choose a company with an existing application before uploading a company document.</p>}
      <form onSubmit={event => void submit(event)} className="admin-stack">
        <fieldset disabled={busy} className="company-document-fields"><div className="form-grid">
          <label>Company<select aria-label="Document company" value={props.companyId} onChange={event => { changed(); props.onCompany(event.target.value); }}>{props.companies.map(company => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
          <label>Application<select aria-label="Document application" value={props.applicationId} onChange={event => { changed(); props.onApplication(event.target.value); }} required><option value="" disabled>Choose an application</option>{props.applications.map(app => <option value={app.id} key={app.id}>{app.preferredName} · {app.reference ?? 'Reference pending'}</option>)}</select></label>
          <label>Document title<input value={title} onChange={event => { changed(); setTitle(event.target.value); }} maxLength={160} required /></label>
          <label>Document type<select value={type} onChange={event => { changed(); setType(event.target.value); }}>{[['COMPANY_DOCUMENT','Company document'],['CERTIFICATE_OF_FORMATION','Certificate of Formation'],['ARTICLES_OF_ORGANIZATION','Articles of Organization'],['OPERATING_AGREEMENT','Operating Agreement'],['EIN_CONFIRMATION','EIN confirmation'],['FILING_RECEIPT','Filing receipt']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>PDF, JPEG or PNG<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => { changed(); const next = event.target.files?.[0] ?? null; setFile(next); if (!title.trim() && next) setTitle(next.name.slice(0,160)); }} required /></label>
        </div><small>Maximum 8 MB. Stored privately; never attached to email.</small><label className="admin-form-field">Description (optional)<textarea rows={3} value={description} onChange={event => { changed(); setDescription(event.target.value); }} maxLength={2000} /></label>
        <label className="admin-form-field"><span><input type="checkbox" checked={visible} onChange={event => { changed(); setVisible(event.target.checked); }} /> Visible to client</span></label></fieldset>
        {busy && <div role="status"><progress max={100} value={progress} aria-label="Document upload progress" /><p>{progress < 100 ? `Uploading ${progress}%` : visible ? 'Saving document and notification…' : 'Saving private document…'}</p></div>}
        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="admin-inline-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={props.onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={busy || !props.applicationId}>{busy ? 'Uploading…' : 'Upload document'}</button></div>
      </form>
    </section>
  </div>;
}
