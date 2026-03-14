/**
 * Service requests API – list, approve, reject.
 */

import { supabase } from './supabase';

export type ServiceRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ServiceRequestRow {
  id: string;
  user_id: string;
  full_name: string;
  business_name: string | null;
  business_address: string | null;
  postcode: string | null;
  contact_name: string | null;
  contact_email: string;
  notes: string | null;
  requested_date: string;
  status: ServiceRequestStatus;
  admin_notes: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  access_difficulty?: string | null;
  appliance_location?: string | null;
  access_instructions?: string | null;
  equipment_required?: string | null;
  ppe_required?: string | null;
  approved_amount_pence?: number | null;
  paid_at?: string | null;
  payment_type?: 'one_off' | 'dd_only' | 'both';
  dd_amount_pence?: number | null;
  dd_day_of_month?: number | null;
  gocardless_subscription_id?: string | null;
}

export type PaymentType = 'one_off' | 'dd_only' | 'both';

export interface ApproveServiceRequestParams {
  id: string;
  adminNotes: string;
  paymentType: PaymentType;
  oneOffAmountPence?: number;
  ddAmountPence?: number;
  ddDayOfMonth?: number;
}

export async function listServiceRequestsForAdmin(): Promise<ServiceRequestRow[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch service requests');
  return (data || []) as ServiceRequestRow[];
}

export async function listServiceRequestsForCustomer(userId: string): Promise<ServiceRequestRow[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch service requests');
  return (data || []) as ServiceRequestRow[];
}

export async function approveServiceRequest(
  params: ApproveServiceRequestParams
): Promise<void> {
  const { id, adminNotes, paymentType, oneOffAmountPence, ddAmountPence, ddDayOfMonth } = params;

  if (paymentType === 'one_off' || paymentType === 'both') {
    if (!oneOffAmountPence || oneOffAmountPence < 100) {
      throw new Error('One-off amount must be at least £1 (100 pence).');
    }
  }
  if (paymentType === 'dd_only' || paymentType === 'both') {
    if (!ddAmountPence || ddAmountPence < 100) {
      throw new Error('Direct Debit amount must be at least £1 (100 pence).');
    }
    if (!ddDayOfMonth || ddDayOfMonth < 1 || ddDayOfMonth > 28) {
      throw new Error('Direct Debit day of month must be 1–28.');
    }
  }

  const update: Record<string, unknown> = {
    status: 'approved',
    admin_notes: adminNotes.trim() || null,
    approved_at: new Date().toISOString(),
    rejected_at: null,
    payment_type: paymentType,
    approved_amount_pence: paymentType === 'dd_only' ? null : (oneOffAmountPence ?? null),
    dd_amount_pence: (paymentType === 'dd_only' || paymentType === 'both') ? (ddAmountPence ?? null) : null,
    dd_day_of_month: (paymentType === 'dd_only' || paymentType === 'both') ? (ddDayOfMonth ?? null) : null,
  };

  const { error } = await supabase
    .from('service_requests')
    .update(update)
    .eq('id', id);

  if (error) throw new Error(error.message || 'Failed to approve request');
}

export async function rejectServiceRequest(
  id: string,
  adminNotes: string
): Promise<void> {
  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'rejected',
      admin_notes: adminNotes.trim() || null,
      rejected_at: new Date().toISOString(),
      approved_at: null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message || 'Failed to reject request');
}
