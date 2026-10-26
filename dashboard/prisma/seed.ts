import { PrismaClient } from "@prisma/client";
import { adminServices, adminPackages } from "./catalog";
import stateFees from "../src/lib/admin-state-fees.json";

const db = new PrismaClient();

async function main() {
  // Catalog only: no fictitious customer, owner, payment, or identity records.
  for (const item of adminServices) {
    await db.service.upsert({ where: { slug: item.id }, update: {}, create: { slug: item.id, name: item.name, category: item.category, description: item.description, available: item.status === "Available" } });
  }
  for (const item of adminPackages) {
    await db.package.upsert({ where: { slug: item.id }, update: {}, create: { slug: item.id, name: item.name, serviceFeeCents: item.serviceFee * 100, includedServices: item.includedServices, available: item.available } });
  }
  for (const item of stateFees) {
    // Prior public-site state amounts are estimates without a verified date.
    // Keep the authoritative database fee unconfigured until verified.
    await db.stateFilingFee.upsert({ where: { code: item.code }, update: { state: item.state }, create: { code: item.code, state: item.state, filingFeeCents: null, additionalFeeNotes: "Unverified; confirm before quoting or charging." } });
  }
  const llc = await db.service.findUniqueOrThrow({ where: { slug: "llc" } });
  await db.serviceDocumentRequirement.upsert({ where: { id: "llc-owner-id" }, update: {}, create: { id: "llc-owner-id", serviceId: llc.id, documentType: "OWNER_ID", required: true } });
  for (const area of ["homepage", "services", "pricing", "faq"]) {
    await db.contentDraft.upsert({ where: { area }, update: {}, create: { area, title: `${area[0].toUpperCase()}${area.slice(1)} draft`, body: "" } });
  }
  console.info("Catalog seeded; no customer, payment, or government fee records were created.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
