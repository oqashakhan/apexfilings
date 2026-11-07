"use client";
import { useState } from 'react';

export function ClientReference({ value }: { value: string | null | undefined }) {
  const [notice, setNotice] = useState('');
  if (!value || !/^[1-9][0-9]{8}$/.test(value)) return <p role="status">Client Reference Number unavailable. Please contact support.</p>;
  async function copy() {
    try { await navigator.clipboard.writeText(value!); setNotice('Reference copied.'); }
    catch { setNotice('Select the reference number above to copy it.'); }
  }
  return <div className="admin-inline-actions"><span>Client Reference Number: <strong>{value}</strong></span><button type="button" className="button button-secondary" onClick={() => void copy()}>Copy Reference</button>{notice && <span role="status">{notice}</span>}</div>;
}
