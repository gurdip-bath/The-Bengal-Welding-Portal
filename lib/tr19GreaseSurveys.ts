import { supabase } from './supabase';

export interface TR19GreaseSurvey {
  id: string;
  jobId: string;
  jobTitle: string;
  customerName: string;
  customerAddress: string;
  postcode: string;
  kitchenUse: string;
  linearMetres: string;
  diameterWidth: string;
  frequency: string;
  riskGrade: string;
  accessDifficulty: string;
  outOfHoursRequired: boolean;
  workingAtHeight: boolean;
  confinedSpaceEntry: boolean;
  greaseRating: number;
  visualCondition: string;
  photos: string[];
  notes: string;
  status: 'draft' | 'submitted';
  submittedAt?: string;
}

function rowToSurvey(r: Record<string, unknown>): TR19GreaseSurvey {
  const survey = (r.survey || {}) as Partial<TR19GreaseSurvey>;
  return {
    ...(survey as TR19GreaseSurvey),
    id: (r.id as string) || survey.id || '',
    jobId: (r.job_id as string) || survey.jobId || '',
    status: (r.status as 'draft' | 'submitted') || (survey.status as 'draft' | 'submitted') || 'draft',
    submittedAt: (r.submitted_at as string) || survey.submittedAt,
  };
}

export async function listTR19GreaseSurveys(): Promise<TR19GreaseSurvey[]> {
  const { data, error } = await supabase
    .from('tr19_grease_surveys')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message || 'Failed to fetch surveys');
  return (data || []).map((r) => rowToSurvey(r as Record<string, unknown>));
}

export async function getTR19GreaseSurvey(id: string): Promise<TR19GreaseSurvey | null> {
  const { data, error } = await supabase
    .from('tr19_grease_surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToSurvey(data as Record<string, unknown>);
}

export async function getLatestSubmittedTR19GreaseSurveyForJob(jobId: string): Promise<TR19GreaseSurvey | null> {
  const { data, error } = await supabase
    .from('tr19_grease_surveys')
    .select('*')
    .eq('job_id', jobId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return rowToSurvey(data as Record<string, unknown>);
}

export async function upsertTR19GreaseSurvey(survey: TR19GreaseSurvey): Promise<void> {
  const { error } = await supabase
    .from('tr19_grease_surveys')
    .upsert(
      {
        id: survey.id,
        job_id: survey.jobId,
        status: survey.status,
        submitted_at: survey.submittedAt || null,
        survey,
      },
      { onConflict: 'id' }
    );
  if (error) throw new Error(error.message || 'Failed to save survey');
}

export async function deleteTR19GreaseSurvey(id: string): Promise<void> {
  const { error } = await supabase.from('tr19_grease_surveys').delete().eq('id', id);
  if (error) throw new Error(error.message || 'Failed to delete survey');
}

