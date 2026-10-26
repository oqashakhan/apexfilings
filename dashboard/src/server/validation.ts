import { z } from "zod";

export const ownerInput = z.object({
  fullName: z.string().trim().min(2).max(160), email: z.email().max(254), phone: z.string().trim().min(5).max(40),
  nationality: z.string().trim().min(2).max(100), residence: z.string().trim().min(2).max(100), address: z.string().trim().min(6).max(500),
  ownership: z.number().min(0).max(100),
});

export const applicationDraftInput = z.object({
  preferredName: z.string().trim().min(2).max(200), firstAlternativeName: z.string().trim().min(2).max(200), secondAlternativeName: z.string().trim().max(200).optional().default(""),
  formationState: z.string().trim().min(2).max(100), businessActivity: z.string().trim().min(2).max(200), description: z.string().trim().min(8).max(2000),
  addressRequirement: z.string().trim().min(2).max(200), membership: z.enum(["single", "multi"]), management: z.enum(["member-managed", "manager-managed"]),
  packageSlug: z.enum(["basic", "premium"]), additionalServices: z.array(z.string().trim().min(2).max(120)).max(20),
  owners: z.array(ownerInput).max(10),
});

export const statusInput = z.object({ status: z.enum(["DRAFT", "AWAITING_PAYMENT", "PAYMENT_RECEIVED", "UNDER_REVIEW", "INFORMATION_REQUIRED", "AWAITING_CUSTOMER_CONFIRMATION", "APPROVED_FOR_FILING", "FILING_IN_PROGRESS", "SUBMITTED_TO_AUTHORITY", "ADDITIONAL_ACTION_REQUIRED", "COMPLETED", "ON_HOLD", "CANCELLED", "REFUND_REQUESTED", "REFUNDED"]), reason: z.string().trim().min(3).max(1000) });
