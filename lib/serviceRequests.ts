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
  id: string,
  adminNotes: string
): Promise<void> {
  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'approved',
      admin_notes: adminNotes.trim() || null,
      approved_at: new Date().toISOString(),
      rejected_at: null,
    })
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
