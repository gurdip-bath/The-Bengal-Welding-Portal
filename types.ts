
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'ENGINEER';

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
  customerPostcode?: string;
  contactName?: string;
  frequency?: string;
  status: JobStatus;
  startDate: string;
  warrantyEndDate: string;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  amount: number;
  notes?: JobNote[];
  certificateNumber?: string;
  technician?: string;
  greaseRating?: string;
  ductLength?: string;
  tr19Compliant?: boolean;
  startTime?: string;
  duration?: number;
  jobType?: string;
  leadOperative?: string;
  accessDifficulty?: 'easy' | 'medium' | 'difficult';
  applianceLocation?: string;
  accessInstructions?: string;
  equipmentRequired?: string;
  ppeRequired?: string;
}

export interface QuoteRequest {
  id: string;
  productName: string;
  productImage: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  date: string;
  status: 'NEW' | 'QUOTED' | 'PENDING_PAYMENT' | 'PAID';
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
