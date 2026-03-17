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
    scheduledCleanDate: (r.scheduled_clean_date as string) || undefined,
    paymentStatus: (r.payment_status as Job['paymentStatus']) || 'UNPAID',
    amount: Number(r.amount) || 0,
    startTime: (r.start_time as string) || undefined,
    duration: (r.duration as number) || undefined,
    jobType: (r.job_type as string) || undefined,
    leadOperative: (r.lead_operative as string) || undefined,
    certificateNumber: (r.certificate_number as string) || undefined,
    technician: (r.technician as string) || undefined,
    greaseRating: (r.grease_rating as string) || undefined,
    ductLength: (r.duct_length as string) || undefined,
    tr19Compliant: (r.tr19_compliant as boolean) ?? undefined,
    accessDifficulty: (r.access_difficulty as Job['accessDifficulty']) || undefined,
    applianceLocation: (r.appliance_location as string) || undefined,
    accessInstructions: (r.access_instructions as string) || undefined,
    equipmentRequired: (r.equipment_required as string) || undefined,
    ppeRequired: (r.ppe_required as string) || undefined,
    isGasAppliance: r.is_gas_appliance === true,
    garCode: (r.gar_code as string) || undefined,
  };
}

function jobToRow(job: Job): Record<string, unknown> {
  return {
    id: job.id,
    title: job.title,
    description: job.description || null,
    customer_id: job.customerId,
    customer_name: job.customerName || null,
    customer_email: job.customerEmail || null,
    customer_phone: job.customerPhone || null,
    customer_address: job.customerAddress || null,
    customer_postcode: job.customerPostcode || null,
    contact_name: job.contactName || null,
    frequency: job.frequency || null,
    status: job.status,
    start_date: job.startDate || null,
    warranty_end_date: job.warrantyEndDate || null,
    scheduled_clean_date: job.scheduledCleanDate || null,
    payment_status: job.paymentStatus,
    amount: typeof job.amount === 'number' ? job.amount : Number(job.amount) || 0,
    start_time: job.startTime || null,
    duration: job.duration ?? null,
    job_type: job.jobType || null,
    lead_operative: job.leadOperative || null,
    certificate_number: job.certificateNumber || null,
    technician: job.technician || null,
    grease_rating: job.greaseRating || null,
    duct_length: job.ductLength || null,
    tr19_compliant: job.tr19Compliant ?? null,
    access_difficulty: job.accessDifficulty || null,
    appliance_location: job.applianceLocation || null,
    access_instructions: job.accessInstructions || null,
    equipment_required: job.equipmentRequired || null,
    ppe_required: job.ppeRequired || null,
    is_gas_appliance: job.isGasAppliance === true,
    gar_code: job.garCode || null,
  };
}

export async function getJobById(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToJob(data as Record<string, unknown>);
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
    access_difficulty: string | null;
    appliance_location: string | null;
    access_instructions: string | null;
    equipment_required: string | null;
    ppe_required: string | null;
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
    access_difficulty: request.access_difficulty || null,
    appliance_location: request.appliance_location || null,
    access_instructions: request.access_instructions || null,
    equipment_required: request.equipment_required || null,
    ppe_required: request.ppe_required || null,
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to create job');
  return rowToJob(data as Record<string, unknown>);
}

export async function updateJob(id: string, updates: Partial<{
  title: string;
  description: string;
  status: string;
  start_date: string;
  warranty_end_date: string;
  payment_status: string;
  amount: number;
  is_gas_appliance: boolean;
  gar_code: string | null;
  access_difficulty: string | null;
  appliance_location: string | null;
  access_instructions: string | null;
  equipment_required: string | null;
  ppe_required: string | null;
}>): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(error.message || 'Failed to update job');
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message || 'Failed to delete job');
}

/** Create or update a job row (admin-authoritative). */
export async function upsertJob(job: Job): Promise<Job> {
  const row = jobToRow(job);
  const { data, error } = await supabase
    .from('jobs')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to save job');
  return rowToJob(data as Record<string, unknown>);
}

export async function updateCustomerFieldsForJobs(
  customerId: string,
  updates: { name: string; email: string; phone: string; address: string }
): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({
      customer_name: updates.name,
      customer_email: updates.email,
      customer_phone: updates.phone,
      customer_address: updates.address,
    })
    .eq('customer_id', customerId);

  if (error) throw new Error(error.message || 'Failed to update customer details');
}
