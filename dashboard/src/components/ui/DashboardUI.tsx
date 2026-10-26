"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: { label: string; href: string } }) {
  return <div className="page-header"><div>{eyebrow && <span className="eyebrow accent">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{action && <Link className="button button-primary" href={action.href}>{action.label}<ArrowRight size={17} /></Link>}</div>;
}

export function Panel({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={"panel " + className}>{(title || subtitle || action) && <div className="panel-heading"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{action}</div>}{children}</section>;
}

export function StatCard({ label, value, hint, icon: Icon, tone = "orange" }: { label: string; value: string; hint: string; icon: LucideIcon; tone?: string }) {
  return <div className="stat-card"><div className={"stat-icon tone-" + tone}><Icon size={21} /></div><span className="stat-label">{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = /completed|active|accepted|available|paid|recorded|approved|refunded/.test(normalized) ? "success" : /required|pending|review|progress|submitted|received|awaiting|requested/.test(normalized) ? "warning" : /cancelled|hold|replacement/.test(normalized) ? "danger" : "neutral";
  return <span className={"status-badge status-" + tone}><span />{status}</span>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return <div className="progress-wrap"><div className="progress-label"><span>{label}</span><strong>{value}%</strong></div><div className="progress-track"><span style={{ width: value + "%" }} /></div></div>;
}

export function EmptyState({ title = "No matching records", description = "Try another search or filter.", icon: Icon = Inbox }: { title?: string; description?: string; icon?: LucideIcon }) {
  return <div className="empty-state"><Icon size={27} /><strong>{title}</strong><p>{description}</p></div>;
}

export type TableColumn<T> = { heading: string; render: (row: T) => React.ReactNode };
export function DataTable<T extends object>({ rows, columns, queryPlaceholder = "Search records...", filterOptions, filterValue, onFilterChange, searchText, onSearchChange, searchMatcher }: {
  rows: T[]; columns: TableColumn<T>[]; queryPlaceholder?: string; filterOptions?: string[]; filterValue?: string; onFilterChange?: (value: string) => void; searchText?: string; onSearchChange?: (value: string) => void; searchMatcher?: (row: T, query: string) => boolean;
}) {
  const [internalSearch, setInternalSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = searchText ?? internalSearch;
  const setQuery = onSearchChange ?? setInternalSearch;
  const filtered = useMemo(() => rows.filter((row) => searchMatcher ? searchMatcher(row, query.toLowerCase()) : JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [rows, query, searchMatcher]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * 6, safePage * 6);
  return <>
    <div className="table-toolbar"><label className="table-search"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={queryPlaceholder} aria-label={queryPlaceholder} /></label>{filterOptions && <select aria-label="Filter status" value={filterValue ?? "All statuses"} onChange={(event) => { onFilterChange?.(event.target.value); setPage(1); }}><option>All statuses</option>{filterOptions.map((option) => <option key={option}>{option}</option>)}</select>}</div>
    <div className="table-scroll">{visible.length ? <table className="data-table"><thead><tr>{columns.map((column) => <th key={column.heading}>{column.heading}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.heading}>{column.render(row)}</td>)}</tr>)}</tbody></table> : <EmptyState />}</div>
    <div className="table-footer"><span>Showing {filtered.length ? (safePage - 1) * 6 + 1 : 0}–{Math.min(safePage * 6, filtered.length)} of {filtered.length} records</span><div><button className="icon-button" aria-label="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><ChevronLeft size={17} /></button><span>{safePage} / {pageCount}</span><button className="icon-button" aria-label="Next page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><ChevronRight size={17} /></button></div></div>
  </>;
}

export function PreviewNotice({ children }: { children: React.ReactNode }) {
  return <div className="preview-notice"><span className="preview-pulse" />{children}</div>;
}
