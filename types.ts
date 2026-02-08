
export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  address?: string;
}

export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface JobNote {
  id: string;
  text: string;
  timestamp: string;
  images?: string[];
  author: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  status: JobStatus;
  startDate: string;
  warrantyEndDate: string;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  amount: number;
  notes?: JobNote[];
}

export interface QuoteRequest {
  id: string;
  productName: string;
  productImage: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  date: string;
  status: 'NEW' | 'QUOTED' | 'PAID';
  price?: number;
  adminNotes?: string;
  customerNotes?: string;
  applianceImage?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

export interface FileMeta {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedBy: string;
  uploadDate: string;
}

export interface AppState {
  user: User | null;
  jobs: Job[];
  products: Product[];
  currentJob: Job | null;
}
