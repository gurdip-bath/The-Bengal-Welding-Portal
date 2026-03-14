/**
 * Complaints API – create and list customer complaints.
 */

import { supabase } from './supabase';

export interface ComplaintRow {
  id: string;
  user_id: string;
  customer_name: string;
  site_name: string | null;
  site_address: string | null;
  contact_email: string;
  contact_phone: string | null;
  subject: string | null;
  complaint_type: string | null;
  description: string;
  date_of_incident: string | null;
  preferred_contact: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function createComplaint(data: {
  customerName: string;
  siteName?: string;
  siteAddress?: string;
  contactEmail: string;
  contactPhone?: string;
  subject?: string;
  complaintType?: string;
  description: string;
  dateOfIncident?: string;
  preferredContact?: string;
}): Promise<ComplaintRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const row = {
    user_id: user.id,
    customer_name: data.customerName,
    site_name: data.siteName || null,
    site_address: data.siteAddress || null,
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone || null,
    subject: data.subject || null,
    complaint_type: data.complaintType || null,
    description: data.description,
    date_of_incident: data.dateOfIncident || null,
    preferred_contact: data.preferredContact || null,
    status: 'open',
  };

  const { data: inserted, error } = await supabase
    .from('complaints')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to submit complaint');
  return inserted as ComplaintRow;
}

export async function listComplaintsForCustomer(userId: string): Promise<ComplaintRow[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch complaints');
  return (data || []) as ComplaintRow[];
}

export async function listAllComplaints(): Promise<ComplaintRow[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch complaints');
  return (data || []) as ComplaintRow[];
}

export async function updateComplaintStatus(
  id: string,
  status: string,
  adminNotes?: string
): Promise<void> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (adminNotes != null) updates.admin_notes = adminNotes;

  const { error } = await supabase
    .from('complaints')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(error.message || 'Failed to update complaint');
}
