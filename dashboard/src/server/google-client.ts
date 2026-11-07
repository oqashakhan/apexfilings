import type { Prisma } from '@prisma/client';

// Called only after the OAuth route validates Google's verified identity claims.
// The same database trigger as email registration assigns clientReference.
export function createGoogleClient(tx: Prisma.TransactionClient, input: { fullName: string; normalizedEmail: string; subject: string }) {
  return tx.user.create({ data: { fullName: input.fullName, email: input.normalizedEmail, emailNormalized: input.normalizedEmail, emailVerifiedAt: new Date(), role: 'CLIENT', googleAccounts: { create: { subject: input.subject } } } });
}
