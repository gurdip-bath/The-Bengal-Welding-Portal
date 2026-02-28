
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
  phone: '07123 456 789',
  address: '123 Engineering Lane, London, E1 1AA',
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
    id: 'r1',
    title: 'Extraction System Certificate',
    description: 'Renewal certificate for commercial kitchen extraction.',
    customerId: 'r1',
    customerName: 'Nandos Liverpool',
    customerEmail: 'contact@nandos.co.uk',
    customerPhone: '0151 123 4567',
    customerAddress: '12 Lord Street, Liverpool',
    customerPostcode: 'L1 4DS',
    status: 'COMPLETED',
    startDate: '2024-01-15',
    warrantyEndDate: daysFromNow(-18),
    paymentStatus: 'PAID',
    amount: 1250,
  },
  {
    id: 'r2',
    title: 'Kitchen Ventilation Certificate',
    description: 'Annual renewal for hotel kitchen extraction.',
    customerId: 'r2',
    customerName: 'The Crown Hotel',
    customerEmail: 'kitchen@crownhotel.co.uk',
    customerPhone: '0161 234 5678',
    customerAddress: '45 Deansgate, Manchester',
    customerPostcode: 'M2 4LQ',
    status: 'COMPLETED',
    startDate: '2024-02-20',
    warrantyEndDate: daysFromNow(-13),
    paymentStatus: 'PAID',
    amount: 950,
  },
  {
    id: 'r3',
    title: 'Grease Duct Certificate',
    description: 'Fire safety certificate renewal for pub kitchen.',
    customerId: 'r3',
    customerName: 'The Wheatsheaf Pub',
    customerEmail: 'manager@wheatsheaf.co.uk',
    customerPhone: '0114 345 6789',
    customerAddress: '78 High Street, Sheffield',
    customerPostcode: 'S1 2GH',
    status: 'COMPLETED',
    startDate: '2023-08-10',
    warrantyEndDate: daysFromNow(-110),
    paymentStatus: 'PAID',
    amount: 650,
  },
  {
    id: 'r4',
    title: 'Commercial Cooker Certificate',
    description: 'Renewal certificate for bakery kitchen equipment.',
    customerId: 'r4',
    customerName: 'Greggs Manchester',
    customerEmail: 'facilities@greggs.co.uk',
    customerPhone: '0161 456 7890',
    customerAddress: '22 Market Street, Manchester',
    customerPostcode: 'M1 3AQ',
    status: 'COMPLETED',
    startDate: '2024-06-01',
    warrantyEndDate: daysFromNow(-5),
    paymentStatus: 'PAID',
    amount: 420,
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Cooker',
    description: 'Heavy duty commercial 6-burner range with high-output performance and stainless steel finish.',
    price: 1850.00,
    category: 'Cooking Equipment',
    image: 'cooker.png',
  },
  {
    id: 'p2',
    name: 'Extraction Hood',
    description: 'Bespoke stainless steel extraction canopy with baffle filters and integrated lighting.',
    price: 1200.00,
    category: 'Ventilation',
    image: 'extraction-hood.png',
  },
  {
    id: 'p3',
    name: 'Grease Cleaning Service Plan',
    description: 'Professional deep cleaning for commercial extraction systems to ensure fire safety compliance.',
    price: 499.00,
    category: 'Services',
    image: 'grease-cleaning-service-plan.png',
  },
  {
    id: 'p4',
    name: 'Hot Cupboard',
    description: 'Stainless steel heated cupboard with sliding doors, perfect for plate warming and food holding.',
    price: 1450.00,
    category: 'Food Holding',
    image: 'hot-cupboard.png',
  },
  {
    id: 'p5',
    name: 'Stockpot',
    description: 'Single burner high-power stockpot stove designed for heavy industrial use.',
    price: 650.00,
    category: 'Cooking Equipment',
    image: 'stockpot.png',
  },
  {
    id: 'p6',
    name: 'Table and Gantry',
    description: 'Custom prep table with integrated overhead gantry system and heating lamps.',
    price: 895.00,
    category: 'Food Prep',
    image: 'table-and-gantry.png',
  },
  {
    id: 'p7',
    name: 'Tandoori Oven',
    description: 'Shaan series professional Tandoori oven with high-grade insulation and precision heat control.',
    price: 1250.00,
    category: 'Cooking Equipment',
    image: 'tandoori-oven.png',
  }
];
