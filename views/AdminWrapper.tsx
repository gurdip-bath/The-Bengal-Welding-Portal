
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JobStatus, Job } from '../types';
import { getAllUsers, registerEmployee } from '../lib/auth';
import { listAllJobsForAdmin, deleteJob, upsertJob, updateCustomerFieldsForJobs, updateJob } from '../lib/jobs';
import { AdminProvider } from '../contexts/AdminContext';
import AdminLayout from '../components/AdminLayout';
import PhoneCallButton, { phoneToTelHref } from '../components/PhoneCallButton';
import { User } from '../types';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface AdminWrapperProps {
  user: User;
  onLogout: () => void;
}

const AdminWrapper: React.FC<AdminWrapperProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<CustomerProfile | null>(null);
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [customerEditForm, setCustomerEditForm] = useState<CustomerProfile | null>(null);
  const [editingWarrantyJob, setEditingWarrantyJob] = useState<Job | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isAddSiteTypeModalOpen, setIsAddSiteTypeModalOpen] = useState(false);
  const [selectedSiteType, setSelectedSiteType] = useState<'TR19' | 'INSTALLATION' | ''>('');
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState<Partial<Job>>({
    title: '',
    description: '',
    amount: 0,
    startDate: new Date().toISOString().split('T')[0],
    warrantyEndDate: new Date().toISOString().split('T')[0],
    scheduledCleanDate: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    customerPostcode: '',
    contactName: '',
    frequency: 'Every 12 months',
  });

  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState<{ name: string; email: string; password: string; role: 'ENGINEER' | 'ADMIN' }>({ name: '', email: '', password: '', role: 'ENGINEER' });
  const [employeeError, setEmployeeError] = useState('');
  const [employeeSuccess, setEmployeeSuccess] = useState<boolean | { role: 'ENGINEER' | 'ADMIN' }>(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');

  useEffect(() => {
    // Admin data is Supabase-authoritative. Remove legacy local cache to prevent stale test data.
    try {
      localStorage.removeItem('bengal_jobs');
    } catch {
      // ignore
    }
  }, []);

  const refreshJobs = async () => {
    const supabaseJobs = await listAllJobsForAdmin();
    setJobs(supabaseJobs);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await refreshJobs();
      } catch {
        // Supabase may not be configured
      }
    };
    load();
  }, []);

  const matchesSearch = (text?: string) =>
    !searchQuery || (text || '').toLowerCase().includes(searchQuery.toLowerCase());

  const uniqueCustomers: CustomerProfile[] = Array.from(
    jobs.reduce(
      (map, job) => {
        if (job.customerId && !map.has(job.customerId)) {
          map.set(job.customerId, {
            id: job.customerId,
            name: job.customerName || 'No Name',
            email: job.customerEmail || '',
            phone: job.customerPhone || '',
            address: job.customerAddress || '',
          });
        }
        return map;
      },
      new Map<string, CustomerProfile>()
    )
  ).map(([_, data]) => data);

  const updateStatus = (id: string, newStatus: JobStatus) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j)));
    updateJob(id, { status: newStatus }).catch(() => {
      // If offline/misconfigured, revert is complex; next refresh will reconcile.
    });
  };

  const copySignUpLink = (job: Job) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const signUpLink = `${baseUrl}#/signup`;
    navigator.clipboard.writeText(signUpLink);
    alert(
      `Sign-up link copied for ${job.customerName || 'Customer'}!\n\nShare this link so they can create their own account.\n\nLink: ${signUpLink}`
    );
  };

  const openAddJobModal = () => {
    setEditingJobId(null);
    setJobForm({
      title: '',
      description: '',
      amount: 0,
      startDate: new Date().toISOString().split('T')[0],
      warrantyEndDate: new Date().toISOString().split('T')[0],
      scheduledCleanDate: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      customerId: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      customerPostcode: '',
      contactName: '',
      frequency: 'Every 12 months',
      accessDifficulty: undefined,
      applianceLocation: '',
      accessInstructions: '',
      equipmentRequired: '',
      ppeRequired: '',
    });
    setIsJobModalOpen(true);
  };

  const openAddSiteTypeModal = () => {
    setSelectedSiteType('');
    setIsAddSiteTypeModalOpen(true);
  };

  const openEditJobModal = (job: Job) => {
    setEditingJobId(job.id);
    setJobForm({
      ...job,
      customerPostcode: job.customerPostcode || '',
      contactName: job.contactName || '',
      frequency: job.frequency || 'Every 12 months',
    });
    setIsJobModalOpen(true);
  };

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this service job?')) return;
    try {
      await deleteJob(id);
    } catch {
      // Ignore: UI will still remove; next refresh reconciles.
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const handleSaveJob = async () => {
    if (!jobForm.customerName) {
      alert('Please enter a Site Name.');
      return;
    }
    if (!jobForm.customerPostcode) {
      alert('Please enter a Postcode.');
      return;
    }
    if (!jobForm.accessDifficulty || !jobForm.applianceLocation?.trim() || !jobForm.accessInstructions?.trim() || !jobForm.equipmentRequired?.trim() || !jobForm.ppeRequired?.trim()) {
      alert('Please complete all Engineer Access fields (Access Difficulty, Appliance Location, Access Instructions, Equipment Required, PPE Required).');
      return;
    }
    const finalCustomerId = jobForm.customerId || `SITE-${Math.floor(Math.random() * 9000) + 1000}`;

    if (editingJobId) {
      const next = jobs.find((j) => j.id === editingJobId);
      if (!next) return;
      const merged = { ...next, ...jobForm, customerId: finalCustomerId } as Job;
      setJobs((prev) => prev.map((j) => (j.id === editingJobId ? merged : j)));
      try {
        await upsertJob(merged);
      } catch {
        // ignore; next refresh reconciles
      }
    } else {
      const newJob: Job = {
        ...jobForm,
        id: `J-${Math.floor(Math.random() * 10000)}`,
        customerId: finalCustomerId,
      } as Job;
      setJobs((prev) => [newJob, ...prev]);
      try {
        const saved = await upsertJob(newJob);
        setJobs((prev) => prev.map((j) => (j.id === newJob.id ? saved : j)));
      } catch {
        // ignore; next refresh reconciles
      }
    }
    setIsJobModalOpen(false);
  };

  const handleOpenEditCustomer = () => {
    if (selectedCustomerDetail) {
      setCustomerEditForm({ ...selectedCustomerDetail });
      setIsEditCustomerModalOpen(true);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!customerEditForm) return;
    setJobs((prev) =>
      prev.map((job) =>
        job.customerId === customerEditForm.id
          ? {
              ...job,
              customerName: customerEditForm.name,
              customerEmail: customerEditForm.email,
              customerPhone: customerEditForm.phone,
              customerAddress: customerEditForm.address,
            }
          : job
      )
    );
    try {
      await updateCustomerFieldsForJobs(customerEditForm.id, {
        name: customerEditForm.name,
        email: customerEditForm.email,
        phone: customerEditForm.phone,
        address: customerEditForm.address,
      });
      await refreshJobs();
    } catch {
      // ignore
    }
    setSelectedCustomerDetail(customerEditForm);
    setIsEditCustomerModalOpen(false);
    alert('Customer contact details updated across all service records.');
  };

  const handleAddEmployee = async () => {
    setEmployeeError('');
    setEmployeeSuccess(false);
    if (!employeeForm.name.trim()) {
      setEmployeeError('Please enter the employee name.');
      return;
    }
    if (!employeeForm.email.trim()) {
      setEmployeeError('Please enter the employee email.');
      return;
    }
    if (!employeeForm.password || employeeForm.password.length < 6) {
      setEmployeeError('Password must be at least 6 characters.');
      return;
    }
    setEmployeeLoading(true);
    try {
      const result = await registerEmployee({
        name: employeeForm.name.trim(),
        email: employeeForm.email.trim(),
        password: employeeForm.password,
        role: employeeForm.role,
      });
      if (result.success) {
        setEmployeeSuccess({ role: employeeForm.role });
        setEmployeeForm({ name: '', email: '', password: '', role: 'ENGINEER' });
        setTimeout(() => {
          setIsAddEmployeeModalOpen(false);
          setEmployeeSuccess(false);
        }, 1500);
      } else {
        setEmployeeError(result.error || 'Failed to create employee.');
      }
    } catch (err) {
      setEmployeeError(err instanceof Error ? err.message : 'Failed to create employee. Please try again.');
    } finally {
      setEmployeeLoading(false);
    }
  };

  const openAddEmployeeModal = () => {
    setEmployeeForm({ name: '', email: '', password: '', role: 'ENGINEER' });
    setEmployeeError('');
    setEmployeeSuccess(false);
    setIsAddEmployeeModalOpen(true);
  };

  const openNewCertificate = () => openAddJobModal();

  const getStatusStyles = (status: JobStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-orange-900/30 text-orange-400 border-orange-800/50';
      case 'IN_PROGRESS':
        return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
      case 'COMPLETED':
        return 'bg-green-900/30 text-green-400 border-green-800/50';
      case 'CANCELLED':
        return 'bg-red-900/30 text-red-400 border-red-800/50';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const contextValue = {
    jobs,
    setJobs,
    refreshJobs,
    saveJob: async (job: Job) => {
      try {
        const saved = await upsertJob(job);
        await refreshJobs();
        return saved;
      } catch {
        return null;
      }
    },
    searchQuery,
    setSearchQuery,
    uniqueCustomers,
    openAddJobModal,
    openEditJobModal,
    copySignUpLink,
    updateStatus,
    handleDeleteJob,
    selectedCustomerDetail,
    setSelectedCustomerDetail,
    openAddEmployeeModal,
    openAddSiteTypeModal,
  };

  const now = new Date();
  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const days = Array.from({ length: daysInMonth(currentMonth, currentYear) }, (_, i) => i + 1);
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const padding = Array.from({ length: firstDayOfMonth }, () => null);

  const viewInWarrantyList = (customerId: string) => {
    setSelectedCustomerDetail(null);
  };

  return (
    <AdminProvider value={contextValue}>
      <AdminLayout user={user} onLogout={onLogout} />
      {/* Modals - kept from AdminDashboard */}
        {selectedCustomerDetail && (
          <CustomerDrawer
            detail={selectedCustomerDetail}
            jobs={jobs}
            onClose={() => setSelectedCustomerDetail(null)}
            onEdit={handleOpenEditCustomer}
            onViewWarranties={viewInWarrantyList}
            setSelectedCustomerDetail={setSelectedCustomerDetail}
            setSearchQuery={setSearchQuery}
            getStatusStyles={getStatusStyles}
            setEditingWarrantyJob={setEditingWarrantyJob}
            setWarrantyStartDate={setWarrantyStartDate}
            setWarrantyEndDate={setWarrantyEndDate}
          />
        )}

        {isEditCustomerModalOpen && customerEditForm && (
          <EditCustomerModal
            form={customerEditForm}
            setForm={setCustomerEditForm}
            onSave={handleUpdateCustomer}
            onClose={() => setIsEditCustomerModalOpen(false)}
          />
        )}

        {isJobModalOpen && (
          <JobModal
            jobForm={jobForm}
            setJobForm={setJobForm}
            editingJobId={editingJobId}
            onSave={handleSaveJob}
            onClose={() => setIsJobModalOpen(false)}
          />
        )}

        {isAddSiteTypeModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[550] flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-md p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Add Site</h2>
                  <p className="text-sm text-gray-500 font-bold mt-0.5">
                    Choose what type of site you want to add.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddSiteTypeModalOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Site type
                </label>
                <select
                  value={selectedSiteType}
                  onChange={(e) =>
                    setSelectedSiteType(e.target.value as 'TR19' | 'INSTALLATION' | '')
                  }
                  className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none appearance-none"
                >
                  <option value="">Select site type...</option>
                  <option value="TR19">TR19 Site</option>
                  <option value="INSTALLATION">Installation Site</option>
                </select>
                <p className="text-[11px] text-gray-500">
                  TR19 Site is for TR19 surveys and certificates. Installation Site is for general
                  installation work and equipment tracking.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsAddSiteTypeModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold border border-[#333333] text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedSiteType) return;
                    setIsAddSiteTypeModalOpen(false);
                    if (selectedSiteType === 'TR19') {
                      navigate('/dashboard/tr19/add');
                    } else if (selectedSiteType === 'INSTALLATION') {
                      navigate('/dashboard/sites', { state: { openAdd: true } });
                    }
                  }}
                  disabled={!selectedSiteType}
                  className="flex-1 py-3 rounded-xl font-bold bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-60"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {isAddEmployeeModalOpen && (
          <EmployeeModal
            form={employeeForm}
            setForm={setEmployeeForm}
            error={employeeError}
            success={employeeSuccess}
            loading={employeeLoading}
            onSave={handleAddEmployee}
            onClose={() => setIsAddEmployeeModalOpen(false)}
          />
        )}

        {editingWarrantyJob && (
          <WarrantyModal
            job={editingWarrantyJob}
            warrantyStartDate={warrantyStartDate}
            warrantyEndDate={warrantyEndDate}
            setWarrantyStartDate={setWarrantyStartDate}
            setWarrantyEndDate={setWarrantyEndDate}
            jobs={jobs}
            setJobs={setJobs}
            onClose={() => setEditingWarrantyJob(null)}
          />
        )}
    </AdminProvider>
  );
};

function CustomerDrawer({
  detail,
  jobs,
  onClose,
  onEdit,
  onViewWarranties,
  setSelectedCustomerDetail,
  setSearchQuery,
  getStatusStyles,
  setEditingWarrantyJob,
  setWarrantyStartDate,
  setWarrantyEndDate,
}: any) {
  const customerWarranties = jobs.filter(
    (j: Job) => j.customerId === detail.id && new Date(j.warrantyEndDate) > new Date()
  );
  return (
    <div className="fixed inset-0 z-[500] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-black border-l border-[#333333] h-full shadow-2xl flex flex-col overflow-hidden">
        <header className="p-6 border-b border-[#333333] flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{detail.name}</h2>
            <p className="text-[10px] font-black text-[#F2C200] uppercase tracking-[0.2em]">{detail.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="w-10 h-10 rounded-full hover:bg-[#F2C200] hover:text-black flex items-center justify-center text-gray-500">
              <i className="fas fa-pencil-alt"></i>
            </button>
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-gray-500">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </header>
        <div className="flex-grow overflow-y-auto p-6 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Warranties</h3>
              <Link to="/dashboard/certificates" className="text-[9px] font-bold text-[#F2C200] uppercase hover:underline">
                View in List →
              </Link>
            </div>
            <div className="space-y-3">
              {customerWarranties.length === 0 ? (
                <div className="bg-[#111111] p-4 rounded-xl border border-dashed border-[#333333] flex items-center gap-3 text-gray-600">
                  <i className="fas fa-shield-slash opacity-50"></i>
                  <span className="text-xs font-bold italic">No active warranty contracts found.</span>
                </div>
              ) : (
                customerWarranties.map((w: Job) => (
                  <div key={w.id} className="bg-[#111111] p-4 rounded-xl border border-[#333333] hover:border-[#F2C200] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-black text-[#F2C200] tracking-widest uppercase">Contract {w.id}</span>
                        <h4 className="text-sm font-bold text-white">{w.title}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 text-[8px] font-black uppercase">Active</span>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-clock text-gray-600 text-[10px]"></i>
                        <div>
                          <span className="text-[8px] text-gray-500 font-black uppercase">Term Duration</span>
                          <span className="text-[10px] text-gray-400 font-bold block">
                            {new Date(w.startDate).toLocaleDateString()} - {new Date(w.warrantyEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditingWarrantyJob(w);
                          setWarrantyStartDate(w.startDate);
                          setWarrantyEndDate(w.warrantyEndDate);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#333333] text-white text-[9px] font-black uppercase hover:bg-[#F2C200] hover:text-black"
                      >
                        Adjust Term
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact Details</h3>
            <div className="space-y-4">
              <div className="bg-[#111111] p-4 rounded-xl border border-[#333333]">
                <div className="flex items-center gap-3 mb-1">
                  <i className="fas fa-envelope text-[#F2C200] text-xs"></i>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email</span>
                </div>
                <p className="text-sm font-bold text-white ml-6">{detail.email}</p>
              </div>
              <div className="bg-[#111111] p-4 rounded-xl border border-[#333333]">
                <div className="flex items-center gap-3 mb-1">
                  <i className="fas fa-phone text-[#F2C200] text-xs"></i>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Phone</span>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  <p className="text-sm font-bold text-white flex-1 min-w-0">{detail.phone}</p>
                  <PhoneCallButton phone={detail.phone} size="sm" />
                </div>
              </div>
              <div className="bg-[#111111] p-4 rounded-xl border border-[#333333]">
                <div className="flex items-center gap-3 mb-1">
                  <i className="fas fa-location-dot text-[#F2C200] text-xs"></i>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Address</span>
                </div>
                <p className="text-sm font-bold text-white ml-6 leading-relaxed">{detail.address}</p>
              </div>
            </div>
          </section>
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Service History</h3>
            <div className="space-y-3">
              {jobs.filter((j: Job) => j.customerId === detail.id).length === 0 ? (
                <div className="text-center py-8 bg-[#111111] rounded-xl border border-dashed border-[#333333] text-gray-500 text-xs">
                  No service records found.
                </div>
              ) : (
                jobs
                  .filter((j: Job) => j.customerId === detail.id)
                  .map((j: Job) => (
                    <Link
                      key={j.id}
                      to={`/jobs/${j.id}`}
                      className="block p-4 bg-[#111111] border border-[#333333] rounded-xl hover:border-[#F2C200] transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-[#F2C200] tracking-widest uppercase">{j.id}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusStyles(j.status)}`}>
                          {j.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white">{j.title}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Started: {new Date(j.startDate).toLocaleDateString()}</p>
                    </Link>
                  ))
              )}
            </div>
          </section>
        </div>
        <footer className="p-6 border-t border-[#333333] bg-black grid grid-cols-2 gap-3">
          <a
            href={phoneToTelHref(detail.phone) || '#'}
            onClick={(e) => {
              if (!phoneToTelHref(detail.phone)) e.preventDefault();
            }}
            className={`flex items-center justify-center gap-2 py-3 bg-[#111111] border border-[#333333] text-white rounded-xl text-xs font-bold hover:border-[#F2C200] ${!phoneToTelHref(detail.phone) ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <i className="fas fa-phone-alt"></i>
            <span>Call Now</span>
          </a>
          <a
            href={`mailto:${detail.email}`}
            className="flex items-center justify-center gap-2 py-3 bg-[#111111] border border-[#333333] text-white rounded-xl text-xs font-bold hover:border-[#F2C200]"
          >
            <i className="fas fa-envelope"></i>
            <span>Send Email</span>
          </a>
          <Link
            to="/dashboard/sites"
            onClick={() => {
              setSearchQuery(detail.id);
              setSelectedCustomerDetail(null);
            }}
            className="col-span-2 flex items-center justify-center gap-2 py-4 bg-[#F2C200] text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#F2C2001A] hover:brightness-110"
          >
            <i className="fas fa-magnifying-glass"></i>
            <span>View All Associated Jobs</span>
          </Link>
        </footer>
      </div>
    </div>
  );
}

function EditCustomerModal({ form, setForm, onSave, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[600] flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Amend Customer Profile</h2>
            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">ID: {form.id}</p>
          </div>
          <button onClick={onClose} className="text-black hover:opacity-70">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Full Name / Business</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Phone</label>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full min-w-0 flex-1 p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
              />
              <PhoneCallButton phone={form.phone} size="sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Address</label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
            />
          </div>
          <button onClick={onSave} className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#F2C2001A] hover:brightness-110">
            Confirm Update
          </button>
        </div>
      </div>
    </div>
  );
}

const FREQUENCY_OPTIONS = [
  'Every 3 months',
  'Every 6 months',
  'Every 12 months',
  'Every 18 months',
  'Every 24 months',
];

function JobModal({
  jobForm,
  setJobForm,
  editingJobId,
  onSave,
  onClose,
}: {
  jobForm: Partial<Job>;
  setJobForm: React.Dispatch<React.SetStateAction<Partial<Job>>>;
  editingJobId: string | null;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold">{editingJobId ? 'Edit Site' : 'Add Site'}</h2>
          <button onClick={onClose} className="text-black hover:opacity-70">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Site Name *</label>
            <input
              type="text"
              value={jobForm.customerName || ''}
              onChange={(e) => setJobForm({ ...jobForm, customerName: e.target.value })}
              placeholder="e.g. Mick's Café"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Address</label>
            <input
              type="text"
              value={jobForm.customerAddress || ''}
              onChange={(e) => setJobForm({ ...jobForm, customerAddress: e.target.value })}
              placeholder="e.g. 101 Ragland Road"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Postcode *</label>
            <input
              type="text"
              value={jobForm.customerPostcode || ''}
              onChange={(e) => setJobForm({ ...jobForm, customerPostcode: e.target.value })}
              placeholder="e.g. B66 3ND"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contact Name</label>
            <input
              type="text"
              value={jobForm.contactName || ''}
              onChange={(e) => setJobForm({ ...jobForm, contactName: e.target.value })}
              placeholder="e.g. Mick"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contact Email</label>
            <input
              type="email"
              value={jobForm.customerEmail || ''}
              onChange={(e) => setJobForm({ ...jobForm, customerEmail: e.target.value })}
              placeholder="e.g. mick@example.com"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contact Phone</label>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={jobForm.customerPhone || ''}
                onChange={(e) => setJobForm({ ...jobForm, customerPhone: e.target.value })}
                placeholder="e.g. 07123 456 789"
                className="w-full min-w-0 flex-1 p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
              />
              <PhoneCallButton phone={jobForm.customerPhone} size="sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Last Clean Date</label>
            <div className="relative">
              <input
                type="date"
                value={jobForm.startDate || ''}
                onChange={(e) => setJobForm({ ...jobForm, startDate: e.target.value })}
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none pr-10 [color-scheme:dark]"
                title="Click to open calendar picker"
              />
              <i className="fas fa-calendar-alt text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Click to pick a date from the calendar</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Next Due Date</label>
            <div className="relative">
              <input
                type="date"
                value={jobForm.warrantyEndDate || ''}
                onChange={(e) => setJobForm({ ...jobForm, warrantyEndDate: e.target.value })}
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none pr-10 [color-scheme:dark]"
                title="Click to open calendar picker"
              />
              <i className="fas fa-calendar-alt text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Click to pick a date from the calendar</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Scheduled Clean Date</label>
            <div className="relative">
              <input
                type="date"
                value={jobForm.scheduledCleanDate || ''}
                onChange={(e) => setJobForm({ ...jobForm, scheduledCleanDate: e.target.value })}
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none pr-10 [color-scheme:dark]"
                title="Date this clean is scheduled to take place"
              />
              <i className="fas fa-calendar-alt text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              This date is used for the Job Calendar schedule.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Frequency</label>
            <div className="relative">
              <select
                value={jobForm.frequency || 'Every 12 months'}
                onChange={(e) => setJobForm({ ...jobForm, frequency: e.target.value })}
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none appearance-none pr-10"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contract Value (£)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={jobForm.amount == null || jobForm.amount === 0 ? '' : jobForm.amount}
              onChange={(e) => {
                const v = e.target.value;
                setJobForm({ ...jobForm, amount: v === '' ? 0 : Math.max(0, parseFloat(v) || 0) });
              }}
              placeholder="e.g. 1200"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
            />
            <p className="text-[10px] text-gray-500 mt-1">Used for Revenue at Risk when certificate is overdue</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Notes</label>
            <textarea
              rows={3}
              value={jobForm.description || ''}
              onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
              placeholder="Additional notes..."
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
            />
          </div>
          <div className="pt-4 border-t border-[#333333]">
            <h4 className="text-xs font-bold text-[#F2C200] uppercase mb-3">Engineer Access</h4>
            <p className="text-[10px] text-gray-500 mb-3">Help engineers prepare by providing site access details.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Access Difficulty *</label>
            <select
              value={jobForm.accessDifficulty || ''}
              onChange={(e) => setJobForm({ ...jobForm, accessDifficulty: e.target.value as 'easy' | 'medium' | 'difficult' })}
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none appearance-none pr-10"
            >
              <option value="">Select...</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="difficult">Difficult</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Appliance Location *</label>
            <input
              type="text"
              value={jobForm.applianceLocation || ''}
              onChange={(e) => setJobForm({ ...jobForm, applianceLocation: e.target.value })}
              placeholder="e.g. Main kitchen, rear"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Access Instructions *</label>
            <textarea
              rows={2}
              value={jobForm.accessInstructions || ''}
              onChange={(e) => setJobForm({ ...jobForm, accessInstructions: e.target.value })}
              placeholder="How to access the site / appliance"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Equipment Required *</label>
            <input
              type="text"
              value={jobForm.equipmentRequired || ''}
              onChange={(e) => setJobForm({ ...jobForm, equipmentRequired: e.target.value })}
              placeholder="e.g. Ladder, scaffolding"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">PPE Required *</label>
            <input
              type="text"
              value={jobForm.ppeRequired || ''}
              onChange={(e) => setJobForm({ ...jobForm, ppeRequired: e.target.value })}
              placeholder="e.g. Gloves, safety glasses"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
            />
          </div>
          <div className="flex gap-4 pt-4 border-t border-[#333333]">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-xl font-bold border border-[#333333] text-gray-400 hover:bg-white/5 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-black uppercase tracking-widest bg-[#F2C200] text-black shadow-xl shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all"
            >
              <i className="fas fa-check"></i>
              {editingJobId ? 'Update Site' : 'Create Site'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeModal({ form, setForm, error, success, loading, onSave, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[250] flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
          <h2 className="text-xl font-bold">Add Employee (Admin)</h2>
          <button onClick={onClose} className="text-black hover:opacity-70">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="p-8 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-green-900/30 border border-green-800/50 text-green-400 text-sm font-medium">
              Employee account created. They can sign in with admin view as {typeof success === 'object' && success.role ? success.role.toLowerCase() : 'admin'}.
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Jane Smith"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="employee@bengalwelding.co.uk"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Password (min 6 chars)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Set temporary password"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Role</label>
            <select
              value={form.role ?? 'ENGINEER'}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'ENGINEER' | 'ADMIN' })}
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
            >
              <option value="ENGINEER">Engineer</option>
              <option value="ADMIN">Admin</option>
            </select>
            <p className="text-[10px] text-gray-500 mt-1">Both have admin view access; title shows in top right.</p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#F2C2001A] hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Creating...
              </>
            ) : (
              'Create Employee Account'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function WarrantyModal({
  job,
  warrantyStartDate,
  warrantyEndDate,
  setWarrantyStartDate,
  setWarrantyEndDate,
  jobs,
  setJobs,
  onClose,
}: any) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Amend Warranty Term</h2>
            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">{job.id}</p>
          </div>
          <button onClick={onClose} className="text-black">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Warranty Start</label>
            <input
              type="date"
              value={warrantyStartDate}
              onChange={(e) => setWarrantyStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-[#333333] text-white rounded-xl outline-none focus:ring-1 focus:ring-[#F2C200]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Warranty Expiry</label>
            <input
              type="date"
              value={warrantyEndDate}
              onChange={(e) => setWarrantyEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-[#333333] text-white rounded-xl outline-none focus:ring-1 focus:ring-[#F2C200]"
            />
          </div>
          <div className="bg-black/40 p-4 rounded-xl border border-[#333333]">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Contract Summary</p>
            <p className="text-sm text-white font-bold">{job.title}</p>
            <p className="text-xs text-gray-400 mt-1">Customer: {job.customerName}</p>
          </div>
          <button
            onClick={() => {
              const merged = { ...job, startDate: warrantyStartDate, warrantyEndDate };
              setJobs((prev) => prev.map((j) => (j.id === job.id ? merged : j)));
              updateJob(job.id, { start_date: warrantyStartDate, warranty_end_date: warrantyEndDate }).catch(() => {
                // ignore; next refresh reconciles
              });
              onClose();
              alert('Warranty term updated successfully.');
            }}
            className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:brightness-110"
          >
            Update Warranty Contract
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminWrapper;
