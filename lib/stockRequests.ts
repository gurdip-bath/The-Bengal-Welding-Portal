/**
 * Stock requests API – staff request items for site / running out.
 * Admin: full CRUD and status. Engineers: create, list own, edit own (no status).
 */

import { supabase } from './supabase';

export type StockRequestStatus = 'pending' | 'ordered' | 'delivered';

export interface StockRequestRow {
  id: string;
  requested_by: string;
  item_description: string;
  quantity: string | null;
  site_or_job: string | null;
  notes: string | null;
  status: StockRequestStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function listStockRequestsForAdmin(): Promise<StockRequestRow[]> {
  const { data, error } = await supabase
    .from('stock_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch stock requests');
  return (data || []) as StockRequestRow[];
}

export async function listStockRequestsForEngineer(userId: string): Promise<StockRequestRow[]> {
  const { data, error } = await supabase
    .from('stock_requests')
    .select('*')
    .eq('requested_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch stock requests');
  return (data || []) as StockRequestRow[];
}

export async function createStockRequest(data: {
  requested_by: string;
  item_description: string;
  quantity?: string;
  site_or_job?: string;
  notes?: string;
}): Promise<StockRequestRow> {
  const row = {
    requested_by: data.requested_by,
    item_description: data.item_description.trim(),
    quantity: data.quantity?.trim() || null,
    site_or_job: data.site_or_job?.trim() || null,
    notes: data.notes?.trim() || null,
    status: 'pending' as StockRequestStatus,
  };

  const { data: inserted, error } = await supabase
    .from('stock_requests')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to create stock request');
  return inserted as StockRequestRow;
}

export async function updateStockRequest(
  id: string,
  updates: Partial<{
    item_description: string;
    quantity: string;
    site_or_job: string;
    notes: string;
    status: StockRequestStatus;
    admin_notes: string;
  }>
): Promise<void> {
  const { error } = await supabase
    .from('stock_requests')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message || 'Failed to update stock request');
}

export async function deleteStockRequest(id: string): Promise<void> {
  const { error } = await supabase.from('stock_requests').delete().eq('id', id);
  if (error) throw new Error(error.message || 'Failed to delete stock request');
}
