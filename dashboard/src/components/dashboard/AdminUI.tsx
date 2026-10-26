"use client";

import { useEffect, useId, useRef } from "react";

export function DemoDialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="admin-dialog" aria-labelledby={titleId} onCancel={onClose} onClose={onClose}>
    <div className="admin-dialog-head"><div><span className="eyebrow accent">OWNER ACTION</span><h2 id={titleId}>{title}</h2></div><button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>×</button></div>
    {children}
  </dialog>;
}

export function AdminTabs({ names, value, onChange, label }: { names: string[]; value: string; onChange: (name: string) => void; label: string }) {
  return <div className="tabs admin-tabs" role="tablist" aria-label={label}>{names.map((name) => <button key={name} type="button" role="tab" aria-selected={value === name} className={value === name ? "selected" : ""} onClick={() => onChange(name)}>{name}</button>)}</div>;
}

export function AdminField({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="admin-field"><span>{label}</span><strong>{value}</strong></div>;
}

export function DemoOnlyLine({ children }: { children: React.ReactNode }) {
  return <p className="admin-demo-line">{children}</p>;
}
