/**
 * Supabase Auth helpers.
 */

import { supabase } from './supabase';
import type { CustomerAttachment, User, UserRole } from '../types';

export interface StoredUser extends User {
  password?: string;
  accountNumber?: string | null;
  productsCount?: number;
  attachments?: CustomerAttachment[];
  companyName?: string | null;
  vatNumber?: string | null;
  accountType?: 'credit' | 'cash' | null;
  balance?: number | null;
  customerType?: 'trade' | 'retail' | null;
  completed?: boolean | null;
  notes?: string | null;
}

const USERS_CACHE_KEY = 'bengal_users_cache_v1';

export function getCachedAllUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { users?: StoredUser[] };
    return Array.isArray(parsed?.users) ? parsed.users : [];
  } catch {
    return [];
  }
}

function setCachedAllUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify({ users, cachedAt: Date.now() }));
  } catch {
    // ignore
  }
}

function mapAuthUserToAppUser(raw: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User | null {
  const meta = raw.user_metadata || {};
  return {
    id: raw.id,
    name: (meta.name as string) || raw.email?.split('@')[0] || 'User',
    email: raw.email || '',
    role: (meta.role as UserRole) || 'CUSTOMER',
    phone: meta.phone as string | undefined,
    address: meta.address as string | undefined,
  };
}

const CACHED_ROLE_KEY = 'bengal_user_role';

function getCachedRole(userId: string): UserRole | null {
  try {
    const raw = localStorage.getItem(`${CACHED_ROLE_KEY}_${userId}`);
    if (!raw) return null;
    const r = raw.toUpperCase();
    if (r === 'ADMIN') return 'ADMIN';
    if (r === 'ENGINEER') return 'ENGINEER';
    return 'CUSTOMER';
  } catch {
    return null;
  }
}

function setCachedRole(userId: string, role: UserRole): void {
  try {
    localStorage.setItem(`${CACHED_ROLE_KEY}_${userId}`, role);
  } catch {
    // ignore
  }
}

async function fetchProfileRole(userId: string, fallbackFromMetadata?: UserRole): Promise<UserRole> {
  const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
  try {
    const fetchRole = async (): Promise<UserRole> => {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (error) throw new Error('profile fetch failed');
      const r = (data?.role as string)?.toLowerCase();
      const role: UserRole = r === 'admin' ? 'ADMIN' : r === 'engineer' ? 'ENGINEER' : 'CUSTOMER';
      setCachedRole(userId, role);
      return role;
    };
    return await Promise.race([fetchRole(), timeout(8000)]);
  } catch {
    // Offline / timeout: use user_metadata.role, then cached role, then CUSTOMER
    if (fallbackFromMetadata === 'ADMIN' || fallbackFromMetadata === 'ENGINEER' || fallbackFromMetadata === 'CUSTOMER') {
      setCachedRole(userId, fallbackFromMetadata);
      return fallbackFromMetadata;
    }
    const cached = getCachedRole(userId);
    if (cached) return cached;
    return 'CUSTOMER';
  }
}

async function mapAuthUserToAppUserWithProfile(raw: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<User | null> {
  const base = mapAuthUserToAppUser(raw);
  if (!base) return null;
  const metaRole = raw.user_metadata?.role as string | undefined;
  const fallback: UserRole | undefined =
    metaRole?.toUpperCase() === 'ADMIN' ? 'ADMIN'
    : metaRole?.toUpperCase() === 'ENGINEER' ? 'ENGINEER'
    : metaRole?.toUpperCase() === 'CUSTOMER' ? 'CUSTOMER' : undefined;
  const role = await fetchProfileRole(raw.id, fallback);
  return { ...base, role };
}

export async function signIn(email: string, password: string): Promise<{ user: User; error?: never } | { user?: never; error: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Sign in failed' };
  const user = await mapAuthUserToAppUserWithProfile(data.user);
  if (!user) return { error: 'Invalid user data' };
  return { user };
}

export async function signUpCustomer(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email.trim().toLowerCase(),
    password: data.password,
    options: {
      data: {
        name: data.name.trim(),
        role: 'CUSTOMER',
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || '',
      },
    },
  });
  if (error) return { success: false, error: error.message };
  if (!authData.user) return { success: false, error: 'Sign up failed' };
  const user = mapAuthUserToAppUser(authData.user);
  if (!user) return { success: false, error: 'Invalid user data' };
  return { success: true, user };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export function mapSessionToUser(raw: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): User | null {
  if (!raw) return null;
  return mapAuthUserToAppUser(raw);
}

/** Maps session user to app user, fetching role from profiles table. Use this for auth state. */
export async function mapSessionToUserWithProfile(raw: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): Promise<User | null> {
  if (!raw) return null;
  return mapAuthUserToAppUserWithProfile(raw);
}

export async function getSessionUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return mapAuthUserToAppUserWithProfile(session.user);
}

const PROFILE_SELECT_BASE =
  'id, role, account_number, name, email, phone, address, products_count, attachments, company_name, vat_number, account_type, balance, customer_type, completed';
const PROFILE_SELECT_WITH_NOTES = `${PROFILE_SELECT_BASE}, notes`;

