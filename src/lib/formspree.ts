const DEFAULT_FORMSPREE_ENDPOINT = 'https://formspree.io/f/xqpeojbg';

const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT?.trim() || DEFAULT_FORMSPREE_ENDPOINT;

export async function submitInquiry(fields: Record<string, string>): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
  });

  if (!response.ok) throw new Error(`Formspree returned ${response.status}`);
}
