
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_JOBS } from '../mockData';
import { COLORS } from '../constants';
import { JobStatus, QuoteRequest, Job } from '../types';

interface AdminDashboardProps {
  quotes: QuoteRequest[];
  onUpdateQuote: (id: string, price: number, notes: string) => void;
}

type DashboardFilter = JobStatus | 'ALL' | 'QUOTES' | 'QUOTES_PAID' | 'EXPIRING' | 'WARRANTIES' | 'CUSTOMERS';
type ViewMode = 'LIST' | 'CALENDAR';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ quotes, onUpdateQuote }) => {
  const [filter, setFilter] = useState<DashboardFilter>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<CustomerProfile | null>(null);
  
  // Combobox state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const savedJobs = localStorage.getItem('bengal_jobs');
    if (savedJobs) {
      setJobs(JSON.parse(savedJobs));
    } else {
      setJobs(MOCK_JOBS);
      localStorage.setItem('bengal_jobs', JSON.stringify(MOCK_JOBS));
    }
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [editingWarrantyJob, setEditingWarrantyJob] = useState<Job | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState<Partial<Job>>({
    title: '', 
    description: '', 
    amount: 0, 
    startDate: new Date().toISOString().split('T')[0],
    warrantyEndDate: new Date().toISOString().split('T')[0], 
    status: 'PENDING', 
    paymentStatus: 'UNPAID', 
    customerId: '', 
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: ''
  });

  const [priceInput, setPriceInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');

  // Synchronize modal inputs when a quote is selected
  useEffect(() => {
    if (selectedQuote) {
      setPriceInput(selectedQuote.price?.toString() || '');
      setNotesInput(selectedQuote.adminNotes || '');
    }
  }, [selectedQuote]);

  // Helper to filter data by search query
  const matchesSearch = (text?: string) => 
    !searchQuery || (text || '').toLowerCase().includes(searchQuery.toLowerCase());

  // Derived unique customers for the combobox and customer view
  const uniqueCustomers: CustomerProfile[] = Array.from(
    jobs.reduce((map, job) => {
      if (job.customerId && !map.has(job.customerId)) {
        map.set(job.customerId, {
          id: job.customerId,
          name: job.customerName || 'No Name',
          email: job.customerEmail || '',
          phone: job.customerPhone || '',
          address: job.customerAddress || ''
        });
      }
      return map;
    }, new Map<string, CustomerProfile>())
  ).map(([_, data]) => data);

  const filteredCustomersForSearch = uniqueCustomers.filter(c => 
    c.id.toLowerCase().includes((jobForm.customerId || '').toLowerCase()) ||
    c.name.toLowerCase().includes((jobForm.customerId || '').toLowerCase())
  );

  const filteredCustomersList = uniqueCustomers.filter(c => 
    matchesSearch(c.id) || matchesSearch(c.name) || matchesSearch(c.email) || matchesSearch(c.phone) || matchesSearch(c.address)
  );

  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  const expiringJobs = jobs.filter(job => {
    const expiryDate = new Date(job.warrantyEndDate);
    return expiryDate > now && expiryDate <= ninetyDaysFromNow;
  });

  const pendingQuotes = quotes.filter(q => q.status === 'NEW' || q.status === 'QUOTED');
  const paidQuotes = quotes.filter(q => q.status === 'PAID');

  const filteredJobs = 
    ['QUOTES', 'QUOTES_PAID', 'WARRANTIES', 'CUSTOMERS'].includes(filter) ? [] : 
    filter === 'EXPIRING' ? expiringJobs.filter(j => matchesSearch(j.title) || matchesSearch(j.customerName) || matchesSearch(j.customerId) || matchesSearch(j.warrantyEndDate)) :
    filter === 'ALL' ? jobs.filter(j => matchesSearch(j.title) || matchesSearch(j.customerName) || matchesSearch(j.customerId) || matchesSearch(j.warrantyEndDate)) : 
    jobs.filter(j => j.status === filter).filter(j => matchesSearch(j.title) || matchesSearch(j.customerName) || matchesSearch(j.customerId) || matchesSearch(j.warrantyEndDate));

  const updateStatus = (id: string, newStatus: JobStatus) => {
    const updated = jobs.map(j => j.id === id ? { ...j, status: newStatus } : j);
    setJobs(updated);
    localStorage.setItem('bengal_jobs', JSON.stringify(updated));
  };

  const generateInviteLink = (job: Job) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const inviteLink = `${baseUrl}#/login/customer?code=${job.id}`;
    navigator.clipboard.writeText(inviteLink);
    alert(`Invite Link copied for ${job.customerName || 'Customer'}!\n\nThis link uses Account ID: ${job.customerId}\n\nLink: ${inviteLink}`);
  };

  const openAddJobModal = () => {
    setEditingJobId(null);
    setJobForm({
      title: '', 
      description: '', 
      amount: 0, 
      startDate: new Date().toISOString().split('T')[0],
      warrantyEndDate: new Date().toISOString().split('T')[0], 
      status: 'PENDING', 
      paymentStatus: 'UNPAID', 
      customerId: '', 
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: ''
    });
    setIsJobModalOpen(true);
  };

  const openEditJobModal = (job: Job) => {
    setEditingJobId(job.id);
    setJobForm({ ...job });
    setIsJobModalOpen(true);
  };

  const handleDeleteJob = (id: string) => {
    if (window.confirm("Are you sure you want to remove this service job?")) {
      const updated = jobs.filter(j => j.id !== id);
      setJobs(updated);
      localStorage.setItem('bengal_jobs', JSON.stringify(updated));
    }
  };

  const handleSaveJob = () => {
    if (!jobForm.title) { alert("Please enter a job title."); return; }
    if (!jobForm.customerName) { alert("Please enter a Customer Name."); return; }
    
    const finalCustomerId = jobForm.customerId || `CUST-${Math.floor(Math.random() * 9000) + 1000}`;
    
    let updatedJobs;
    if (editingJobId) {
      updatedJobs = jobs.map(j => j.id === editingJobId ? { ...j, ...jobForm, customerId: finalCustomerId } as Job : j);
    } else {
      const newJob: Job = { 
        ...jobForm, 
        id: `J-${Math.floor(Math.random() * 10000)}`,
        customerId: finalCustomerId 
      } as Job;
      updatedJobs = [newJob, ...jobs];
    }
    
    setJobs(updatedJobs);
    localStorage.setItem('bengal_jobs', JSON.stringify(updatedJobs));
    setIsJobModalOpen(false);
  };

  const selectCustomerSuggestion = (c: any) => {
    setJobForm({ 
      ...jobForm, 
      customerId: c.id, 
      customerName: c.name,
      customerEmail: c.email,
      customerPhone: c.phone,
      customerAddress: c.address
    });
    setShowSuggestions(false);
  };

  const getStatusStyles = (status: JobStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-orange-900/30 text-orange-400 border-orange-800/50';
      case 'IN_PROGRESS': return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
      case 'COMPLETED': return 'bg-green-900/30 text-green-400 border-green-800/50';
      case 'CANCELLED': return 'bg-red-900/30 text-red-400 border-red-800/50';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const days = Array.from({ length: daysInMonth(currentMonth, currentYear) }, (_, i) => i + 1);
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const padding = Array.from({ length: firstDayOfMonth }, () => null);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F2C200]">Back Office Administration</h1>
          <p className="text-gray-400">Manage service jobs, warranties and customer accounts.</p>
        </div>
        <div className="flex space-x-2">
          <div className="bg-[#111111] border border-[#333333] p-1 rounded-xl flex">
            <button onClick={() => setViewMode('LIST')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'LIST' ? 'bg-[#F2C200] text-black' : 'text-gray-500'}`}>
              <i className="fas fa-list mr-2"></i>List
            </button>
            <button onClick={() => setViewMode('CALENDAR')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'CALENDAR' ? 'bg-[#F2C200] text-black' : 'text-gray-500'}`}>
              <i className="fas fa-calendar-alt mr-2"></i>Calendar
            </button>
          </div>
          <button onClick={openAddJobModal} className="bg-[#F2C200] text-black px-6 py-3 rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all">
            <i className="fas fa-plus-circle"></i>
            <span>Create New Job</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button onClick={() => setFilter('WARRANTIES')} className={`bg-[#111111] p-4 rounded-xl border-2 transition-all flex items-center space-x-4 text-left shadow-sm hover:scale-[1.02] ${filter === 'WARRANTIES' ? 'border-[#F2C200] ring-2 ring-[#F2C200]/10' : 'border-[#333333]'}`}>
          <div className="w-10 h-10 rounded-full bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200]"><i className="fas fa-shield-halved"></i></div>
          <div><p className="text-[10px] font-black text-[#F2C200] uppercase tracking-tighter">Warranties</p><p className="text-xl font-black text-white">{jobs.length}</p></div>
        </button>
        <button onClick={() => setFilter('CUSTOMERS')} className={`bg-[#111111] p-4 rounded-xl border-2 transition-all flex items-center space-x-4 text-left shadow-sm hover:scale-[1.02] ${filter === 'CUSTOMERS' ? 'border-[#F2C200] ring-2 ring-[#F2C200]/10' : 'border-[#333333]'}`}>
          <div className="w-10 h-10 rounded-full bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200]"><i className="fas fa-users-gear"></i></div>
          <div><p className="text-[10px] font-black text-[#F2C200] uppercase tracking-tighter">Directory</p><p className="text-xl font-black text-white">{uniqueCustomers.length}</p></div>
        </button>
        <button onClick={() => setFilter('QUOTES')} className={`bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center space-x-4 text-left hover:border-[#F2C200] transition-colors ${filter === 'QUOTES' ? 'border-[#F2C200]' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#F2C200]"><i className="fas fa-file-invoice"></i></div>
          <div><p className="text-[10px] font-bold text-gray-500 uppercase">Pending Quotes</p><p className="text-xl font-black text-white">{pendingQuotes.length}</p></div>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex overflow-x-auto space-x-2 pb-6 md:pb-0 scrollbar-hide flex-grow">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'CUSTOMERS', label: 'Customers' },
            { id: 'QUOTES', label: `Requested (${pendingQuotes.length})` },
            { id: 'QUOTES_PAID', label: `Quotes Paid (${paidQuotes.length})` },
            { id: 'WARRANTIES', label: 'Warranty Details' },
            { id: 'EXPIRING', label: `Expiring Soon (${expiringJobs.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as DashboardFilter)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                filter === tab.id
                  ? `bg-[#F2C200] text-black border-[#F2C200] shadow-md`
                  : 'bg-black text-gray-500 border-[#333333] hover:border-[#F2C200]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="relative min-w-[240px]">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
          <input 
            type="text" 
            placeholder="Search records (ref, name, date)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200] transition-colors"
          />
        </div>
      </div>

      {viewMode === 'CALENDAR' ? (
        <div className="bg-[#111111] p-6 rounded-2xl border border-[#333333] animate-in zoom-in-95">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">
              {now.toLocaleString('default', { month: 'long' })} {currentYear}
            </h2>
          </div>
          <div className="grid grid-cols-7 gap-px bg-[#333333] border border-[#333333] rounded-xl overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-black py-2 text-center text-[10px] font-bold text-gray-500 uppercase">{d}</div>
            ))}
            {[...padding, ...days].map((day, idx) => {
              const dateStr = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
              const dayJobs = day ? jobs
                .filter(j => j.status === 'PENDING' || j.status === 'IN_PROGRESS')
                .filter(j => j.startDate === dateStr)
                .filter(j => matchesSearch(j.title) || matchesSearch(j.customerName) || matchesSearch(j.warrantyEndDate)) 
                : [];
              return (
                <div key={idx} className="bg-black min-h-[100px] p-2 relative group hover:bg-white/5 transition-colors">
                  {day && (
                    <>
                      <span className={`text-sm font-bold ${day === now.getDate() ? 'text-[#F2C200]' : 'text-gray-600'}`}>{day}</span>
                      <div className="mt-1 space-y-1">
                        {dayJobs.map(j => (
                          <Link to={`/jobs/${j.id}`} key={j.id} className="block text-[9px] bg-[#F2C200] text-black p-1 rounded font-black truncate hover:brightness-110">
                            {j.title}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filter === 'WARRANTIES' ? (
            <div className="animate-in slide-in-from-left-4">
              <div className="bg-[#111111] rounded-2xl border border-[#333333] shadow-lg overflow-x-auto scrollbar-hide">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-[#1A1A1A] border-b border-[#333333]">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Equipment</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Expiry</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333333]">
                    {jobs.filter(j => matchesSearch(j.customerName) || matchesSearch(j.title) || matchesSearch(j.warrantyEndDate)).map((job) => (
                      <tr key={job.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-white font-bold">{job.customerName || 'No Name'}</td>
                        <td className="px-6 py-4 text-gray-300">{job.title}</td>
                        <td className="px-6 py-4 text-center font-bold text-[#F2C200]">{new Date(job.warrantyEndDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => { setEditingWarrantyJob(job); setWarrantyEndDate(job.warrantyEndDate); }} 
                            className="bg-[#F2C200] text-black px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : filter === 'CUSTOMERS' ? (
            <div className="animate-in slide-in-from-left-4">
              <div className="bg-[#111111] rounded-2xl border border-[#333333] shadow-lg overflow-x-auto scrollbar-hide">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-[#1A1A1A] border-b border-[#333333]">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Account ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Business Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Primary Contact</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333333]">
                    {filteredCustomersList.map((customer) => (
                      <tr key={customer.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setSelectedCustomerDetail(customer)}>
                        <td className="px-6 py-4">
                          <span className="text-[#F2C200] font-black tracking-widest text-xs uppercase">{customer.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-bold group-hover:text-[#F2C200] transition-colors">{customer.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-300 font-bold">{customer.phone}</span>
                            <span className="text-[10px] text-gray-500">{customer.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end space-x-2">
                              <a href={`tel:${customer.phone}`} className="p-2 text-gray-500 hover:text-[#F2C200]" onClick={e => e.stopPropagation()}><i className="fas fa-phone"></i></a>
                              <a href={`mailto:${customer.email}`} className="p-2 text-gray-500 hover:text-[#F2C200]" onClick={e => e.stopPropagation()}><i className="fas fa-envelope"></i></a>
                              <i className="fas fa-chevron-right text-[10px] text-gray-700 group-hover:text-[#F2C200] transition-colors ml-2"></i>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : filter === 'QUOTES' || filter === 'QUOTES_PAID' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-left-4">
              {(filter === 'QUOTES' ? pendingQuotes : paidQuotes)
                .filter(q => matchesSearch(q.productName) || matchesSearch(q.customerName) || matchesSearch(q.date))
                .map(quote => (
                  <div 
                    key={quote.id} 
                    className="bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center space-x-4 cursor-pointer hover:border-[#F2C200] transition-colors" 
                    onClick={() => setSelectedQuote(quote)}
                  >
                    <img src={quote.productImage} className="w-12 h-12 rounded object-contain bg-black p-1" />
                    <div>
                      <h3 className="text-sm font-bold text-white">{quote.productName}</h3>
                      <p className="text-[10px] text-gray-500">{quote.customerName} • {new Date(quote.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-[#111111] rounded-2xl border border-[#333333] shadow-lg overflow-x-auto scrollbar-hide">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-[#1A1A1A] border-b border-[#333333]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Service Job</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {filteredJobs.map(job => (
                    <tr key={job.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{job.title}</span>
                          <span className="text-xs text-gray-500">Ref: {job.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-300">{job.customerName || 'N/A'}</span>
                          <span className="text-[10px] text-gray-500 mb-1">{job.customerPhone || 'No Phone'}</span>
                          <span className="text-[10px] text-[#F2C200] font-black uppercase tracking-tighter">{job.customerId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full border ${getStatusStyles(job.status)}`}>
                          <select 
                            value={job.status}
                            onChange={(e) => updateStatus(job.id, e.target.value as JobStatus)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer appearance-none pr-4 relative z-10 text-inherit"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                          <i className="fas fa-chevron-down text-[8px] -ml-3 opacity-60"></i>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button onClick={() => generateInviteLink(job)} className="text-gray-500 hover:text-[#F2C200]" title="Copy Invite Link">
                            <i className="fas fa-share-nodes"></i>
                          </button>
                          <button onClick={() => openEditJobModal(job)} className="text-gray-500 hover:text-[#F2C200]" title="Edit Job">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button onClick={() => handleDeleteJob(job.id)} className="text-gray-500 hover:text-red-500" title="Delete Job">
                            <i className="fas fa-trash-alt"></i>
                          </button>
                          <Link to={`/jobs/${job.id}`} className="text-gray-500 hover:text-[#F2C200]" title="View Detail">
                            <i className="fas fa-external-link-alt"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Customer Profile Side Drawer */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-[500] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedCustomerDetail(null)}></div>
          <div className="relative w-full max-w-md bg-[#000000] border-l border-[#333333] h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
             <header className="p-6 border-b border-[#333333] flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedCustomerDetail.name}</h2>
                  <p className="text-[10px] font-black text-[#F2C200] uppercase tracking-[0.2em]">{selectedCustomerDetail.id}</p>
                </div>
                <button onClick={() => setSelectedCustomerDetail(null)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-gray-500 transition-colors">
                  <i className="fas fa-times"></i>
                </button>
             </header>
             
             <div className="flex-grow overflow-y-auto p-6 space-y-8 scrollbar-hide">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact Details</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-[#111111] p-4 rounded-xl border border-[#333333]">
                      <div className="flex items-center space-x-3 mb-1">
                        <i className="fas fa-envelope text-[#F2C200] text-xs"></i>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address</span>
                      </div>
                      <p className="text-sm font-bold text-white ml-6">{selectedCustomerDetail.email}</p>
                    </div>
                    <div className="bg-[#111111] p-4 rounded-xl border border-[#333333]">
                      <div className="flex items-center space-x-3 mb-1">
                        <i className="fas fa-phone text-[#F2C200] text-xs"></i>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Phone Number</span>
                      </div>
                      <p className="text-sm font-bold text-white ml-6">{selectedCustomerDetail.phone}</p>
                    </div>
                    <div className="bg-[#111111] p-4 rounded-xl border border-[#333333]">
                      <div className="flex items-center space-x-3 mb-1">
                        <i className="fas fa-location-dot text-[#F2C200] text-xs"></i>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Service Address</span>
                      </div>
                      <p className="text-sm font-bold text-white ml-6 leading-relaxed">{selectedCustomerDetail.address}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Contracts & History</h3>
                    <span className="text-[10px] font-bold text-gray-600 uppercase">{jobs.filter(j => j.customerId === selectedCustomerDetail.id).length} records</span>
                  </div>
                  <div className="space-y-3">
                    {jobs.filter(j => j.customerId === selectedCustomerDetail.id).length > 0 ? (
                      jobs.filter(j => j.customerId === selectedCustomerDetail.id).map(j => (
                        <Link 
                          key={j.id} 
                          to={`/jobs/${j.id}`}
                          className="block p-4 bg-[#111111] border border-[#333333] rounded-xl hover:border-[#F2C200] transition-all group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-[#F2C200] tracking-widest uppercase">{j.id}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusStyles(j.status)}`}>{j.status}</span>
                          </div>
                          <p className="text-sm font-bold text-white group-hover:text-[#F2C200] transition-colors">{j.title}</p>
                          <p className="text-[10px] text-gray-500 mt-1">Started: {new Date(j.startDate).toLocaleDateString()}</p>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-[#111111] rounded-xl border border-dashed border-[#333333] text-gray-500 text-xs">
                        No service records found.
                      </div>
                    )}
                  </div>
                </section>
             </div>

             <footer className="p-6 border-t border-[#333333] bg-black grid grid-cols-2 gap-3">
                <a href={`tel:${selectedCustomerDetail.phone}`} className="flex items-center justify-center space-x-2 py-3 bg-[#111111] border border-[#333333] text-white rounded-xl text-xs font-bold hover:border-[#F2C200] transition-colors">
                  <i className="fas fa-phone-alt"></i>
                  <span>Call Now</span>
                </a>
                <a href={`mailto:${selectedCustomerDetail.email}`} className="flex items-center justify-center space-x-2 py-3 bg-[#111111] border border-[#333333] text-white rounded-xl text-xs font-bold hover:border-[#F2C200] transition-colors">
                  <i className="fas fa-envelope"></i>
                  <span>Send Email</span>
                </a>
                <button 
                  onClick={() => {
                    setFilter('ALL');
                    setSearchQuery(selectedCustomerDetail.id);
                    setSelectedCustomerDetail(null);
                  }} 
                  className="col-span-2 flex items-center justify-center space-x-2 py-4 bg-[#F2C200] text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all"
                >
                  <i className="fas fa-magnifying-glass"></i>
                  <span>View All Associated Jobs</span>
                </button>
             </footer>
          </div>
        </div>
      )}

      {isJobModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingJobId ? 'Amend Service Job' : 'Create New Service Job'}</h2>
              <button onClick={() => setIsJobModalOpen(false)} className="text-black hover:opacity-70"><i className="fas fa-times text-xl"></i></button>
            </div>
            <div className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="relative md:col-span-1" ref={suggestionRef}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Account Code</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={jobForm.customerId} 
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setJobForm({...jobForm, customerId: e.target.value.toUpperCase()});
                        setShowSuggestions(true);
                      }} 
                      placeholder="e.g. MICK01" 
                      className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-black tracking-widest" 
                    />
                    {showSuggestions && filteredCustomersForSearch.length > 0 && (
                      <div className="absolute z-[210] left-0 right-0 mt-2 bg-[#1A1A1A] border border-[#333333] rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden scrollbar-hide">
                        {filteredCustomersForSearch.map(c => (
                          <button key={c.id} onClick={() => selectCustomerSuggestion(c)} className="w-full flex items-center justify-between p-4 hover:bg-[#F2C200] hover:text-black transition-colors text-left border-b border-white/5">
                            <div><p className="font-black text-xs tracking-widest">{c.id}</p><p className="text-[10px] opacity-70 font-bold">{c.name}</p></div>
                            <i className="fas fa-plus-circle text-xs opacity-40"></i>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Customer / Business Name</label>
                  <input type="text" value={jobForm.customerName} onChange={(e) => setJobForm({...jobForm, customerName: e.target.value})} placeholder="e.g. Mick's Café" className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                  <input type="email" value={jobForm.customerEmail} onChange={(e) => setJobForm({...jobForm, customerEmail: e.target.value})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" />
                </div>
                
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contact Phone</label>
                  <input type="tel" value={jobForm.customerPhone} onChange={(e) => setJobForm({...jobForm, customerPhone: e.target.value})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Service Address</label>
                  <textarea rows={2} value={jobForm.customerAddress} onChange={(e) => setJobForm({...jobForm, customerAddress: e.target.value})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl outline-none resize-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Job Title</label>
                  <input type="text" value={jobForm.title} onChange={(e) => setJobForm({...jobForm, title: e.target.value})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                  <textarea rows={2} value={jobForm.description} onChange={(e) => setJobForm({...jobForm, description: e.target.value})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fee (£)</label>
                  <input type="number" value={jobForm.amount} onChange={(e) => setJobForm({...jobForm, amount: parseFloat(e.target.value)})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                  <select value={jobForm.status} onChange={(e) => setJobForm({...jobForm, status: e.target.value as JobStatus})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl">
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="pt-6 border-t border-[#333333]">
                <button onClick={handleSaveJob} className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#F2C2001A]">
                  {editingJobId ? 'Update Service Record' : 'Commence New Job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedQuote && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-6 bg-black text-[#F2C200] border-b border-[#333333] flex justify-between items-center">
              <h2 className="text-xl font-bold">Quote Detail</h2>
              <button onClick={() => setSelectedQuote(null)} className="text-white hover:text-[#F2C200]"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-6 space-y-4">
               <p className="text-gray-300">Customer: <span className="font-bold">{selectedQuote.customerName}</span></p>
               <p className="text-gray-300">Item: <span className="font-bold">{selectedQuote.productName}</span></p>
               {(selectedQuote.status === 'NEW' || selectedQuote.status === 'QUOTED') && (
                 <div className="space-y-4 pt-4">
                   <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase">Service Price (£)</label>
                    <input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 bg-black border border-[#333333] text-white rounded-xl focus:border-[#F2C200] outline-none" />
                   </div>
                   <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase">Admin Notes</label>
                    <textarea rows={3} value={notesInput} onChange={(e) => setNotesInput(e.target.value)} placeholder="Enter details for the customer..." className="w-full px-4 py-3 bg-black border border-[#333333] text-white rounded-xl focus:border-[#F2C200] outline-none resize-none" />
                   </div>
                   <button onClick={() => { onUpdateQuote(selectedQuote.id, parseFloat(priceInput) || 0, notesInput); setSelectedQuote(null); }} className="w-full bg-[#F2C200] text-black py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#F2C2001A]">
                     {selectedQuote.status === 'NEW' ? 'Send Quote to Customer' : 'Update Sent Quote'}
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {editingWarrantyJob && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">Adjust Warranty Dates</h2>
              <button onClick={() => setEditingWarrantyJob(null)} className="text-black"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiry Date</label>
                <input type="date" value={warrantyEndDate} onChange={(e) => setWarrantyEndDate(e.target.value)} className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white" />
              </div>
              <button 
                onClick={() => { 
                  const updated = jobs.map(j => j.id === editingWarrantyJob.id ? { ...j, warrantyEndDate } : j);
                  setJobs(updated);
                  localStorage.setItem('bengal_jobs', JSON.stringify(updated));
                  setEditingWarrantyJob(null); 
                }} 
                className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
