export const identityDocumentTypes = ['OWNER_ID', 'CNIC', 'PASSPORT'] as const;
export function isIdentityDocument(type: string) { return (identityDocumentTypes as readonly string[]).includes(type); }
type IdentityFile = { id?: string; documentType: string; ownerId: string | null; reviewStatus: string; replacesDocumentId?: string | null };
export function ownerHasIdentity(documents: IdentityFile[], ownerId: string, acceptedOnly = false) {
  return documents.some(doc => doc.ownerId === ownerId && isIdentityDocument(doc.documentType) && (acceptedOnly ? doc.reviewStatus === 'ACCEPTED' : ['UNDER_REVIEW', 'ACCEPTED'].includes(doc.reviewStatus)) && !documents.some(later => doc.id && later.replacesDocumentId === doc.id));
}
