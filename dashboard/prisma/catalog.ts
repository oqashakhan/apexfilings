// Approved dashboard service catalog and US LLC service fees.
// Inquiry-only services have no invented price.
export const adminPackages = [
  { id: "basic", name: "Basic LLC Formation", serviceFee: 199, includedServices: ["LLC formation", "Registered Agent Service — 1 Year", "Business Address — 1 Year", "EIN Application Assistance"], available: true },
  { id: "premium", name: "Premium All-In", serviceFee: 299, includedServices: ["Basic LLC Formation inclusions", "US Business Bank Account Application Assistance", "Payment Processor Application Guidance", "Priority Phone & Email Support"], available: true },
];
export const adminServices = [
  { id: "llc", name: "US LLC Formation", category: "Formation", description: "US limited liability company formation service.", status: "Available", packages: ["Basic LLC Formation", "Premium All-In"] },
  { id: "ein", name: "EIN Application Assistance", category: "Formation", description: "Assistance preparing an EIN application.", status: "Available", packages: ["Basic LLC Formation", "Premium All-In"] },
  { id: "agent", name: "Registered Agent Service", category: "Formation", description: "Registered agent service for US entities.", status: "Available", packages: ["Basic LLC Formation", "Premium All-In"] },
  { id: "address", name: "US Address & Mail Forwarding", category: "Formation", description: "Business address and mail services.", status: "Inquiry Only", packages: ["Basic LLC Formation", "Premium All-In"] },
  { id: "banking", name: "US Business Bank Account Support", category: "Formation", description: "Guidance for banking applications.", status: "Inquiry Only", packages: ["Premium All-In"] },
  { id: "agreement", name: "Operating Agreement", category: "Formation", description: "US LLC operating agreement service.", status: "Available", packages: [] },
  { id: "licenses", name: "Business Licenses & Permits", category: "Formation", description: "Business license and permit assistance.", status: "Available", packages: [] },
  { id: "itin", name: "ITIN Application", category: "Formation", description: "ITIN application assistance.", status: "Available", packages: [] },
  { id: "trademark", name: "Trademark Registration", category: "Formation", description: "Trademark registration assistance.", status: "Available", packages: [] },
  { id: "consultation", name: "Business Formation Consultation", category: "Formation", description: "Consultation about business formation.", status: "Available", packages: [] },
  { id: "annual", name: "Annual Report Filing", category: "Management", description: "Assistance with state annual reports.", status: "Inquiry Only", packages: [] },
  { id: "foreign-tax", name: "Tax Filing for Foreign-Owned LLCs", category: "Management", description: "Form 5472 and pro forma Form 1120 support.", status: "Inquiry Only", packages: [] },
  { id: "amendments", name: "LLC Amendments", category: "Management", description: "Assistance with company amendments.", status: "Inquiry Only", packages: [] },
  { id: "agent-change", name: "Change Registered Agent", category: "Management", description: "Registered agent change assistance.", status: "Inquiry Only", packages: [] },
  { id: "good-standing", name: "Certificate of Good Standing", category: "Management", description: "Certificate request assistance.", status: "Inquiry Only", packages: [] },
  { id: "reinstatement", name: "Reinstatement", category: "Management", description: "Company reinstatement assistance.", status: "Inquiry Only", packages: [] },
  { id: "resale", name: "Resale Certificate", category: "Management", description: "Resale certificate assistance.", status: "Available", packages: [] },
  { id: "dissolution", name: "LLC Dissolution", category: "Management", description: "Company dissolution assistance.", status: "Available", packages: [] },
  { id: "uk", name: "UK Ltd Formation", category: "Formation", description: "Future service; dashboard submissions are on hold.", status: "On Hold", packages: [] },
];
