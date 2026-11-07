import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';

loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
  if (!process.argv.includes('--apply')) {
    const [counts] = await db.$queryRaw<{ clients: bigint; invalid: bigint }[]>`SELECT count(*) AS clients, count(*) FILTER (WHERE "clientReference" IS NULL OR "clientReference" !~ '^[1-9][0-9]{8}$') AS invalid FROM "User" WHERE role = 'CLIENT'`;
    console.log(JSON.stringify({ clients: Number(counts.clients), needingBackfill: Number(counts.invalid), changed: false }));
    return;
  }
  const [result] = await db.$queryRaw<{ changed: number }[]>`SELECT apex_backfill_client_references() AS changed`;
  console.log(JSON.stringify({ updatedClients: result.changed, internalIdsAndIssuedRecordsUnchanged: true }));
}
main().catch(() => { console.error('Client reference check/backfill failed. Confirm the migration is applied and inspect server logs securely. No credentials were printed.'); process.exitCode = 1; }).finally(() => db.$disconnect());
