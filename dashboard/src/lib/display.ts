export const applicationStatuses = ["Draft", "Awaiting Payment", "Payment Received", "Under Review", "Information Required", "Awaiting Customer Confirmation", "Approved for Filing", "Filing in Progress", "Submitted to Authority", "Additional Action Required", "Completed", "On Hold", "Cancelled", "Refund Requested", "Refunded"] as const;
export const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
export const displayFee = (value: number | null) => value == null ? "To Be Confirmed" : money(value);
