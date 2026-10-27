"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader, Panel } from "@/components/ui/DashboardUI";
import { formationStates } from "@/lib/formation-states";
import { useClientDemo, type ClientRecord } from "@/components/dashboard/ClientDemoContext";

const companySchema = z.object({
  preferredName: z.string().trim().min(2, "Enter a preferred company name."),
  firstAlternativeName: z.string().trim().min(2, "Enter a first alternative company name."),
  formationState: z.string().min(1, "Choose a formation state."),
  businessActivity: z.string().trim().min(2, "Enter a business activity."),
  description: z.string().trim().min(8, "Add a short business description."),
  addressRequirement: z.string().min(1, "Choose a business address option."),
  membership: z.enum(["single", "multi"]),
  management: z.enum(["member-managed", "manager-managed"]),
});
const ownerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a legal name."),
  email: z.email("Enter a valid email."),
  phone: z.string().trim().min(6, "Enter a phone number."),
  nationality: z.string().trim().min(2, "Enter the owner's nationality."),
  residence: z.string().trim().min(2, "Enter the owner's country of residence."),
  address: z.string().trim().min(6, "Enter the owner's residential address."),
  ownership: z.coerce.number<number>().min(1).max(100),
});
type WizardValues = {
  preferredName: string; firstAlternativeName: string; secondAlternativeName: string;
  formationState: string; businessActivity: string; description: string;
  addressRequirement: string; membership: string; management: string; packageName: string;
  registeredAgentRequirement: string; einAssistance: string; bankingAssistance: string;
  paymentProcessingAssistance: string; additionalServices: string[];
  owners: { fullName: string; email: string; phone: string; nationality: string; residence: string; address: string; ownership: number }[];
};
const steps = ["Company Information", "Owner Information", "Additional Services", "Required Documents", "Review & Confirmation", "Payment Summary"];
const defaultValues: WizardValues = {
  preferredName: "", firstAlternativeName: "", secondAlternativeName: "",
  formationState: "", businessActivity: "", description: "",
  addressRequirement: "I need guidance", membership: "single", management: "member-managed", packageName: "Basic LLC Formation",
  registeredAgentRequirement: "Please advise", einAssistance: "Please advise",
  bankingAssistance: "Please advise", paymentProcessingAssistance: "Please advise",
  additionalServices: [], owners: [{ fullName: "", email: "", phone: "", nationality: "", residence: "", address: "", ownership: 100 }],
};

