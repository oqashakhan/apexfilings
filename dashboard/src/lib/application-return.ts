import { formationStates } from "@/lib/formation-states";

/** Only the public LLC handoff may choose a post-auth destination. */
export function safeApplicationReturn(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const url = new URL(value, "https://app.apexfilings.com");
    if (url.origin !== "https://app.apexfilings.com" || url.pathname !== "/client/applications/new" || url.hash) return null;
    if ([...url.searchParams.keys()].some((key) => key !== "state" && key !== "plan" && key !== "handoff")) return null;
    if (url.searchParams.getAll("state").length > 1 || url.searchParams.getAll("plan").length > 1 || url.searchParams.getAll("handoff").length > 1) return null;
    const state = url.searchParams.get("state");
    const plan = url.searchParams.get("plan");
    const handoff = url.searchParams.get("handoff");
    if (state && !formationStates.some((item) => item === state)) return null;
    if (plan && plan !== "basic" && plan !== "premium") return null;
    if (handoff && (handoff !== "1" || state || plan)) return null;
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (plan) params.set("plan", plan);
    if (handoff) params.set("handoff", handoff);
    return `/client/applications/new${params.size ? `?${params}` : ""}`;
  } catch { return null; }
}
