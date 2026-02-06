
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_JOBS } from '../mockData';
import { COLORS } from '../constants';
import { JobStatus, QuoteRequest, Job } from '../types';

interface AdminDashboardProps {
  quotes: QuoteRequest[];
  onUpdateQuote: (id: string, price: number, notes: string) => void;
}

type DashboardFilter = JobStatus | 'ALL' | 'QUOTES' | 'QUOTES_PAID' | 'EXPIRING' | 'WARRANTIES';
type ViewMode = 'LIST' | 'CALENDAR';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ quotes, onUpdateQuote }) => {
  const [filter, setFilter] = useState<DashboardFilter>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [jobs, setJobs] = useState<Job[]>([]);
  
  useEffect(() => {
    const savedJobs = localStorage.getItem('bengal_jobs');
    if (savedJobs) {
      setJobs(JSON.parse(savedJobs));
    } else {
      setJobs(MOCK_JOBS);
      localStorage.setItem('bengal_jobs', JSON.stringify(MOCK_JOBS));
    }
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
    customerName: ''
  });

  const [priceInput, setPriceInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
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
      customerName: ''
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
    
    // Logic for Unique Customer ID
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
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
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
        <button onClick={() => setFilter('QUOTES')} className={`bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center space-x-4 text-left hover:border-[#F2C200] transition-colors ${filter === 'QUOTES' ? 'border-[#F2C200]' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#F2C200]"><i className="fas fa-file-invoice"></i></div>
          <div><p className="text-[10px] font-bold text-gray-500 uppercase">Pending</p><p className="text-xl font-black text-white">{pendingQuotes.length}</p></div>
        </button>
        <button onClick={() => setFilter('QUOTES_PAID')} className={`bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center space-x-4 text-left hover:border-green-500 transition-colors ${filter === 'QUOTES_PAID' ? 'border-green-500' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500"><i className="fas fa-sack-dollar"></i></div>
          <div><p className="text-[10px] font-bold text-gray-500 uppercase">Paid</p><p className="text-xl font-black text-white">{paidQuotes.length}</p></div>
        </button>
      </div>

      <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
        {[
          { id: 'ALL', label: 'ALL' },
          { id: 'PENDING', label: 'PENDING' },
          { id: 'IN_PROGRESS', label: 'IN PROGRESS' },
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
              const dayJobs = day ? jobs.filter(j => j.startDate === dateStr) : [];
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
                    {jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-white font-bold">{job.customerName || 'No Name'}</td>
                        <td className="px-6 py-4 text-gray-300">{job.title}</td>
                        <td className="px-6 py-4 text-center font-bold text-[#F2C200]">{new Date(job.warrantyEndDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setEditingWarrantyJob(job)} className="text-[#F2C200] text-xs font-black uppercase">Adjust</button>
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
                <div key={quote.id} className="bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center space-x-4 cursor-pointer" onClick={() => setSelectedQuote(quote)}>
                  <img src={quote.productImage} className="w-12 h-12 rounded object-contain bg-black p-1" />
                  <div>
                    <h3 className="text-sm font-bold text-white">{quote.productName}</h3>
                    <p className="text-[10px] text-gray-500">{quote.customerName}</p>
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
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer (Acct Code)</th>
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
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-300">{job.customerName || 'N/A'}</span>
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
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold whitespace-nowrap ${job.paymentStatus === 'PAID' ? 'text-green-500' : 'text-[#F2C200]'}`}>
                          £{job.amount.toLocaleString()} ({job.paymentStatus})
                        </span>
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

      {isJobModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingJobId ? 'Amend Service Job' : 'Create New Service Job'}</h2>
              <button onClick={() => setIsJobModalOpen(false)} className="text-black hover:opacity-70"><i className="fas fa-times text-xl"></i></button>
            </div>
            <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Customer / Business Name</label>
                  <input type="text" value={jobForm.customerName} onChange={(e) => setJobForm({...jobForm, customerName: e.target.value})} placeholder="e.g. Mick's Café" className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Account Code (Auto-generated if empty)</label>
                  <input type="text" value={jobForm.customerId} onChange={(e) => setJobForm({...jobForm, customerId: e.target.value})} placeholder="e.g. MICK01" className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" />
                  <p className="text-[10px] text-gray-500 mt-1">Use same code to group history for one customer.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Job Title</label>
                  <input type="text" value={jobForm.title} onChange={(e) => setJobForm({...jobForm, title: e.target.value})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                  <textarea rows={3} value={jobForm.description} onChange={(e) => setJobForm({...jobForm, description: e.target.value})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl outline-none resize-none" />
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
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Start Date</label><input type="date" value={jobForm.startDate} onChange={(e) => setJobForm({...jobForm, startDate: e.target.value})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl" /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warranty Expiry</label><input type="date" value={jobForm.warrantyEndDate} onChange={(e) => setJobForm({...jobForm, warrantyEndDate: e.target.value})} className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl" /></div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-lg overflow-hidden shadow-2xl">
            <div className="p-6 bg-black text-[#F2C200] border-b border-[#333333] flex justify-between items-center">
              <h2 className="text-xl font-bold">Quote Detail</h2>
              <button onClick={() => setSelectedQuote(null)} className="text-white hover:text-[#F2C200]"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-6 space-y-4">
               <p className="text-gray-300">Customer: <span className="font-bold">{selectedQuote.customerName}</span></p>
               <p className="text-gray-300">Item: <span className="font-bold">{selectedQuote.productName}</span></p>
               {selectedQuote.status === 'NEW' && (
                 <div className="space-y-4 pt-4">
                   <input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="Service Price (£)" className="w-full px-4 py-3 bg-black border border-[#333333] text-white rounded-xl" />
                   <textarea value={notesInput} onChange={(e) => setNotesInput(e.target.value)} placeholder="Admin Notes" className="w-full px-4 py-3 bg-black border border-[#333333] text-white rounded-xl" />
                   <button onClick={() => { onUpdateQuote(selectedQuote.id, parseFloat(priceInput), notesInput); setSelectedQuote(null); }} className="w-full bg-[#F2C200] text-black py-4 rounded-xl font-bold">Update Quote</button>
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
              <h2 className="text-xl font-bold">Adjust Dates</h2>
              <button onClick={() => setEditingWarrantyJob(null)} className="text-black"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiry Date</label>
                <input type="date" value={warrantyEndDate} onChange={(e) => setWarrantyEndDate(e.target.value)} className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white" />
              </div>
              <button onClick={() => { 
                const updated = jobs.map(j => j.id === editingWarrantyJob.id ? { ...j, warrantyEndDate } : j);
                setJobs(updated);
                localStorage.setItem('bengal_jobs', JSON.stringify(updated));
                setEditingWarrantyJob(null); 
              }} className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-bold">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
