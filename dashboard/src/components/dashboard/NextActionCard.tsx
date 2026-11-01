"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck, Clock3, ListChecks } from "lucide-react";
import type { ClientRecord } from "@/components/dashboard/ClientDemoContext";
import { StatusBadge } from "@/components/ui/DashboardUI";

export function NextActionCard({ application }: { application: ClientRecord }) {
  const action = application.nextAction;
  const Icon = action.kind === "action" ? ListChecks : action.kind === "complete" ? CircleCheck : Clock3;
  return <section className="next-action-card" aria-labelledby="next-action-title">
    <div className="next-action-heading"><span className="next-action-icon"><Icon size={20} /></span><div><span className="eyebrow accent">NEXT ACTION · {application.company.name}</span><h2 id="next-action-title">{action.title}</h2></div><StatusBadge status={application.status} /></div>
    <p>{action.description}</p>
    {action.documentRequests.length > 1 && <ul className="next-action-requests">{action.documentRequests.map((request) => <li key={request.id}>{request.documentType.replaceAll("_", " ")}</li>)}</ul>}
    <Link className="button button-primary next-action-cta" href={action.href}>{action.ctaLabel}<ArrowRight size={16} /></Link>
  </section>;
}
