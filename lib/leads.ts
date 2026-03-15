/**
 * Leads API – CRUD for customer leads/enquiries.
 */

import { supabase } from './supabase';

export type LeadSource = 'whatsapp' | 'social_media' | 'email';
export type LeadStatus = 'pending' | 'parked' | 'converted';

export interface LeadRow {
  id: string;
  source: LeadSource;
  name: string;
  phone: string | null;
  email: string | null;
  enquiry: string | null;
  status: LeadStatus;
  admin_notes: string | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listLeads(): Promise<LeadRow[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch leads');
  return (data || []) as LeadRow[];
}

export async function createLead(data: {
  source: LeadSource;
  name: string;
  phone?: string;
  email?: string;
  enquiry?: string;
}): Promise<LeadRow> {
  const row = {
    source: data.source,
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    enquiry: data.enquiry?.trim() || null,
    status: 'pending' as LeadStatus,
  };

  const { data: inserted, error } = await supabase
    .from('leads')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to create lead');
  return inserted as LeadRow;
}

export async function updateLead(
  id: string,
  updates: Partial<{ source: LeadSource; name: string; phone: string; email: string; enquiry: string; status: LeadStatus; admin_notes: string; customer_id: string }>
): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message || 'Failed to update lead');
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw new Error(error.message || 'Failed to delete lead');
}