function isMissingNotesColumnError(err: { message?: string } | null): boolean {
  const m = (err?.message || '').toLowerCase();
  return m.includes('notes') && (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find'));
}

export async function getAllUsers(): Promise<StoredUser[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  let data: unknown;
  let includeNotes = true;
  let res = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_WITH_NOTES)
    .order('account_number', { ascending: true, nullsFirst: false });

  if (res.error && isMissingNotesColumnError(res.error)) {
    includeNotes = false;
    res = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_BASE)
      .order('account_number', { ascending: true, nullsFirst: false });
  }

  if (res.error) throw new Error(res.error.message || 'Failed to load users');
  data = res.data;

  const mapped: StoredUser[] = ((data || []) as any[]).map((p: any) => {
    const r = String(p.role || 'customer').toUpperCase();
    const role: UserRole = r === 'ADMIN' ? 'ADMIN' : r === 'ENGINEER' ? 'ENGINEER' : 'CUSTOMER';
    return {
      id: p.id,
      name: (p.name as string) || (p.email as string) || '',
      email: (p.email as string) || '',
      role,
      phone: (p.phone as string) || undefined,
      address: (p.address as string) || undefined,
      accountNumber: (p.account_number as string) ?? null,
      productsCount: typeof p.products_count === 'number' ? p.products_count : 0,
      attachments: Array.isArray(p.attachments) ? (p.attachments as CustomerAttachment[]) : [],
      companyName: (p.company_name as string) ?? null,
      vatNumber: (p.vat_number as string) ?? null,
      accountType:
        p.account_type === 'credit' || p.account_type === 'cash'
          ? (p.account_type as 'credit' | 'cash')
          : null,
      balance: typeof p.balance === 'number' && Number.isFinite(p.balance) ? p.balance : null,
      customerType:
        p.customer_type === 'trade' || p.customer_type === 'retail'
          ? (p.customer_type as 'trade' | 'retail')
          : null,
      completed: typeof p.completed === 'boolean' ? p.completed : null,
      notes:
        !includeNotes
          ? null
          : p.notes == null || p.notes === ''
            ? null
            : String(p.notes),
    };
  });

  setCachedAllUsers(mapped);
  return mapped;
}

export async function registerEmployee(data: {
  name: string;
  email: string;
  password: string;
  role: 'ENGINEER' | 'ADMIN';
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { success: false, error: 'Not authenticated' };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-employee`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: data.role,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: json.error || `Request failed (${res.status})` };
  const u = json.user;
  if (!u) return { success: false, error: 'No user returned' };
  const meta = u.user_metadata || {};
  const role = (meta.role as UserRole) || 'CUSTOMER';
  const user: User = {
    id: u.id,
    name: (meta.name as string) || u.email || '',
    email: u.email || '',
    role,
  };
  return { success: true, user };
}

export async function createCustomer(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  vatNumber?: string;
  accountType?: 'credit' | 'cash' | null;
  balance?: number | null;
  customerType?: 'trade' | 'retail' | null;
  completed?: boolean | null;
  sendInvite?: boolean;
  notes?: string | null;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { success: false, error: 'Not authenticated' };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-customer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      name: data.name.trim(),
      email: data.email?.trim() ? data.email.trim().toLowerCase() : '',
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || '',
      company_name: data.companyName?.trim() || '',
      vat_number: data.vatNumber?.trim() || '',
      account_type: data.accountType === 'credit' || data.accountType === 'cash' ? data.accountType : null,
      balance: typeof data.balance === 'number' && Number.isFinite(data.balance) ? data.balance : 0,
      customer_type: data.customerType === 'trade' || data.customerType === 'retail' ? data.customerType : null,
      completed: typeof data.completed === 'boolean' ? data.completed : false,
      send_invite: Boolean(data.sendInvite),
      notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : null,
      redirectTo: `${window.location.origin}${window.location.pathname || ''}#/set-password`,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: json.error || `Request failed (${res.status})` };
  const u = json.user;
  if (!u) return { success: false, error: 'No user returned' };
  const meta = u.user_metadata || {};
  const user: User = {
    id: u.id,
    name: (meta.name as string) || u.email || '',
    email: u.email || '',
    role: 'CUSTOMER',
    phone: meta.phone as string | undefined,
    address: meta.address as string | undefined,
  };
  return { success: true, user };
}

export async function updateCustomer(data: {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  vatNumber?: string;
  accountType?: 'credit' | 'cash' | null;
  balance?: number | null;
  customerType?: 'trade' | 'retail' | null;
  completed?: boolean | null;
  notes?: string | null;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const emailToSend = (data.email ?? '').trim().toLowerCase();
  const notesForApi = !('notes' in data)
    ? undefined
    : data.notes === null || data.notes === undefined
      ? null
      : String(data.notes).trim() || null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token?.trim();
    if (!token) return { success: false, error: 'Not authenticated' };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: data.userId,
        name: data.name.trim(),
        email: emailToSend,
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || '',
        company_name: data.companyName?.trim() || '',
        vat_number: data.vatNumber?.trim() || '',
        account_type: data.accountType === 'credit' || data.accountType === 'cash' ? data.accountType : null,
        balance: typeof data.balance === 'number' && Number.isFinite(data.balance) ? data.balance : 0,
        customer_type: data.customerType === 'trade' || data.customerType === 'retail' ? data.customerType : null,
        completed: typeof data.completed === 'boolean' ? data.completed : false,
        ...(notesForApi !== undefined ? { notes: notesForApi } : {}),
      }),
    });

    if (res.status === 401 && attempt === 0) {
      // Token might be stale; refresh and retry.
      try {
        await supabase.auth.refreshSession();
      } catch {
        // fall through to retry once anyway
      }
      continue;
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json.error || `Request failed (${res.status})` };
    const u = json.user;
    if (!u) return { success: false, error: 'No user returned' };
    const meta = u.user_metadata || {};
    const user: User = {
      id: u.id,
      name: (meta.name as string) || u.email || '',
      email: u.email || '',
      role: (meta.role as UserRole) || 'CUSTOMER',
      phone: meta.phone as string | undefined,
      address: meta.address as string | undefined,
    };
    return { success: true, user };
  }

  return { success: false, error: 'Failed to update customer' };
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  await supabase.auth.refreshSession();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { success: false, error: 'Not authenticated' };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: json.error || `Request failed (${res.status})` };
  return { success: true };
}
