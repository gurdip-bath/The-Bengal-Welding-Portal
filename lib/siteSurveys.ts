/**
 * Site surveys CRUD - Supabase-backed.
 */

import { supabase } from './supabase';
import type { MediaItem } from './storage';

export interface SiteSurvey {
  id: string;
  site_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  alt_contact_name: string | null;
  alt_contact_phone: string | null;
  survey_type: string;
  work_required: string;
  linear_metres: string | null;
  diameter_width_mm: string | null;
  height_m: string | null;
  other_measurements: string | null;
  access_notes: string | null;
  special_requirements: string | null;
  estimated_scope: string | null;
  media: MediaItem[];
  internal_notes: string | null;
  priority: string | null;
  surveyed_by_id: string | null;
  surveyed_by_name: string | null;
  status: 'draft' | 'submitted';
  created_at: string;
  updated_at: string;
}

export interface SiteSurveyInsert {
  site_name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  postcode: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string | null;
  alt_contact_name?: string | null;
  alt_contact_phone?: string | null;
  survey_type: string;
  work_required: string;
  linear_metres?: string | null;
  diameter_width_mm?: string | null;
  height_m?: string | null;
  other_measurements?: string | null;
  access_notes?: string | null;
  special_requirements?: string | null;
  estimated_scope?: string | null;
  media?: MediaItem[];
  internal_notes?: string | null;
  priority?: string | null;
  surveyed_by_id?: string | null;
  surveyed_by_name?: string | null;
  status?: 'draft' | 'submitted';
}

export async function listSiteSurveys(status?: 'draft' | 'submitted'): Promise<SiteSurvey[]> {
  let q = supabase
    .from('site_surveys')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    q = q.eq('status', status);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as SiteSurvey[];
}

export async function getSiteSurvey(id: string): Promise<SiteSurvey | null> {
  const { data, error } = await supabase
    .from('site_surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as SiteSurvey | null;
}

export async function createSiteSurvey(
  input: SiteSurveyInsert,
  userId?: string,
  userName?: string,
  id?: string
): Promise<SiteSurvey> {
  const row = {
    ...(id ? { id } : {}),
    ...input,
    media: input.media ?? [],
    status: input.status ?? 'draft',
    surveyed_by_id: userId ?? null,
    surveyed_by_name: userName ?? null,
  };

  const { data, error } = await supabase
    .from('site_surveys')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SiteSurvey;
}

export async function updateSiteSurvey(
  id: string,
  input: Partial<SiteSurveyInsert>
): Promise<SiteSurvey> {
  const { data, error } = await supabase
    .from('site_surveys')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SiteSurvey;
}

export async function deleteSiteSurvey(id: string): Promise<void> {
  const { error } = await supabase.from('site_surveys').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
