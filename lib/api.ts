/**
 * API client for Stripe checkout (Supabase Edge Function).
 * Grease Cleaning Service Plan — subscription only.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/create-checkout-session`
  : '';

export async function createGreasePlanCheckoutSession(customerEmail?: string): Promise<string> {
  if (!API_URL || !SUPABASE_ANON_KEY) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ customerEmail: customerEmail || undefined }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Checkout failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.url) throw new Error('No checkout URL returned');
  return data.url;
}
