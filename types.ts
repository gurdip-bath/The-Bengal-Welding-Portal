
export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Job {
  id: string;
  title: string;
  description: string;
  customerId: string;
  status: JobStatus;
  startDate: string;
  warrantyEndDate: string;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  amount: number;
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
