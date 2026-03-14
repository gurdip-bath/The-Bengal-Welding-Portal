/**
 * Installation sites CRUD - simple site directory (non-TR19).
 */

import { supabase } from './supabase';

export interface InstallationSite {
  id: string;
  site_name: string;
  address: string;
  postcode: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstallationSiteInsert {
  site_name: string;
  address: string;
  postcode: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string | null;
  notes?: string | null;
}

export async function listInstallationSites(): Promise<InstallationSite[]> {
  const { data, error } = await supabase
    .from('installation_sites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as InstallationSite[];
}

export async function getInstallationSite(id: string): Promise<InstallationSite | null> {
  const { data, error } = await supabase
    .from('installation_sites')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as InstallationSite | null;
}

export async function createInstallationSite(input: InstallationSiteInsert): Promise<InstallationSite> {
  const { data, error } = await supabase
    .from('installation_sites')
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as InstallationSite;
}

export async function updateInstallationSite(
  id: string,
  input: Partial<InstallationSiteInsert>
): Promise<InstallationSite> {
  const { data, error } = await supabase
    .from('installation_sites')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as InstallationSite;
}

export async function deleteInstallationSite(id: string): Promise<void> {
  const { error } = await supabase.from('installation_sites').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
