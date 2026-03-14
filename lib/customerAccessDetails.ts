/**
 * Customer access details – account-level access info for service requests.
 */

import { supabase } from './supabase';

export interface CustomerAccessDetailsRow {
  user_id: string;
  access_difficulty: 'easy' | 'medium' | 'difficult' | null;
  appliance_location: string | null;
  access_instructions: string | null;
  equipment_required: string | null;
  ppe_required: string | null;
}

export async function getCustomerAccessDetails(userId: string): Promise<CustomerAccessDetailsRow | null> {
  const { data, error } = await supabase
    .from('customer_access_details')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return data as CustomerAccessDetailsRow | null;
}

export async function upsertCustomerAccessDetails(
  userId: string,
  details: {
    accessDifficulty?: 'easy' | 'medium' | 'difficult' | null;
    applianceLocation?: string | null;
    accessInstructions?: string | null;
    equipmentRequired?: string | null;
    ppeRequired?: string | null;
  }
): Promise<void> {
  const row = {
    user_id: userId,
    access_difficulty: details.accessDifficulty ?? null,
    appliance_location: details.applianceLocation ?? null,
    access_instructions: details.accessInstructions ?? null,
    equipment_required: details.equipmentRequired ?? null,
    ppe_required: details.ppeRequired ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('customer_access_details')
    .upsert(row, { onConflict: 'user_id' });

  if (error) throw new Error(error.message || 'Failed to save access details');
}
