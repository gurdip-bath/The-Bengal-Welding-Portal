/**
 * Warranty claims API – create and list warranty claims.
 */

import { supabase } from './supabase';

export interface WarrantyClaimRow {
  id: string;
  user_id: string;
  job_id: string;
  product_name: string | null;
  gar_code: string | null;
  description: string;
  date_of_issue: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  attachments: unknown;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function createWarrantyClaim(data: {
  jobId: string;
  productName?: string;
  garCode?: string;
  description: string;
  dateOfIssue?: string;
  contactEmail?: string;
  contactPhone?: string;
}): Promise<WarrantyClaimRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const row = {
    user_id: user.id,
    job_id: data.jobId,
    product_name: data.productName || null,
    gar_code: data.garCode || null,
    description: data.description,
    date_of_issue: data.dateOfIssue || null,
    contact_email: data.contactEmail || null,
    contact_phone: data.contactPhone || null,
    attachments: null,
    status: 'submitted',
  };

  const { data: inserted, error } = await supabase
    .from('warranty_claims')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to submit warranty claim');
  return inserted as WarrantyClaimRow;
}

export async function listWarrantyClaimsForCustomer(userId: string): Promise<WarrantyClaimRow[]> {
  const { data, error } = await supabase
    .from('warranty_claims')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch warranty claims');
  return (data || []) as WarrantyClaimRow[];
}

export async function listAllWarrantyClaims(): Promise<WarrantyClaimRow[]> {
  const { data, error } = await supabase
    .from('warranty_claims')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch warranty claims');
  return (data || []) as WarrantyClaimRow[];
}

export async function updateWarrantyClaimStatus(
  id: string,
  status: string,
  adminNotes?: string
): Promise<void> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (adminNotes != null) updates.admin_notes = adminNotes;

  const { error } = await supabase
    .from('warranty_claims')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(error.message || 'Failed to update warranty claim');
}
