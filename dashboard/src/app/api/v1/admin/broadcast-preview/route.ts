import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireRole, handleError, json } from '@/server/http';

// Read-only candidate search. This does not assert consent or delivery eligibility.
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'OWNER');
    const search = request.nextUrl.searchParams.get('search')?.trim().slice(0, 120) ?? '';
    const applicationsOnly = request.nextUrl.searchParams.get('applications') === 'true';
    const page = Math.max(1, Math.min(10000, Number(request.nextUrl.searchParams.get('page')) || 1));
    const where = { role: 'CLIENT' as const, status: 'ACTIVE' as const, emailVerifiedAt: { not: null }, ...(applicationsOnly ? { applications: { some: {} } } : {}), ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' as const } }, { emailNormalized: { contains: search.toLowerCase(), mode: 'insensitive' as const } }, { clientReference: search }] } : {}) };
    const [rows, total] = await Promise.all([db.user.findMany({ where, select: { id: true, fullName: true, email: true, clientReference: true }, orderBy: [{ fullName: 'asc' }, { id: 'asc' }], skip: (page - 1) * 25, take: 25 }), db.user.count({ where })]);
    return json({ candidates: rows.map(row => ({ ...row, validEmail: z.email().safeParse(row.email).success })), total, page, pageSize: 25 });
  } catch (error) { return handleError(error); }
}
