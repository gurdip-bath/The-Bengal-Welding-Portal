/**
 * Mock auth helpers using localStorage.
 * For development/testing only. Use Supabase or another backend for production.
 */

import { User, UserRole } from '../types';

const USERS_KEY = 'bengal_users';

export interface StoredUser extends User {
  password: string;
}

const SEED_USERS: StoredUser[] = [
  {
    id: 'cust-test',
    name: 'Test Customer',
    email: 'customer@test.com',
    password: 'customer123',
    role: 'CUSTOMER',
    phone: '',
    address: '',
  },
  {
    id: 'admin-test',
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'admin123',
    role: 'ADMIN',
  },
];

function ensureUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  return SEED_USERS;
}

export function validateCredentials(email: string, password: string): User | null {
  const users = ensureUsers();
  const stored = users.find(
    (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim() && u.password === password
  );
  if (!stored) return null;
  const { password: _, ...user } = stored;
  return user;
}

export function getAllUsers(): StoredUser[] {
  return ensureUsers();
}

export function getUserByEmail(email: string): StoredUser | undefined {
  return ensureUsers().find((u) => u.email.toLowerCase().trim() === email.toLowerCase().trim());
}

export function registerCustomer(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}): { success: boolean; user?: User; error?: string } {
  const users = ensureUsers();
  if (getUserByEmail(data.email)) {
    return { success: false, error: 'An account with this email already exists.' };
  }
  const newUser: StoredUser = {
    id: `u-${Date.now()}`,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    role: 'CUSTOMER',
    phone: data.phone?.trim() || '',
    address: data.address?.trim() || '',
  };
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const { password: _, ...user } = newUser;
  return { success: true, user };
}

export function registerEmployee(data: {
  name: string;
  email: string;
  password: string;
}): { success: boolean; user?: User; error?: string } {
  const users = ensureUsers();
  if (getUserByEmail(data.email)) {
    return { success: false, error: 'An employee with this email already exists.' };
  }
  const newUser: StoredUser = {
    id: `a-${Date.now()}`,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    role: 'ADMIN',
  };
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const { password: _, ...user } = newUser;
  return { success: true, user };
}
