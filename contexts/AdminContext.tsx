
import React, { createContext, useContext, ReactNode } from 'react';
import { Job, JobStatus, QuoteRequest } from '../types';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface AdminContextValue {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  quotes: QuoteRequest[];
  onUpdateQuote: (id: string, price: number, notes: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  uniqueCustomers: CustomerProfile[];
  openAddJobModal: () => void;
  openEditJobModal: (job: Job) => void;
  generateInviteLink: (job: Job) => void;
  updateStatus: (id: string, status: JobStatus) => void;
  handleDeleteJob: (id: string) => void;
  selectedQuote: QuoteRequest | null;
  setSelectedQuote: (q: QuoteRequest | null) => void;
  selectedCustomerDetail: CustomerProfile | null;
  setSelectedCustomerDetail: (c: CustomerProfile | null) => void;
  openAddEmployeeModal: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

interface AdminProviderProps {
  value: AdminContextValue;
  children: ReactNode;
}

export function AdminProvider({ value, children }: AdminProviderProps) {
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
