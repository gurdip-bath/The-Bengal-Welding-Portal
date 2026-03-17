import { supabase } from './supabase';

export interface ReportLogEntry {
  id: string;
  jobId: string;
  reportRef: string;
  siteName?: string;
  jobTitle?: string;
  customerName?: string;
  generatedAt: string;
}

function rowToEntry(r: Record<string, unknown>): ReportLogEntry {
  return {
    id: r.id as string,
    jobId: r.job_id as string,
    reportRef: (r.report_ref as string) || '',
    siteName: (r.site_name as string) || undefined,
    jobTitle: (r.job_title as string) || undefined,
    customerName: (r.customer_name as string) || undefined,
    generatedAt: (r.generated_at as string) || new Date().toISOString(),
  };
}

export async function listTR19ReportLog(): Promise<ReportLogEntry[]> {
  const { data, error } = await supabase
    .from('tr19_report_log')
    .select('*')
    .order('generated_at', { ascending: false });
  if (error) throw new Error(error.message || 'Failed to fetch TR19 report log');
  return (data || []).map((r) => rowToEntry(r as Record<string, unknown>));
}

export async function addTR19ReportLogEntry(entry: Omit<ReportLogEntry, 'id'>): Promise<void> {
  const { error } = await supabase.from('tr19_report_log').insert({
    job_id: entry.jobId,
    report_ref: entry.reportRef,
    site_name: entry.siteName || null,
    job_title: entry.jobTitle || null,
    customer_name: entry.customerName || null,
    generated_at: entry.generatedAt,
  });
  if (error) throw new Error(error.message || 'Failed to add TR19 report log entry');
}

export async function deleteTR19ReportLogEntry(id: string): Promise<void> {
  const { error } = await supabase.from('tr19_report_log').delete().eq('id', id);
  if (error) throw new Error(error.message || 'Failed to delete TR19 report log entry');
}

