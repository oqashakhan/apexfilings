import { Check, Clock3 } from "lucide-react";
import { Panel, StatusBadge } from "@/components/ui/DashboardUI";

type Event = { id: string; status: string; reason: string | null; date: string };

export function ApplicationProgress({ status, statusCode, submittedAt, history, nextStep }: { status: string; statusCode: string; submittedAt: string | null; history: Event[]; nextStep: string }) {
  const events = history.filter((event) => event.status !== "Draft");
  const submitted = submittedAt && !events.some((event) => event.status === "Application Submitted") ? [{ id: "submitted", status: "Application submitted", reason: null, date: submittedAt }] : [];
  const milestones = [...submitted, ...events];
  return <Panel title="Formation progress" subtitle="Recorded application events" action={<StatusBadge status={status} />}>
    {milestones.length ? <ol className="client-timeline" aria-label="Application progress">{milestones.map((event, index) => <li key={event.id}><span className="timeline-dot" /><div><strong><Check size={14} aria-hidden="true" /> {event.status}</strong>{event.reason && <p>{event.reason}</p>}<small>{new Date(event.date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}{index === milestones.length - 1 ? " · Current update" : ""}</small></div></li>)}</ol> : <p className="panel-body-copy">{statusCode === "DRAFT" ? "Your application is saved as a draft. Submit it when the details are ready." : "No progress events have been recorded yet."}</p>}
    <div className="client-next-step"><span className="concept-icon"><Clock3 size={18} /></span><div><strong>What happens next?</strong><p>{nextStep}</p></div></div>
    <p className="admin-muted">“Approved for Filing” is an internal decision, not government approval.</p>
  </Panel>;
}
