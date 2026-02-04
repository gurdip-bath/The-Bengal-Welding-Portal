
import { Job, Product, User } from './types';

// Helper to get a date X days from now
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const MOCK_USER_CUSTOMER: User = {
  id: 'u1',
  name: 'John Doe Engineering',
  email: 'john@doe-eng.com',
  role: 'CUSTOMER',
  avatar: 'https://picsum.photos/seed/john/100',
};

export const MOCK_USER_ADMIN: User = {
  id: 'a1',
  name: 'Admin Manager',
  email: 'admin@bengalwelding.co.uk',
  role: 'ADMIN',
  avatar: 'https://picsum.photos/seed/admin/100',
};

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    title: 'Commercial Kitchen Installation',
    description: 'Full installation of extraction system and stainless steel worktops.',
    customerId: 'u1',
    status: 'IN_PROGRESS',
    startDate: '2024-01-15',
    warrantyEndDate: '2026-01-15',
    paymentStatus: 'PAID',
    amount: 1250,
  },
  {
    id: 'j2',
    title: 'Extraction Hood Maintenance',
    description: 'Biannual grease cleaning and filter replacement.',
    customerId: 'u1',
    status: 'COMPLETED',
    startDate: '2024-05-10',
    warrantyEndDate: daysFromNow(45),
    paymentStatus: 'PAID',
    amount: 850,
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Cooker',
    description: 'Heavy duty commercial 6-burner range with high-output performance and stainless steel finish.',
    price: 1850.00,
    category: 'Cooking Equipment',
    image: '/cooker.jpg',
  },
  {
    id: 'p2',
    name: 'Extraction Hood',
    description: 'Bespoke stainless steel extraction canopy with baffle filters and integrated lighting.',
    price: 1200.00,
    category: 'Ventilation',
    image: '/extraction hood.jpg',
  },
  {
    id: 'p3',
    name: 'Grease Cleaning Service Plan',
    description: 'Professional deep cleaning for commercial extraction systems to ensure fire safety compliance.',
    price: 499.00,
    category: 'Services',
    image: '/grease cleaning service plan.jpg',
  },
  {
    id: 'p4',
    name: 'Hot Cupboard',
    description: 'Stainless steel heated cupboard with sliding doors, perfect for plate warming and food holding.',
    price: 1450.00,
    category: 'Food Holding',
    image: '/hot cupboard.jpg',
  },
  {
    id: 'p5',
    name: 'Stockpot',
    description: 'Single burner high-power stockpot stove designed for heavy industrial use.',
    price: 650.00,
    category: 'Cooking Equipment',
    image: '/stockpot.jpg',
  },
  {
    id: 'p6',
    name: 'Table and Gantry',
    description: 'Custom prep table with integrated overhead gantry system and heating lamps.',
    price: 895.00,
    category: 'Food Prep',
    image: '/table and gantry.jpg',
  },
  {
    id: 'p7',
    name: 'Tandoori Oven',
    description: 'Shaan series professional Tandoori oven with high-grade insulation and precision heat control.',
    price: 1250.00,
    category: 'Cooking Equipment',
    image: '/tandoori oven.jpg',
  }
];