export function ApplicationWizard() {
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [furthestStep, setFurthestStep] = useState(0);
  const [draft, setDraft] = useState<ClientRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const { refresh, packages } = useClientDemo();
  const form = useForm<WizardValues>({ defaultValues, mode: "onBlur" });
  const resetForm = form.reset;
  const handoffApplied = useRef(false);
  const submittingRef = useRef(false);
  const owners = useFieldArray({ control: form.control, name: "owners" });
  const values = useWatch({ control: form.control, defaultValue: defaultValues }) as WizardValues;

  useEffect(() => {
    if (handoffApplied.current) return;
    const query = new URLSearchParams(window.location.search);
    if (query.has("draft")) return;
    const state = query.get("state");
    const plan = query.get("plan");
    if (!packages.length) return;
    if (state && formationStates.some((item) => item === state)) form.setValue("formationState", state);
    if (plan === "basic" || plan === "premium") {
      const selected = packages.find((item) => item.slug === plan);
      if (selected) form.setValue("packageName", selected.name);
      else { form.setValue("packageName", ""); setMessage("The selected website package is currently unavailable. Please review the available packages before continuing."); }
    } else {
      const basic = packages.find((item) => item.slug === "basic");
      form.setValue("packageName", basic?.name ?? "");
    }
    handoffApplied.current = true;
  }, [form, packages]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("draft");
    if (!id) return;
    let active = true;
    void fetch(`/api/v1/client/applications/${encodeURIComponent(id)}`, { cache: "no-store" }).then((response) => response.json()).then((result) => {
      if (!active || !result.application || result.application.statusCode !== "DRAFT") return;
      const item = result.application as ClientRecord & { packageSlug: string; additionalServices: string[]; company: ClientRecord["company"] & { alternatives: string[]; businessActivity: string; description: string; addressRequirement: string; membership: string; management: string; owners: { fullName: string; email: string; phone: string; nationality: string; residence: string; address: string; ownership: number }[] } };
      setDraft(item);
      resetForm({ ...defaultValues, preferredName: item.company.name, firstAlternativeName: item.company.alternatives[0] ?? "", secondAlternativeName: item.company.alternatives[1] ?? "", formationState: item.company.state, businessActivity: item.company.businessActivity, description: item.company.description, addressRequirement: item.company.addressRequirement, membership: item.company.membership, management: item.company.management, packageName: item.packageSlug === "premium" ? "Premium All-In" : "Basic LLC Formation", additionalServices: item.additionalServices, owners: item.company.owners.length ? item.company.owners : defaultValues.owners });
    }).catch(() => { if (active) setMessage("Could not load this draft."); });
    return () => { active = false; };
  }, [resetForm]);

  async function saveDraft() {
    const validOwners = values.owners.filter((owner) => ownerSchema.safeParse(owner).success);
    const selectedPackage = packages.find((item) => item.name === values.packageName);
    if (!selectedPackage || (selectedPackage.slug !== "basic" && selectedPackage.slug !== "premium")) throw new Error("This package is not available in the current dashboard catalog.");
    const payload = { preferredName: values.preferredName, firstAlternativeName: values.firstAlternativeName, secondAlternativeName: values.secondAlternativeName, formationState: values.formationState, businessActivity: values.businessActivity, description: values.description, addressRequirement: values.addressRequirement, membership: values.membership, management: values.management, packageSlug: selectedPackage.slug, additionalServices: values.additionalServices, owners: validOwners };
    const response = await fetch(draft ? `/api/v1/client/applications/${encodeURIComponent(draft.id)}` : "/api/v1/client/applications", { method: draft ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not save this application.");
    setDraft(result.application);
    if (!draft) window.history.replaceState(null, "", `/client/applications/new?draft=${encodeURIComponent(result.application.id)}`);
    await refresh();
    return result.application as ClientRecord;
  }

  async function next() {
    if (submittingRef.current) return;
    setMessage("");
    form.clearErrors();
    if (step === 0) {
      const result = companySchema.safeParse(values);
      if (!result.success) {
        result.error.issues.forEach((issue) => form.setError(issue.path[0] as keyof WizardValues, { type: "manual", message: issue.message }));
        setMessage("Check the highlighted company fields.");
        return;
      }
    }
    if (step === 1) {
      for (const [index, owner] of values.owners.entries()) {
        const result = ownerSchema.safeParse(owner);
        if (!result.success) {
          result.error.issues.forEach((issue) => form.setError(`owners.${index}.${String(issue.path[0])}` as `owners.${number}.fullName`, { type: "manual", message: issue.message }));
          setMessage("Check the highlighted owner fields.");
          return;
        }
      }
      if (values.membership === "multi") {
        if (values.owners.length < 2) { setMessage("Add at least two owners for a multi-member LLC."); return; }
        const total = values.owners.reduce((sum, owner) => sum + Number(owner.ownership || 0), 0);
        if (total !== 100) { setMessage("Owner percentages must total 100%."); return; }
      }
    }
    if (step === 4 && !confirmedReview) {
      setMessage("Confirm that you reviewed the application before submitting.");
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    try {
      if (step === 0 || step === 1 || step === 2) await saveDraft();
      if (step === 4) {
        if (!draft) throw new Error("Save the application first.");
        const response = await fetch(`/api/v1/client/applications/${encodeURIComponent(draft.id)}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed: true }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not submit the application.");
        setDraft(result.application);
        await refresh();
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); submittingRef.current = false; setBusy(false); return; }
    submittingRef.current = false;
    setBusy(false);
    setFurthestStep((current) => Math.max(current, step + 1));
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function upload(ownerId: string, file: File | undefined) {
    if (!draft || !file) return;
    setBusy(true); setMessage("");
    const data = new FormData();
    data.set("applicationId", draft.id); data.set("ownerId", ownerId); data.set("documentType", "OWNER_ID"); data.set("file", file);
    try {
      const response = await fetch("/api/v1/documents/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload failed.");
      setUploaded((current) => ({ ...current, [ownerId]: true }));
      setMessage("Document uploaded for review.");
      const updated = await fetch(`/api/v1/client/applications/${encodeURIComponent(draft.id)}`, { cache: "no-store" }).then((value) => value.json());
      if (updated.application) setDraft(updated.application);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); }
  }
  function back() {
    setMessage("");
    setStep((current) => Math.max(current - 1, 0));
  }
  function toggleService(service: string) {
    form.setValue("additionalServices", values.additionalServices.includes(service) ? values.additionalServices.filter((item) => item !== service) : [...values.additionalServices, service]);
  }

  return <DashboardShell role="client" title="New Application">
    <div className="backline"><Link href="/client/applications"><ArrowLeft size={16} /> My Applications</Link></div>
    <PageHeader eyebrow="US LLC FORMATION" title="Start a new application" description="Complete and save your US LLC formation application." />
    <div className="wizard-layout">
      <aside className="wizard-steps" aria-label="Application steps">{steps.map((name, index) => <button key={name} type="button" className={"wizard-step" + (index === step ? " current" : "") + (index < step ? " done" : "")} disabled={index > furthestStep} onClick={() => { setMessage(""); setStep(index); }} aria-current={index === step ? "step" : undefined}><span>{index < step ? <Check size={16} /> : String(index + 1).padStart(2, "0")}</span><div><strong>{name}</strong><small>{index < step ? "Completed" : index === step ? "Current step" : "Upcoming"}</small></div></button>)}</aside>
      <div className="wizard-content"><Panel className="wizard-panel"><div className="wizard-heading"><span className="eyebrow accent">STEP {step + 1} OF {steps.length}</span><h2>{steps[step]}</h2><p>{step === 3 ? "Upload an identification document for each owner. PDF, JPEG, or PNG; maximum 8 MB." : "Your progress is saved as a draft as you continue."}</p></div>
        {step === 0 && Object.keys(form.formState.errors).length > 0 && <div className="wizard-inline-errors" role="alert">{Object.entries(form.formState.errors).filter(([fieldName]) => fieldName !== "owners").map(([fieldName, error]) => <span key={fieldName}>{fieldName.replace(/([A-Z])/g, " $1")}: {error?.message as string}</span>)}</div>}
        {step === 0 && <><div className="form-grid"><label>Preferred LLC name <span>*</span><input {...form.register("preferredName")} placeholder="e.g. Northstar Studio LLC" /></label><label>First alternative company name <span>*</span><input {...form.register("firstAlternativeName")} placeholder="A backup LLC name" /></label><label>Second alternative company name<input {...form.register("secondAlternativeName")} placeholder="Optional second backup" /></label><label>Formation state <span>*</span><select {...form.register("formationState")}><option value="">Select a state</option>{formationStates.map((state) => <option key={state}>{state}</option>)}</select></label><label>Business activity <span>*</span><input {...form.register("businessActivity")} placeholder="e.g. Online consulting" /></label><label className="full-field">Business description <span>*</span><textarea {...form.register("description")} placeholder="A short description of what the company will do" /></label><label>Business address requirement<select {...form.register("addressRequirement")}><option>I need guidance</option><option>I have a US business address</option><option>I need a US business address</option></select></label><label>Membership<select value={values.membership} onChange={(event) => { form.setValue("membership", event.target.value); if (event.target.value === "single" && owners.fields.length > 1) owners.remove(Array.from({ length: owners.fields.length - 1 }, (_, i) => i + 1)); }}><option value="single">Single-member LLC</option><option value="multi">Multi-member LLC</option></select></label><label>Management structure<select {...form.register("management")}><option value="member-managed">Member-managed</option><option value="manager-managed">Manager-managed</option></select></label><label>Formation package<select {...form.register("packageName")}>{packages.length ? packages.map((item) => <option key={item.id} value={item.name}>{item.name}</option>) : <><option>Basic LLC Formation</option><option>Premium All-In</option></>}</select></label></div><p className="wizard-help">A first alternative name helps if the preferred name is unavailable. A multi-member LLC needs at least two owners and percentages totaling 100%. Management structure describes whether members or appointed managers run the company.</p></>}
        {step === 1 && <div className="owner-list">{owners.fields.map((field, index) => <div className="owner-card" key={field.id}><div className="owner-heading"><h3>Owner {index + 1}</h3>{index > 0 && <button className="icon-button" type="button" aria-label={"Remove owner " + (index + 1)} onClick={() => owners.remove(index)}><Trash2 size={17} /></button>}</div><div className="form-grid"><label>Full legal name <span>*</span><input {...form.register(`owners.${index}.fullName`)} /></label><label>Email <span>*</span><input type="email" {...form.register(`owners.${index}.email`)} /></label><label>Phone <span>*</span><input type="tel" {...form.register(`owners.${index}.phone`)} /></label><label>Ownership percentage <span>*</span><input type="number" min="1" max="100" {...form.register(`owners.${index}.ownership`, { valueAsNumber: true })} /></label><label>Nationality <span>*</span><input {...form.register(`owners.${index}.nationality`)} /></label><label>Country of residence <span>*</span><input {...form.register(`owners.${index}.residence`)} /></label><label className="full-field">Residential address <span>*</span><textarea {...form.register(`owners.${index}.address`)} /></label></div>{form.formState.errors.owners?.[index] && <div className="wizard-inline-errors" role="alert">{Object.entries(form.formState.errors.owners[index] ?? {}).map(([fieldName, error]) => <span key={fieldName}>{fieldName}: {String((error as { message?: string })?.message ?? "")}</span>)}</div>}</div>)}{values.membership === "multi" && <button type="button" className="button button-secondary" onClick={() => owners.append({ fullName: "", email: "", phone: "", nationality: "", residence: "", address: "", ownership: 0 })}><Plus size={16} /> Add another owner</button>}</div>}
        {step === 2 && <><p className="wizard-help">Tell us which approved services interest you. Availability and any separate fees will be confirmed before a real order.</p><div className="option-list">{[
          ["Registered Agent Service", "State-required agent support"],
          ["EIN Application Assistance", "Help preparing an EIN request"],
          ["US Address & Mail Forwarding", "Explore a US business address"],
          ["US Business Bank Account Support", "Banking application guidance"],
          ["Payment Processing Assistance", "Discuss payment provider options"],
        ].map(([service, detail]) => <label className="option-row" key={service}><span><strong>{service}</strong><small>{detail} · availability and fees to be confirmed</small></span><input type="checkbox" checked={values.additionalServices.includes(service)} onChange={() => toggleService(service)} /></label>)}</div><p className="wizard-help">Selections are interests only. Additional fees require separate confirmation.</p></>}
        {step === 3 && <><div className="wizard-document-list">{draft?.company.owners.map((owner) => <div key={owner.id}><strong>{owner.fullName} · government-issued identification</strong><span>{draft.documents.some((document) => document.documentType === "OWNER_ID" && document.ownerId === owner.id) || uploaded[owner.id] ? "Uploaded" : "Required"}</span><label className="button button-secondary">Choose file<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => void upload(owner.id, event.target.files?.[0])} disabled={busy} /></label></div>)}</div><p className="wizard-help">Files are stored privately and reviewed by the Apex Filings team. An uploaded document does not mean it has been accepted.</p></>}
        {step === 4 && <><div className="wizard-review-section"><div className="wizard-review-heading"><h3>Company information</h3><button className="text-action" onClick={() => setStep(0)}>Edit</button></div><div className="review-grid"><div><span>Preferred LLC name</span><strong>{values.preferredName || "Not entered"}</strong></div><div><span>Alternative names</span><strong>{values.firstAlternativeName}{values.secondAlternativeName ? ` · ${values.secondAlternativeName}` : ""}</strong></div><div><span>Formation state</span><strong>{values.formationState}</strong></div><div><span>Business activity</span><strong>{values.businessActivity}</strong></div><div><span>Description</span><strong>{values.description}</strong></div><div><span>Address, membership & management</span><strong>{values.addressRequirement} · {values.membership === "multi" ? "Multi-member" : "Single-member"} · {values.management}</strong></div></div></div><div className="wizard-review-section"><div className="wizard-review-heading"><h3>Owners</h3><button className="text-action" onClick={() => setStep(1)}>Edit</button></div><div className="review-grid">{values.owners.map((owner, index) => <div key={index}><span>Owner {index + 1} · {owner.ownership}%</span><strong>{owner.fullName}</strong><small>{owner.nationality} · {owner.residence}<br />{owner.email} · {owner.phone}</small></div>)}</div></div><div className="wizard-review-section"><div className="wizard-review-heading"><h3>Services, documents & package</h3><button className="text-action" onClick={() => setStep(2)}>Edit services</button></div><div className="review-grid"><div><span>Package</span><strong>{values.packageName}</strong></div><div><span>Service interests</span><strong>{values.additionalServices.length ? values.additionalServices.join(", ") : "None selected"}</strong></div><div><span>Document checklist</span><strong>{values.owners.length} owner ID item(s); secure upload required</strong></div><div><span>Government and additional fees</span><strong>To Be Confirmed</strong></div></div></div><label className="review-confirmation"><input type="checkbox" checked={confirmedReview} onChange={(event) => setConfirmedReview(event.target.checked)} /> I have reviewed the information and authorize submission of this application for Apex Filings review.</label></>}
        {step === 5 && <div className="payment-preview"><div className="fee-row"><span>Selected package</span><strong>{values.packageName}</strong></div><div className="fee-row"><span>Apex Filings service fee</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((packages.find((item) => item.name === values.packageName)?.serviceFeeCents ?? (values.packageName === "Premium All-In" ? 29900 : 19900)) / 100)}</strong></div><div className="fee-row"><span>Government filing fee · {values.formationState}</span><strong>To Be Confirmed</strong></div><div className="fee-row"><span>Additional service fees · {values.additionalServices.length} selected</span><strong>To Be Confirmed</strong></div><div className="fee-row"><span>Discounts</span><strong>To Be Confirmed</strong></div><div className="fee-row total"><span>Total payable</span><strong>To Be Confirmed</strong></div><p>Your application has been submitted. The order is awaiting confirmed fees and manual payment instructions. No payment has been verified and no filing has been made.</p><Link className="text-action wizard-tracker-link" href="/client/applications">View application tracker <ArrowRight size={16} /></Link></div>}
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="wizard-footer"><button type="button" className="button button-secondary" onClick={back} disabled={step === 0}><ArrowLeft size={16} /> Back</button>{step < steps.length - 1 && <button type="button" className="button button-primary" onClick={() => void next()} disabled={busy}>{step === 4 ? "Submit application" : "Continue"} <ArrowRight size={16} /></button>}</div>
      </Panel></div>
    </div>
  </DashboardShell>;
}
