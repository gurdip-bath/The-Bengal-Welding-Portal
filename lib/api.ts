/**
 * API client for Grease Cleaning Service Plan billing.
 *
 * Uses Supabase Edge Functions and GoCardless on the backend.
 */

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CREATE_FLOW_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/create-checkout-session` : '';
const FINALIZE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/finalize-grease-plan` : '';

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return token;
}

export async function createGreasePlanCheckoutSession(customerEmail?: string): Promise<string> {
  if (!CREATE_FLOW_URL) throw new Error('VITE_SUPABASE_URL must be set');
  const token = await getAccessToken();
  const res = await fetch(CREATE_FLOW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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

export async function finalizeGreasePlanSubscription(billingRequestId: string): Promise<{ ok: true; subscription_id: string; status: string }> {
  if (!FINALIZE_URL) throw new Error('VITE_SUPABASE_URL must be set');
  const token = await getAccessToken();
  const res = await fetch(FINALIZE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ billing_request_id: billingRequestId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Finalize failed (${res.status})`);
  return data;
}

export interface ServiceRequestPayload {
  fullName: string;
  siteName?: string;
  businessAddress?: string;
  postcode?: string;
  contactName?: string;
  contactEmail: string;
  notes?: string;
  requestedDate: string; // ISO date (YYYY-MM-DD)
}

export async function createServiceRequest(payload: ServiceRequestPayload): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be signed in to request a service.');
  }

  const { error } = await supabase.from('service_requests').insert({
    user_id: session.user.id,
    full_name: payload.fullName.trim(),
    business_name: payload.siteName?.trim() || null,
    business_address: payload.businessAddress?.trim() || null,
    postcode: payload.postcode?.trim() || null,
    contact_name: payload.contactName?.trim() || null,
    contact_email: payload.contactEmail.trim().toLowerCase(),
    notes: payload.notes?.trim() || null,
    requested_date: payload.requestedDate,
  });

  if (error) {
    throw new Error(error.message || 'Failed to submit service request.');
  }
}
