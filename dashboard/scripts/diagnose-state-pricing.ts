import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import references from '../prisma/state-pricing-reference.json';
import { diagnoseStateFee } from '../src/lib/state-fee-diagnostics';

// Read only. Run in the deployed dashboard container to inspect its own DATABASE_URL.
loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
  await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const identity = await tx.$queryRawUnsafe<{ database: string }[]>('SELECT current_database() AS database');
    const migrations = await tx.$queryRawUnsafe<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]>('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
    const expected = readdirSync(resolve(process.cwd(), 'prisma/migrations'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    const applied = new Set(migrations.filter(m => m.finished_at && !m.rolled_back_at).map(m => m.migration_name));
    const pendingMigrations = expected.filter(name => !applied.has(name));
    const failedMigrations = migrations.filter(m => !m.finished_at && !m.rolled_back_at).map(m => m.migration_name);
    // JSON permits diagnosis of old schemas without referencing nonexistent columns.
    const rows = await tx.$queryRawUnsafe<{ record: Record<string, unknown> }[]>('SELECT to_jsonb(s) AS record FROM "StateFilingFee" s');
    const states = references.map(reference => {
      const record = rows.find(r => r.record.code === reference.code)?.record;
      const missingColumns = record ? ['referenceFilingFeeCents', 'filingFeeCents', 'active', 'verifiedAt', 'sourceReference'].filter(key => !(key in record)) : [];
      const diagnostic = diagnoseStateFee(record ? {
        filingFeeCents: typeof record.filingFeeCents === 'number' ? record.filingFeeCents : null,
        active: record.active === true,
        verifiedAt: typeof record.verifiedAt === 'string' ? record.verifiedAt : null,
        sourceReference: typeof record.sourceReference === 'string' ? record.sourceReference : null,
      } : null);
      return { code: reference.code, state: record?.state ?? null, referenceFilingFeeCents: record?.referenceFilingFeeCents ?? null, expectedReferenceCents: reference.referenceFilingFeeCents,
        referenceMatches: !!record && record.referenceFilingFeeCents === reference.referenceFilingFeeCents,
        filingFeeCents: record?.filingFeeCents ?? null, active: record?.active ?? false, verifiedAt: record?.verifiedAt ?? null,
        sourceConfigured: typeof record?.sourceReference === 'string' && record.sourceReference.startsWith('https://'), missingColumns, ...diagnostic };
    });
    console.log(JSON.stringify({ database: identity[0].database, pendingMigrations, failedMigrations, approvedStates: states.filter(s => s.status === 'APPROVED').length, states }, null, 2));
    if (pendingMigrations.length || failedMigrations.length || states.some(s => s.missingColumns.length || !s.referenceMatches)) process.exitCode = 1;
  });
}
main().catch(() => { console.error('Pricing diagnostic could not read the configured database. Check connectivity and migration tables; no changes were made.'); process.exitCode = 1; }).finally(() => db.$disconnect());
