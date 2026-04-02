import { supabase } from './supabase';

/** Partial vs full kitchen extract clean — stored on PCVR / certificate */
export type TR19CertificateCleanType = 'partial' | 'full';

export function labelCertificateCleanType(v: TR19CertificateCleanType | string | undefined | null): string {
  if (v === 'partial') return 'Partial clean';
  if (v === 'full') return 'Full clean';
  return '—';
}

export type TR19Report = {
  jobId: string;
  /** Partial vs full clean — shown on certificate */
  certificateCleanType?: TR19CertificateCleanType;
  leadOperativeName: string;
  besaCertNo: string;
  secondOperativeName: string;
  secondOpCertNo: string;
  timeOnSiteStart: string;
  timeOnSiteEnd: string;
  micronReadings: Array<{ location: string; preClean: string; postClean: string }>;
  photos: string[];
  cleaningMethods: string[];
  areasCleaned: string[];
  signedBy: string;
  signedAt: string;
  nextRecommendedCleanDate?: string;
};

export async function getTR19Report(jobId: string): Promise<TR19Report | null> {
  const { data, error } = await supabase
    .from('tr19_reports')
    .select('report')
    .eq('job_id', jobId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.report || null) as TR19Report | null;
}

export async function listTR19ReportJobIds(jobIds: string[]): Promise<Set<string>> {
  const ids = Array.from(new Set(jobIds)).filter(Boolean);
  if (!ids.length) return new Set();
  const { data, error } = await supabase
    .from('tr19_reports')
    .select('job_id')
    .in('job_id', ids);
  if (error) throw new Error(error.message || 'Failed to fetch TR19 reports');
  return new Set((data || []).map((r: { job_id: string }) => r.job_id));
}

export async function upsertTR19Report(jobId: string, report: TR19Report): Promise<void> {
  const { error } = await supabase
    .from('tr19_reports')
    .upsert({ job_id: jobId, report }, { onConflict: 'job_id' });
  if (error) throw new Error(error.message || 'Failed to save TR19 report');
}

export async function deleteTR19Report(jobId: string): Promise<void> {
  const { error } = await supabase.from('tr19_reports').delete().eq('job_id', jobId);
  if (error) throw new Error(error.message || 'Failed to delete TR19 report');
}

