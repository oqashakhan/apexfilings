import Link from 'next/link';
import type { AdminCustomer } from '@/lib/admin-models';
export type AdminClientIdentityData = AdminCustomer;
export const clientIdentityText = (client?: AdminClientIdentityData | null) => `${client?.fullName?.trim() || 'Name not provided'} ${client?.clientReference ?? ''}`;
export function AdminClientIdentity({ client }: { client?: AdminClientIdentityData | null }) {
  const content = <><strong>{client?.fullName?.trim() || 'Name not provided'}</strong><small>Reference: {client?.clientReference ? `#${client.clientReference}` : 'Not assigned'}</small></>;
  return client?.id ? <Link className="admin-client-identity" href={`/admin/clients/${encodeURIComponent(client.id)}`}>{content}</Link> : <span className="admin-client-identity">{content}</span>;
}
