import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_JOBS, MOCK_USER_CUSTOMER } from '../mockData';
import { COLORS } from '../constants';
import { JobStatus, QuoteRequest, Job } from '../types';

interface AdminDashboardProps {
  quotes: QuoteRequest[];
  onUpdateQuote: (id: string, price: number, notes: string) => void;
}

type DashboardFilter = JobStatus | 'ALL' | 'QUOTES' | 'QUOTES_PAID' | 'EXPIRING' | 'WARRANTIES';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ quotes, onUpdateQuote }) => {
  const [filter, setFilter] = useState<DashboardFilter>('ALL');
  const [jobs, setJobs] = useState<Job[]>([]);
  
  // Load jobs from localStorage or fallback to MOCK_JOBS
  useEffect(() => {
    const savedJobs = localStorage.getItem('bengal_jobs');
    if (savedJobs) {
      setJobs(JSON.parse(savedJobs));
    } else {
      setJobs(MOCK_JOBS);
    }
  }, []);

  // Persist jobs to localStorage
  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem('bengal_jobs', JSON.stringify(jobs));
    }
  }, [jobs]);

  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [editingWarrantyJob, setEditingWarrantyJob] = useState<Job | null>(null);
  
  // Job Form State
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
    customerId: 'u1'
  });

  const [isAddingPrice, setIsAddingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');

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
    ['QUOTES', 'QUOTES_PAID', 'WARRANTIES'].includes(filter) ? [] : 
    filter === 'EXPIRING' ? expiringJobs :
    filter === 'ALL' ? jobs : jobs.filter(j => j.status === filter);

  const updateStatus = (id: string, newStatus: JobStatus) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j));
  };

  const handleUpdateWarranty = () => {
    if (editingWarrantyJob) {
      setJobs(prev => prev.map(j => 
        j.id === editingWarrantyJob.id 
          ? { ...j, startDate: warrantyStartDate, warrantyEndDate: warrantyEndDate } 
          : j
      ));
      setEditingWarrantyJob(null);
    }
  };

  const handleSendQuote = () => {
    if (selectedQuote && priceInput) {
      onUpdateQuote(selectedQuote.id, parseFloat(priceInput), notesInput);
      setIsAddingPrice(false);
      setSelectedQuote(null);
      setPriceInput('');
      setNotesInput('');
    }
  };

  // Job CRUD functions
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
      customerId: 'u1'
    });
    setIsJobModalOpen(true);
  };

  const openEditJobModal = (job: Job) => {
    setEditingJobId(job.id);
    setJobForm({ ...job });
    setIsJobModalOpen(true);
  };

  const handleDeleteJob = (id: string) => {
    if (window.confirm("Are you sure you want to remove this service job? This action cannot be undone.")) {
      setJobs(prev => prev.filter(j => j.id !== id));
    }
  };

  const handleSaveJob = () => {
    if (!jobForm.title) {
      alert("Please enter a job title.");
      return;
    }

    if (editingJobId) {
      // Amend
      setJobs(prev => prev.map(j => j.id === editingJobId ? { ...j, ...jobForm } as Job : j));
    } else {
      // Add
      const newJob: Job = {
        ...jobForm,
        id: `J-${Math.floor(Math.random() * 10000)}`,
      } as Job;
      setJobs(prev => [newJob, ...prev]);
    }
    setIsJobModalOpen(false);
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

  const getWarrantyStatusBadge = (endDate: string) => {
    const expiry = new Date(endDate);
    const today = new Date();
    if (expiry < today) return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold">EXPIRED</span>;
    return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold">ACTIVE</span>;
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F2C200]">Back Office Administration</h1>
          <p className="text-gray-400">Manage service jobs, warranties and customer inquiries.</p>
        </div>
        <button 
          onClick={openAddJobModal}
          className="bg-[#F2C200] text-black px-6 py-3 rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all"
        >
          <i className="fas fa-plus-circle"></i>
          <span>Create New Job</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button onClick={() => setFilter('WARRANTIES')} className={`bg-[#111111] p-4 rounded-xl border-2 transition-all flex items-center space-x-4 text-left shadow-sm hover:scale-[1.02] ${filter === 'WARRANTIES' ? 'border-[#F2C200] ring-2 ring-[#F2C200]/10' : 'border-[#333333]'}`}>
          <div className="w-10 h-10 rounded-full bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200]">
            <i className="fas fa-shield-halved"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-[#F2C200] uppercase tracking-tighter">Warranties</p>
            <p className="text-xl font-black text-white">{jobs.length}</p>
          </div>
        </button>

        <button onClick={() => setFilter('QUOTES')} className={`bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center space-x-4 text-left hover:border-[#F2C200] transition-colors ${filter === 'QUOTES' ? 'border-[#F2C200]' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#F2C200]">
            <i className="fas fa-file-invoice"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Pending</p>
            <p className="text-xl font-black text-white">{pendingQuotes.length}</p>
          </div>
        </button>

        <button onClick={() => setFilter('QUOTES_PAID')} className={`bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center space-x-4 text-left hover:border-green-500 transition-colors ${filter === 'QUOTES_PAID' ? 'border-green-500' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <i className="fas fa-sack-dollar"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Paid</p>
            <p className="text-xl font-black text-white">{paidQuotes.length}</p>
          </div>
        </button>
        
        <div className="bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <i className="fas fa-tools"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Active</p>
            <p className="text-xl font-black text-white">{jobs.filter(j => j.status !== 'COMPLETED').length}</p>
          </div>
        </div>
        
        <div className="bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400">
            <i className="fas fa-check-double"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Done</p>
            <p className="text-xl font-black text-white">{jobs.filter(j => j.status === 'COMPLETED').length}</p>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
        {['ALL', 'PENDING', 'IN_PROGRESS', 'QUOTES', 'QUOTES_PAID', 'EXPIRING', 'WARRANTIES'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as DashboardFilter)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
              filter === tab
                ? `bg-[#F2C200] text-black border-[#F2C200] shadow-md`
                : 'bg-black text-gray-500 border-[#333333] hover:border-[#F2C200]'
            }`}
          >
            {tab === 'QUOTES' ? `Requested (${pendingQuotes.length})` : 
             tab === 'QUOTES_PAID' ? `Quotes Paid (${paidQuotes.length})` :
             tab === 'EXPIRING' ? `Expiring Soon (${expiringJobs.length})` : 
             tab === 'WARRANTIES' ? `Warranty Details (${jobs.length})` :
             tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filter === 'WARRANTIES' ? (
        <div className="animate-in slide-in-from-left-4">
          <div className="bg-[#111111] rounded-2xl border border-[#333333] shadow-lg overflow-x-auto scrollbar-hide">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-[#1A1A1A] border-b border-[#333333]">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Equipment / Job</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Dates</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{MOCK_USER_CUSTOMER.name}</span>
                        <span className="text-[10px] text-gray-500">{MOCK_USER_CUSTOMER.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-300">{job.title}</span>
                        <span className="text-[10px] text-gray-500">Ref: {job.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-[11px] space-y-1">
                        <div className="flex items-center justify-center space-x-1">
                          <span className="text-gray-500 uppercase whitespace-nowrap">Start:</span>
                          <span className="font-bold text-[#F2C200] whitespace-nowrap">{new Date(job.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-center space-x-1">
                          <span className="text-gray-500 uppercase whitespace-nowrap">End:</span>
                          <span className="font-bold text-[#F2C200] whitespace-nowrap">{new Date(job.warrantyEndDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getWarrantyStatusBadge(job.warrantyEndDate)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setEditingWarrantyJob(job);
                          setWarrantyStartDate(job.startDate);
                          setWarrantyEndDate(job.warrantyEndDate);
                        }}
                        className="text-sm font-bold text-[#F2C200] hover:text-white transition-colors"
                      >
                        Set Dates
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filter === 'QUOTES' || filter === 'QUOTES_PAID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-left-4">
          {(filter === 'QUOTES' ? pendingQuotes : paidQuotes).map(quote => (
            <div 
              key={quote.id} 
              className={`bg-[#111111] p-4 rounded-xl border transition-all flex items-start space-x-4 hover:shadow-xl cursor-pointer ${filter === 'QUOTES_PAID' ? 'border-green-900/50' : 'border-[#333333]'}`}
              onClick={() => setSelectedQuote(quote)}
            >
              <img src={quote.productImage} alt="" className="w-16 h-16 rounded-lg object-contain bg-black border border-[#333333]" />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white">{quote.productName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${quote.status === 'NEW' ? 'bg-[#F2C200] text-black' : 'bg-green-100 text-green-700'}`}>
                    {quote.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Ref: {quote.id}</p>
                {quote.price && <p className="text-sm font-black text-[#F2C200] mt-2">£{quote.price.toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#111111] rounded-2xl border border-[#333333] shadow-lg overflow-x-auto scrollbar-hide animate-in fade-in">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-[#1A1A1A] border-b border-[#333333]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Service Job</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
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
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full border ${getStatusStyles(job.status)}`}>
                      <select 
                        value={job.status}
                        onChange={(e) => updateStatus(job.id, e.target.value as JobStatus)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer appearance-none pr-4 relative z-10 text-inherit"
                      >
                        <option className="bg-[#111111]" value="PENDING">Pending</option>
                        <option className="bg-[#111111]" value="IN_PROGRESS">In Progress</option>
                        <option className="bg-[#111111]" value="COMPLETED">Completed</option>
                        <option className="bg-[#111111]" value="CANCELLED">Cancelled</option>
                      </select>
                      <i className="fas fa-chevron-down text-[8px] -ml-3 opacity-60"></i>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold whitespace-nowrap ${job.paymentStatus === 'PAID' ? 'text-green-500' : 'text-[#F2C200]'}`}>
                      £{job.amount.toLocaleString()} ({job.paymentStatus})
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button 
                        onClick={() => openEditJobModal(job)}
                        className="text-gray-500 hover:text-[#F2C200] transition-colors"
                        title="Edit Job"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                        title="Delete Job"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                      <Link to={`/jobs/${job.id}`} className="text-gray-500 hover:text-[#F2C200] transition-colors">
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

      {/* Unified Job Modal (Add/Amend) */}
      {isJobModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingJobId ? 'Amend Service Job' : 'Create New Service Job'}</h2>
              <button onClick={() => setIsJobModalOpen(false)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Job Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Extraction Hood Maintenance"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Provide details about the service provided..."
                    value={jobForm.description}
                    onChange={(e) => setJobForm({...jobForm, description: e.target.value})}
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Service Fee (£)</label>
                  <input 
                    type="number" 
                    value={jobForm.amount}
                    onChange={(e) => setJobForm({...jobForm, amount: parseFloat(e.target.value)})}
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Job Status</label>
                  <select 
                    value={jobForm.status}
                    onChange={(e) => setJobForm({...jobForm, status: e.target.value as JobStatus})}
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Commencement Date</label>
                  <input 
                    type="date" 
                    value={jobForm.startDate}
                    onChange={(e) => setJobForm({...jobForm, startDate: e.target.value})}
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warranty Expiry</label>
                  <input 
                    type="date" 
                    value={jobForm.warrantyEndDate}
                    onChange={(e) => setJobForm({...jobForm, warrantyEndDate: e.target.value})}
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Status</label>
                  <select 
                    value={jobForm.paymentStatus}
                    onChange={(e) => setJobForm({...jobForm, paymentStatus: e.target.value as any})}
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assign Customer</label>
                  <select 
                    value={jobForm.customerId}
                    onChange={(e) => setJobForm({...jobForm, customerId: e.target.value})}
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                  >
                    <option value="u1">John Doe Engineering (u1)</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-[#333333]">
                <button 
                  onClick={handleSaveJob}
                  className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all"
                >
                  {editingJobId ? 'Update Service Record' : 'Commence New Job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Warranty Edit Modal (Legacy but kept for date-specific quick updates) */}
      {editingWarrantyJob && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Warranty</h2>
              <button onClick={() => setEditingWarrantyJob(null)} className="text-black">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Start Date</label>
                <input type="date" value={warrantyStartDate} onChange={(e) => setWarrantyStartDate(e.target.value)} className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white focus:ring-1 focus:ring-[#F2C200]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiry Date</label>
                <input type="date" value={warrantyEndDate} onChange={(e) => setWarrantyEndDate(e.target.value)} className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white focus:ring-1 focus:ring-[#F2C200]" />
              </div>
              <button onClick={handleUpdateWarranty} className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-bold shadow-lg shadow-[#F2C2001A]">
                Update Warranty
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Details Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 bg-black text-[#F2C200] border-b border-[#333333] flex justify-between items-center">
              <h2 className="text-xl font-bold">Quote Request Detail</h2>
              <button onClick={() => setSelectedQuote(null)} className="text-white hover:text-[#F2C200]">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4 p-4 bg-black rounded-2xl border border-[#333333]">
                <img src={selectedQuote.productImage} alt="" className="w-16 h-16 object-contain" />
                <div>
                  <h3 className="font-bold text-white">{selectedQuote.productName}</h3>
                  <p className="text-xs text-gray-500">Customer: {selectedQuote.customerName}</p>
                </div>
              </div>

              {isAddingPrice ? (
                <div className="space-y-4">
                  <input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="Service Price (£)" className="w-full px-4 py-3 bg-black border border-[#333333] text-white rounded-xl outline-none focus:ring-1 focus:ring-[#F2C200]" />
                  <textarea rows={4} value={notesInput} onChange={(e) => setNotesInput(e.target.value)} placeholder="Service Notes" className="w-full px-4 py-3 bg-black border border-[#333333] text-white rounded-xl outline-none focus:ring-1 focus:ring-[#F2C200] resize-none" />
                  <button onClick={handleSendQuote} className="w-full bg-[#F2C200] text-black py-4 rounded-xl font-bold">Send Quote</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-[#333333] rounded-xl">
                    <p className="text-xs font-bold uppercase text-[#F2C200]">Customer Notes:</p>
                    <p className="text-sm italic text-gray-300 mt-1">"{selectedQuote.customerNotes || 'No notes provided.'}"</p>
                  </div>
                  {selectedQuote.applianceImage && (
                    <img src={selectedQuote.applianceImage} className="w-full h-48 object-cover rounded-xl border border-[#333333]" alt="Appliance Photo" />
                  )}
                  {selectedQuote.status === 'NEW' && (
                    <button onClick={() => setIsAddingPrice(true)} className="w-full bg-[#F2C200] text-black py-4 rounded-xl font-bold">
                      Add Pricing & Notes
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;