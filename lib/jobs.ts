/**
 * Jobs API – Supabase-backed jobs for shared admin/customer views.
 */

import { supabase } from './supabase';
import type { Job } from '../types';

function rowToJob(r: Record<string, unknown>): Job {
  return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) || '',
    customerId: r.customer_id as string,
    customerName: (r.customer_name as string) || undefined,
    customerEmail: (r.customer_email as string) || undefined,
    customerPhone: (r.customer_phone as string) || undefined,
    customerAddress: (r.customer_address as string) || undefined,
    customerPostcode: (r.customer_postcode as string) || undefined,
    contactName: (r.contact_name as string) || undefined,
    frequency: (r.frequency as string) || undefined,
    status: (r.status as Job['status']) || 'PENDING',
    startDate: (r.start_date as string) || '',
    warrantyEndDate: (r.warranty_end_date as string) || '',
    paymentStatus: (r.payment_status as Job['paymentStatus']) || 'UNPAID',
    amount: Number(r.amount) || 0,
    startTime: (r.start_time as string) || undefined,
    duration: (r.duration as number) || undefined,
    jobType: (r.job_type as string) || undefined,
    leadOperative: (r.lead_operative as string) || undefined,
  };
}

export async function listJobsForCustomer(customerId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('customer_id', customerId)
    .order('start_date', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch jobs');
  return (data || []).map(rowToJob);
}

export async function listAllJobsForAdmin(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch jobs');
  return (data || []).map(rowToJob);
}

export async function createJobFromServiceRequest(
  request: {
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
  }
): Promise<Job> {
  const jobId = `J-${Math.floor(Math.random() * 10000)}`;
  const siteName = request.business_name || request.full_name;
  const title = `Service Request — ${siteName}`;

  const row = {
    id: jobId,
    title,
    description: request.notes || 'Service request approved',
    customer_id: request.user_id,
    customer_name: request.full_name,
    customer_email: request.contact_email,
    customer_phone: null,
    customer_address: request.business_address,
    customer_postcode: request.postcode,
    contact_name: request.contact_name,
    frequency: null,
    status: 'PENDING',
    start_date: request.requested_date,
    warranty_end_date: request.requested_date,
    payment_status: 'UNPAID',
    amount: 0,
    start_time: null,
    duration: null,
    job_type: null,
    lead_operative: null,
    service_request_id: request.id,
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to create job');
  return rowToJob(data as Record<string, unknown>);
}
