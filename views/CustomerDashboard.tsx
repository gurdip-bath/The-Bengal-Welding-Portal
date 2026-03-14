
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { User, Job } from '../types';
import { MOCK_JOBS } from '../mockData';
import WarrantyCard from '../components/WarrantyCard';
import { COLORS } from '../constants';
import { createServiceRequest, createServiceRequestCheckout } from '../lib/api';
import { listServiceRequestsForCustomer, type ServiceRequestRow } from '../lib/serviceRequests';
import { listJobsForCustomer } from '../lib/jobs';
import { createComplaint, listComplaintsForCustomer } from '../lib/complaints';
import { getCustomerAccessDetails, upsertCustomerAccessDetails } from '../lib/customerAccessDetails';

interface CustomerDashboardProps {
  user: User;
}

type TabType = 'ACTIVE' | 'HISTORY' | 'PROFILE';

const SERVICE_REQUEST_BANNER_DISMISSED_KEY = 'bengal_sr_banner_dismissed';

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user: initialUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [supabaseJobs, setSupabaseJobs] = useState<Job[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestRow[]>([]);
  const [user, setUser] = useState<User>(initialUser);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<User>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [serviceRequest, setServiceRequest] = useState({
    fullName: '',
    siteName: '',
    businessAddress: '',
    postcode: '',
    contactName: '',
    contactEmail: '',
    notes: '',
    accessDifficulty: '' as '' | 'easy' | 'medium' | 'difficult',
    applianceLocation: '',
    accessInstructions: '',
    equipmentRequired: '',
    ppeRequired: '',
  });
  const [serviceRequestDate, setServiceRequestDate] = useState('');
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [serviceSuccessMessage, setServiceSuccessMessage] = useState<string | null>(null);
  const [serviceErrorMessage, setServiceErrorMessage] = useState<string | null>(null);
  const [serviceRequestsExpanded, setServiceRequestsExpanded] = useState(true);
  const [notificationBannerDismissed, setNotificationBannerDismissed] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem(SERVICE_REQUEST_BANNER_DISMISSED_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showPaymentSuccessBanner, setShowPaymentSuccessBanner] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaints, setComplaints] = useState<Awaited<ReturnType<typeof listComplaintsForCustomer>>>([]);
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintError, setComplaintError] = useState<string | null>(null);
  const [complaintSuccess, setComplaintSuccess] = useState(false);
  const [accessDetails, setAccessDetails] = useState<{
    accessDifficulty: '' | 'easy' | 'medium' | 'difficult';
    applianceLocation: string;
    accessInstructions: string;
    equipmentRequired: string;
    ppeRequired: string;
  }>({
    accessDifficulty: '',
    applianceLocation: '',
    accessInstructions: '',
    equipmentRequired: '',
    ppeRequired: '',
  });
  const [accessDetailsSaved, setAccessDetailsSaved] = useState(false);
  const [isEditingAccessDetails, setIsEditingAccessDetails] = useState(false);
  const requestFormRef = React.useRef<HTMLDivElement>(null);

  const [complaintForm, setComplaintForm] = useState({
    customerName: '',
    siteName: '',
    siteAddress: '',
    contactEmail: '',
    contactPhone: '',
    subject: '',
    complaintType: '',
    description: '',
    dateOfIncident: '',
    preferredContact: '',
  });

  const dismissBanner = (id: string) => {
    setNotificationBannerDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      sessionStorage.setItem(SERVICE_REQUEST_BANNER_DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const startAmend = (req: ServiceRequestRow) => {
    setServiceRequest({
      fullName: req.full_name,
      siteName: req.business_name || '',
      businessAddress: req.business_address || '',
      postcode: req.postcode || '',
      contactName: req.contact_name || '',
      contactEmail: req.contact_email,
      notes: req.notes || '',
      accessDifficulty: (req.access_difficulty as 'easy' | 'medium' | 'difficult') || '',
      applianceLocation: req.appliance_location || '',
      accessInstructions: req.access_instructions || '',
      equipmentRequired: req.equipment_required || '',
      ppeRequired: req.ppe_required || '',
    });
    setServiceRequestDate(req.requested_date);
    requestFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetServiceRequestForm = () => {
    setServiceRequest({
      fullName: '',
      siteName: '',
      businessAddress: '',
      postcode: '',
      contactName: '',
      contactEmail: '',
      notes: '',
      accessDifficulty: '',
      applianceLocation: '',
      accessInstructions: '',
      equipmentRequired: '',
      ppeRequired: '',
    });
    setServiceRequestDate('');
  };

  useEffect(() => {
    const savedJobs = localStorage.getItem('bengal_jobs');
    if (savedJobs) {
      setAllJobs(JSON.parse(savedJobs));
    } else {
      setAllJobs(MOCK_JOBS);
    }

    const savedUser = localStorage.getItem('bengal_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [jobs, reqs, comps, access] = await Promise.all([
          listJobsForCustomer(user.id),
          listServiceRequestsForCustomer(user.id),
          listComplaintsForCustomer(user.id).catch(() => []),
          getCustomerAccessDetails(user.id).catch(() => null),
        ]);
        setSupabaseJobs(jobs);
        setServiceRequests(reqs);
        setComplaints(comps);
        if (access) {
          setAccessDetails({
            accessDifficulty: (access.access_difficulty as '' | 'easy' | 'medium' | 'difficult') || '',
            applianceLocation: access.appliance_location || '',
            accessInstructions: access.access_instructions || '',
            equipmentRequired: access.equipment_required || '',
            ppeRequired: access.ppe_required || '',
          });
        }
      } catch {
        // ignore - Supabase may not be configured
      }
    };
    load();
  }, [user.id]);


  useEffect(() => {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    const query = qIndex >= 0 ? hash.slice(qIndex) : '';
    const params = new URLSearchParams(query);
    if (params.get('payment_success') === '1') {
      setShowPaymentSuccessBanner(true);
      window.history.replaceState(null, '', `${window.location.pathname}#/dashboard`);
      setTimeout(() => setShowPaymentSuccessBanner(false), 5000);
    }
  }, []);

  const localMyJobs = allJobs.filter((j) => j.customerId === user.id);
  const seenIds = new Set<string>();
  const myJobs = [...supabaseJobs, ...localMyJobs].filter((j) =>
    seenIds.has(j.id) ? false : (seenIds.add(j.id), true)
  );
  const historyItems = myJobs
    .map((j) => ({
      id: j.id,
      title: j.title,
      type: 'Job',
      status: j.status,
      date: j.startDate,
      amount: j.amount,
      isJob: true,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'NEW':
      case 'QUOTED':
      case 'PENDING_PAYMENT':
      case 'PENDING':
      case 'IN_PROGRESS':
        return 'bg-[#FFF9E6] text-[#B28900]';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatQuoteStatus = (status: string) => {
    switch (status) {
      case 'QUOTED':
        return 'Sent to Customer';
      case 'PENDING_PAYMENT':
        return 'Payment in Progress';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const handleUpdateProfile = () => {
    const updatedUser = { ...user, ...profileForm };
    setUser(updatedUser);
    localStorage.setItem('bengal_user', JSON.stringify(updatedUser));
    setIsEditingProfile(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const openEditProfile = () => {
    setProfileForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || ''
    });
    setIsEditingProfile(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {showSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-500 text-black px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 animate-bounce z-[100]">
          <i className="fas fa-check-circle"></i>
          <span className="text-sm font-bold uppercase tracking-tight">Profile Updated Successfully!</span>
        </div>
      )}
      {showPaymentSuccessBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-500 text-black px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 z-[100] animate-in fade-in duration-300">
          <i className="fas fa-check-circle"></i>
          <span className="text-sm font-bold uppercase tracking-tight">Payment successful. Your service has been confirmed.</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F2C200]">Welcome, {user.name}</h1>
          <p className="text-white opacity-80">Account ID: <span className="font-black tracking-tight">{user.id}</span> • Manage your service and maintenance.</p>
        </div>
        
        <div className="flex bg-[#111111] border border-[#333333] p-1 rounded-xl w-fit overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'ACTIVE' 
                ? 'bg-[#F2C200] text-black shadow-sm' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            Active
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'HISTORY' 
                ? 'bg-[#F2C200] text-black shadow-sm' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            Order History
          </button>
          <button 
            onClick={() => setActiveTab('PROFILE')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'PROFILE' 
                ? 'bg-[#F2C200] text-black shadow-sm' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <i className="fas fa-user-gear mr-2"></i>My Account
          </button>
        </div>
      </header>

      {activeTab === 'ACTIVE' && (
        <>
          {serviceRequests
            .filter((r) => (r.status === 'approved' || r.status === 'rejected') && !notificationBannerDismissed.has(r.id))
            .slice(0, 3)
            .map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
                  r.status === 'approved'
                    ? 'bg-green-900/20 border-green-800/50'
                    : 'bg-amber-900/20 border-amber-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <i className={`fas ${r.status === 'approved' ? 'fa-check-circle text-green-400' : 'fa-exclamation-circle text-amber-400'}`} />
                  <div>
                    <p className="font-bold text-white">
                      {r.status === 'approved'
                        ? 'Your service request has been approved'
                        : 'Your service request was rejected'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {r.status === 'approved'
                        ? 'Your scheduled job will appear below.'
                        : 'Please view your request and amend as per the notes.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'rejected' && (
                    <button
                      onClick={() => startAmend(r)}
                      className="px-4 py-2 rounded-lg bg-[#F2C200] text-black font-bold text-sm hover:brightness-110"
                    >
                      Amend Request
                    </button>
                  )}
                  <button
                    onClick={() => dismissBanner(r.id)}
                    className="p-2 text-gray-400 hover:text-white"
                    aria-label="Dismiss"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
            ))}

          {serviceRequests.length > 0 && (
            <section className="bg-[#111111] rounded-xl border border-[#333333] overflow-hidden">
              <button
                type="button"
                onClick={() => setServiceRequestsExpanded((v) => !v)}
                className="flex items-center justify-between w-full text-left p-4 group hover:bg-white/[0.03] transition-colors"
              >
                <h2 className="text-lg font-bold text-[#F2C200]">My Service Requests</h2>
                <span className="flex items-center gap-2 text-gray-400 group-hover:text-[#F2C200] transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                    {serviceRequestsExpanded ? 'Collapse' : 'Expand'}
                  </span>
                  <i className={`fas fa-chevron-${serviceRequestsExpanded ? 'up' : 'down'} text-sm`} />
                </span>
              </button>
              {serviceRequestsExpanded && (
                <div className="grid grid-cols-1 gap-3 px-4 pb-4 pt-4 border-t border-[#333333]/50">
                  {serviceRequests.map((r) => (
                    <div
                      key={r.id}
                      className="bg-[#111111] p-4 rounded-xl border border-[#333333]"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-bold text-white">{r.business_name || r.full_name}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'pending'
                            ? 'bg-[#FFF9E6]/20 text-[#B28900]'
                            : r.status === 'approved'
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">Requested: {r.requested_date}</p>
                    {r.admin_notes && (
                      <p className="text-xs text-gray-400 mt-2 italic">Admin notes: {r.admin_notes}</p>
                    )}
                    {r.status === 'approved' && !r.paid_at && (() => {
                      const pt = r.payment_type ?? 'one_off';
                      const oneOff = (r.approved_amount_pence ?? 0) / 100;
                      const dd = (r.dd_amount_pence ?? 0) / 100;
                      const label = pt === 'dd_only'
                        ? `Set up Direct Debit £${dd.toFixed(2)}/mo`
                        : pt === 'both'
                        ? `Pay £${oneOff.toFixed(2)} & set up DD £${dd.toFixed(2)}/mo`
                        : `Pay £${oneOff.toFixed(2)}`;
                      return (
                        <button
                          onClick={async () => {
                            setCheckoutLoading(r.id);
                            try {
                              const { url } = await createServiceRequestCheckout(r.id);
                              window.location.href = url;
                            } catch (e) {
                              setServiceErrorMessage(e instanceof Error ? e.message : 'Failed to start payment.');
                              setCheckoutLoading(null);
                            }
                          }}
                          disabled={!!checkoutLoading}
                          className="mt-3 px-4 py-2 rounded-lg bg-[#F2C200] text-black font-bold text-sm hover:brightness-110 disabled:opacity-60"
                        >
                          {checkoutLoading === r.id ? 'Redirecting…' : label}
                        </button>
                      );
                    })()}
                    {r.status === 'rejected' && (
                      <button
                        onClick={() => startAmend(r)}
                        className="mt-3 px-4 py-2 rounded-lg bg-[#F2C200] text-black font-bold text-sm hover:brightness-110"
                      >
                        Amend & Resubmit
                      </button>
                    )}
                  </div>
                ))}
                </div>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111111] p-5 rounded-xl border border-[#333333] shadow-sm">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#1A1A1A', border: '1px solid #F2C20033' }}>
                <i className="fas fa-hammer" style={{ color: COLORS.primary }}></i>
              </div>
              <p className="text-gray-400 text-sm font-medium">Active Maintenance</p>
              <p className="text-2xl font-bold text-white">{myJobs.filter(j => j.status !== 'COMPLETED').length}</p>
            </div>
            
            {myJobs.length > 0 && <WarrantyCard endDate={myJobs[0].warrantyEndDate} />}

            <div className="bg-[#111111] p-5 rounded-xl border border-[#333333] shadow-sm">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#1A1A1A' }}>
                <i className="fas fa-file-invoice-dollar text-[#F2C200]"></i>
              </div>
              <p className="text-gray-400 text-sm font-medium">Pending Payments</p>
              <p className="text-2xl font-bold text-white">
                £{myJobs.filter((j) => j.paymentStatus !== 'PAID').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#F2C200]">My Products</h2>
              <Link to="/products" className="text-sm font-semibold hover:text-white transition-colors" style={{ color: COLORS.primary }}>
                View Equipment Catalog
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {myJobs.length === 0 ? (
                <div className="p-8 bg-[#111111] rounded-xl border border-dashed border-[#333333] text-center text-gray-500">
                  No products found for your account. Browse the Equipment Catalog to get started.
                </div>
              ) : (
                <>
                  {myJobs.map(job => (
                    <Link 
                      key={job.id} 
                      to={`/jobs/${job.id}`}
                      className="group bg-[#111111] p-5 rounded-xl border border-[#333333] shadow-sm hover:border-[#F2C200] transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          job.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-[#FFF9E6] text-[#B28900]'
                        }`}>
                          <i className={`fas ${job.status === 'COMPLETED' ? 'fa-check' : 'fa-spinner fa-spin'}`}></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white group-hover:text-[#F2C200] transition-colors">{job.title}</h3>
                            {job.isGasAppliance && job.garCode && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#333333] text-[#F2C200]">GAR: {job.garCode}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-1">{job.description}</p>
                          {(job.startDate || job.warrantyEndDate) && (
                            <p className="text-xs text-gray-500 mt-1">
                              Warranty: {job.startDate ? new Date(job.startDate).toLocaleDateString() : '—'} – {job.warrantyEndDate ? new Date(job.warrantyEndDate).toLocaleDateString() : '—'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          job.paymentStatus === 'PAID' ? 'bg-white/10 text-gray-300' : 'bg-red-900/20 text-red-400'
                        }`}>
                          {job.paymentStatus}
                        </span>
                        <p className="text-xs text-gray-500 mt-2">Placed {new Date(job.startDate).toLocaleDateString()}</p>
                      </div>
                      <i className="fas fa-chevron-right text-gray-600 group-hover:translate-x-1 transition-transform"></i>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </section>

          {/* Complaints Section */}
          <section className="bg-[#111111] rounded-xl border border-[#333333] overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#F2C200] mb-2">Complaints</h3>
              <p className="text-gray-400 text-sm mb-4">Do you want to raise a complaint? Our team will respond as soon as possible.</p>
              {!showComplaintForm ? (
                <button
                  onClick={() => {
                    setShowComplaintForm(true);
                    setComplaintForm({
                      customerName: user.name,
                      siteName: '',
                      siteAddress: user.address || '',
                      contactEmail: user.email,
                      contactPhone: user.phone || '',
                      subject: '',
                      complaintType: '',
                      description: '',
                      dateOfIncident: '',
                      preferredContact: '',
                    });
                  }}
                  className="px-6 py-3 rounded-xl font-bold bg-[#F2C200] text-black hover:brightness-110 transition-all"
                >
                  Raise a Complaint
                </button>
              ) : (
                <form
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setComplaintError(null);
                    setComplaintSuccess(false);
                    if (!complaintForm.customerName || !complaintForm.contactEmail || !complaintForm.description) {
                      setComplaintError('Please fill in customer name, contact email, and description.');
                      return;
                    }
                    try {
                      setComplaintSubmitting(true);
                      await createComplaint({
                        customerName: complaintForm.customerName,
                        siteName: complaintForm.siteName || undefined,
                        siteAddress: complaintForm.siteAddress || undefined,
                        contactEmail: complaintForm.contactEmail,
                        contactPhone: complaintForm.contactPhone || undefined,
                        subject: complaintForm.subject || undefined,
                        complaintType: complaintForm.complaintType || undefined,
                        description: complaintForm.description,
                        dateOfIncident: complaintForm.dateOfIncident || undefined,
                        preferredContact: complaintForm.preferredContact || undefined,
                      });
                      setComplaintSuccess(true);
                      setComplaintForm({ customerName: '', siteName: '', siteAddress: '', contactEmail: '', contactPhone: '', subject: '', complaintType: '', description: '', dateOfIncident: '', preferredContact: '' });
                      setShowComplaintForm(false);
                      const comps = await listComplaintsForCustomer(user.id);
                      setComplaints(comps);
                    } catch (err) {
                      setComplaintError(err instanceof Error ? err.message : 'Failed to submit complaint.');
                    } finally {
                      setComplaintSubmitting(false);
                    }
                  }}
                >
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Customer Name *</label>
                    <input type="text" value={complaintForm.customerName} onChange={(e) => setComplaintForm({ ...complaintForm, customerName: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" required />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Site Name</label>
                    <input type="text" value={complaintForm.siteName} onChange={(e) => setComplaintForm({ ...complaintForm, siteName: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" />
                  </div>
                  <div className="flex flex-col md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Site Address</label>
                    <input type="text" value={complaintForm.siteAddress} onChange={(e) => setComplaintForm({ ...complaintForm, siteAddress: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Contact Email *</label>
                    <input type="email" value={complaintForm.contactEmail} onChange={(e) => setComplaintForm({ ...complaintForm, contactEmail: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" required />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Contact Phone</label>
                    <input type="tel" value={complaintForm.contactPhone} onChange={(e) => setComplaintForm({ ...complaintForm, contactPhone: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Subject</label>
                    <input type="text" value={complaintForm.subject} onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Complaint Type</label>
                    <select value={complaintForm.complaintType} onChange={(e) => setComplaintForm({ ...complaintForm, complaintType: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]">
                      <option value="">Select...</option>
                      <option value="service">Service</option>
                      <option value="quality">Quality</option>
                      <option value="delivery">Delivery</option>
                      <option value="billing">Billing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Description *</label>
                    <textarea rows={4} value={complaintForm.description} onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200] resize-none" required placeholder="Describe your complaint in detail..." />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Date of Incident</label>
                    <DatePicker selected={complaintForm.dateOfIncident ? new Date(complaintForm.dateOfIncident) : null} onChange={(d) => setComplaintForm({ ...complaintForm, dateOfIncident: d ? d.toISOString().split('T')[0] : '' })} dateFormat="dd/MM/yyyy" placeholderText="Select date" className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" calendarClassName="react-datepicker-dark" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Preferred Contact Method</label>
                    <select value={complaintForm.preferredContact} onChange={(e) => setComplaintForm({ ...complaintForm, preferredContact: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]">
                      <option value="">Select...</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="either">Either</option>
                    </select>
                  </div>
                  {complaintError && <p className="text-xs text-red-400 md:col-span-2">{complaintError}</p>}
                  {complaintSuccess && <p className="text-xs text-green-400 md:col-span-2">Complaint submitted successfully. We will be in touch shortly.</p>}
                  <div className="md:col-span-2 flex gap-3">
                    <button type="submit" disabled={complaintSubmitting} className="px-6 py-3 rounded-xl font-bold bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-60">{complaintSubmitting ? 'Submitting...' : 'Submit Complaint'}</button>
                    <button type="button" onClick={() => setShowComplaintForm(false)} className="px-6 py-3 rounded-xl font-bold bg-[#333333] text-white hover:bg-[#444]">Cancel</button>
                  </div>
                </form>
              )}
              {complaints.length > 0 && !showComplaintForm && (
                <div className="mt-6 pt-6 border-t border-[#333333]">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Your Complaints</h4>
                  <div className="space-y-2">
                    {complaints.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-[#333333]">
                        <span className="text-sm text-white truncate">{c.subject || c.description?.slice(0, 50) || 'Complaint'}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'resolved' || c.status === 'closed' ? 'bg-green-900/30 text-green-400' : 'bg-[#FFF9E6]/20 text-[#B28900]'}`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section ref={requestFormRef} className="bg-[#111111] border border-[#333333] p-6 rounded-2xl text-white">
            <h3 className="text-xl font-bold text-[#F2C200] mb-4">Request a Service</h3>
            <p className="text-gray-400 text-sm mb-6">
              Fill in the details below and submit. Our team will review, approve with a quote, and you can then pay via Direct Debit to confirm.
            </p>
            {serviceErrorMessage && (
              <div className="mb-4 bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl text-sm">
                {serviceErrorMessage}
              </div>
            )}
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setServiceErrorMessage(null);
                setServiceSuccessMessage(null);
                if (!serviceRequest.fullName || !serviceRequest.contactEmail || !serviceRequestDate) {
                  setServiceErrorMessage('Please fill in your name, contact email and preferred service date.');
                  return;
                }
                if (!serviceRequest.accessDifficulty || !serviceRequest.applianceLocation || !serviceRequest.accessInstructions || !serviceRequest.equipmentRequired || !serviceRequest.ppeRequired) {
                  setServiceErrorMessage('Please complete all Engineer Access Details fields.');
                  return;
                }
                try {
                  setServiceSubmitting(true);
                  await createServiceRequest({
                    fullName: serviceRequest.fullName,
                    siteName: serviceRequest.siteName,
                    businessAddress: serviceRequest.businessAddress,
                    postcode: serviceRequest.postcode,
                    contactName: serviceRequest.contactName,
                    contactEmail: serviceRequest.contactEmail,
                    notes: serviceRequest.notes,
                    requestedDate: serviceRequestDate,
                    accessDifficulty: serviceRequest.accessDifficulty,
                    applianceLocation: serviceRequest.applianceLocation,
                    accessInstructions: serviceRequest.accessInstructions,
                    equipmentRequired: serviceRequest.equipmentRequired,
                    ppeRequired: serviceRequest.ppeRequired,
                  });
                  resetServiceRequestForm();
                  setServiceSuccessMessage('Your service request has been submitted. We will be in touch shortly.');
                } catch (err: any) {
                  setServiceErrorMessage(err?.message || 'Something went wrong submitting your request.');
                } finally {
                  setServiceSubmitting(false);
                }
              }}
            >
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={serviceRequest.fullName}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, fullName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Site Name</label>
                <input
                  type="text"
                  value={serviceRequest.siteName}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, siteName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  placeholder="Enter site name"
                />
              </div>
              <div className="flex flex-col md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Business Address</label>
                <input
                  type="text"
                  value={serviceRequest.businessAddress}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, businessAddress: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  placeholder="Enter the service address"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Postcode</label>
                <input
                  type="text"
                  value={serviceRequest.postcode}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, postcode: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  placeholder="Enter postcode"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Contact Name</label>
                <input
                  type="text"
                  value={serviceRequest.contactName}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, contactName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  placeholder="Site contact name"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Contact Email</label>
                <input
                  type="email"
                  value={serviceRequest.contactEmail}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, contactEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  placeholder="Site contact email"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Preferred Service Date</label>
                <DatePicker
                  selected={serviceRequestDate ? new Date(serviceRequestDate) : null}
                  onChange={(date) => setServiceRequestDate(date ? date.toISOString().split('T')[0] : '')}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select date, month and year"
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  calendarClassName="react-datepicker-dark"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  minDate={new Date()}
                  required
                />
              </div>
              <div className="flex flex-col md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Notes</label>
                <textarea
                  rows={4}
                  value={serviceRequest.notes}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200] resize-none"
                  placeholder="Add details of your appliance here and any notes I.E extraction hood, cooker etc."
                />
              </div>
              <div className="md:col-span-2 pt-2">
                <h4 className="text-sm font-bold text-[#F2C200] mb-2">Engineer Access Details</h4>
                <p className="text-xs text-gray-500 mb-4">Help our engineers prepare by providing site access details.</p>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Access Difficulty *</label>
                <select
                  value={serviceRequest.accessDifficulty}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, accessDifficulty: e.target.value as 'easy' | 'medium' | 'difficult' })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                >
                  <option value="">Select...</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="difficult">Difficult</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Appliance Location *</label>
                <input
                  type="text"
                  value={serviceRequest.applianceLocation}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, applianceLocation: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  placeholder="e.g. Main kitchen, rear"
                />
              </div>
              <div className="flex flex-col md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Access Instructions *</label>
                <textarea
                  rows={2}
                  value={serviceRequest.accessInstructions}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, accessInstructions: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200] resize-none"
                  placeholder="How to access the site / appliance"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">Equipment Required *</label>
                <input
                  type="text"
                  value={serviceRequest.equipmentRequired}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, equipmentRequired: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  placeholder="e.g. Ladder, scaffolding"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase mb-1">PPE Required *</label>
                <input
                  type="text"
                  value={serviceRequest.ppeRequired}
                  onChange={(e) => setServiceRequest({ ...serviceRequest, ppeRequired: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                  placeholder="e.g. Gloves, safety glasses"
                />
              </div>
              <div className="md:col-span-2 flex flex-col items-end gap-2 pt-2">
                {serviceErrorMessage && (
                  <p className="text-xs text-red-400 self-start">{serviceErrorMessage}</p>
                )}
                {serviceSuccessMessage && (
                  <p className="text-xs text-green-400 self-start">{serviceSuccessMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={serviceSubmitting}
                  className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest bg-[#F2C200] text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F2C2001A] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {serviceSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}

      {activeTab === 'HISTORY' && (
        <section className="animate-in slide-in-from-right-4">
          <div className="bg-[#111111] rounded-2xl border border-[#333333] shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1A1A1A] border-b border-[#333333]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Item / Service</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {historyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{item.title}</span>
                          <span className="text-[10px] text-gray-500">ID: {item.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded-md bg-[#333333] text-gray-300 text-[10px] font-bold uppercase">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(item.status)}`}>
                          {formatQuoteStatus(item.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-[#F2C200]">
                          {item.amount > 0 ? `£${item.amount.toLocaleString()}` : '--'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'PROFILE' && (
        <section className="animate-in slide-in-from-bottom-4 space-y-8">
          <div className="bg-[#111111] rounded-3xl border border-[#333333] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-[#333333] flex justify-between items-center bg-black/40">
              <div>
                <h2 className="text-xl font-bold text-[#F2C200]">My Account</h2>
                <p className="text-gray-500 text-sm">Business details and access information.</p>
              </div>
              {!isEditingProfile && (
                <button 
                  onClick={openEditProfile}
                  className="bg-[#F2C200] text-black px-6 py-2 rounded-xl font-bold text-sm hover:brightness-110 transition-all"
                >
                  <i className="fas fa-pen-to-square mr-2"></i>Edit Details
                </button>
              )}
            </div>
            
            <div className="p-8 space-y-8">
              <div>
                <h3 className="text-sm font-bold text-[#F2C200] uppercase tracking-wider mb-4">Business Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Restaurant / Business Name</label>
                    <p className="text-lg font-bold text-white">{user.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Business Number</label>
                    <p className="text-lg font-bold text-white">{user.phone || 'Not provided'}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address</label>
                    <p className="text-lg font-bold text-white">{user.email}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Service Address</label>
                    <p className="text-lg font-bold text-white leading-relaxed">{user.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#F2C200] uppercase tracking-wider mb-4">Access Details (optional)</h3>
                <p className="text-gray-500 text-xs mb-4">Provide site access details for engineers. Can be used as defaults for service requests.</p>
                {!isEditingAccessDetails ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Access Difficulty</label>
                        <p className="text-white font-medium">{accessDetails.accessDifficulty || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Appliance Location</label>
                        <p className="text-white font-medium">{accessDetails.applianceLocation || '—'}</p>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Access Instructions</label>
                        <p className="text-white font-medium leading-relaxed">{accessDetails.accessInstructions || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Equipment Required</label>
                        <p className="text-white font-medium">{accessDetails.equipmentRequired || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">PPE Required</label>
                        <p className="text-white font-medium">{accessDetails.ppeRequired || '—'}</p>
                      </div>
                    </div>
                    {accessDetailsSaved && <p className="text-xs text-green-400 mt-2">Access details saved.</p>}
                    <button
                      onClick={() => setIsEditingAccessDetails(true)}
                      className="mt-4 px-4 py-2 rounded-lg font-bold text-sm bg-[#333333] text-white hover:bg-[#444] transition-all"
                    >
                      Edit Access Details
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Access Difficulty</label>
                      <select value={accessDetails.accessDifficulty} onChange={(e) => setAccessDetails({ ...accessDetails, accessDifficulty: e.target.value as '' | 'easy' | 'medium' | 'difficult' })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]">
                        <option value="">Select...</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="difficult">Difficult</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Appliance Location</label>
                      <input type="text" value={accessDetails.applianceLocation} onChange={(e) => setAccessDetails({ ...accessDetails, applianceLocation: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" placeholder="e.g. Main kitchen" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Access Instructions</label>
                      <textarea rows={2} value={accessDetails.accessInstructions} onChange={(e) => setAccessDetails({ ...accessDetails, accessInstructions: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200] resize-none" placeholder="How to access the site / appliance" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Equipment Required</label>
                      <input type="text" value={accessDetails.equipmentRequired} onChange={(e) => setAccessDetails({ ...accessDetails, equipmentRequired: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" placeholder="e.g. Ladder, scaffolding" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">PPE Required</label>
                      <input type="text" value={accessDetails.ppeRequired} onChange={(e) => setAccessDetails({ ...accessDetails, ppeRequired: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]" placeholder="e.g. Gloves, safety glasses" />
                    </div>
                    <div className="md:col-span-2 flex gap-3">
                      <button
                        onClick={async () => {
                          try {
                            await upsertCustomerAccessDetails(user.id, {
                              accessDifficulty: accessDetails.accessDifficulty || null,
                              applianceLocation: accessDetails.applianceLocation || null,
                              accessInstructions: accessDetails.accessInstructions || null,
                              equipmentRequired: accessDetails.equipmentRequired || null,
                              ppeRequired: accessDetails.ppeRequired || null,
                            });
                            setAccessDetailsSaved(true);
                            setIsEditingAccessDetails(false);
                            setTimeout(() => setAccessDetailsSaved(false), 3000);
                          } catch {
                            // ignore
                          }
                        }}
                        className="px-4 py-2 rounded-lg font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-all"
                      >
                        Save Access Details
                      </button>
                      <button onClick={() => setIsEditingAccessDetails(false)} className="px-4 py-2 rounded-lg font-bold text-sm bg-[#333333] text-white hover:bg-[#444]">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">Amend Contact Details</h2>
              <button onClick={() => setIsEditingProfile(false)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Restaurant / Business Name</label>
                <input 
                  type="text" 
                  value={profileForm.name || ''} 
                  onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} 
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={profileForm.email || ''} 
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} 
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Business Number</label>
                <input 
                  type="tel" 
                  value={profileForm.phone || ''} 
                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} 
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Service Address</label>
                <textarea 
                  rows={3} 
                  value={profileForm.address || ''} 
                  onChange={(e) => setProfileForm({...profileForm, address: e.target.value})} 
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none" 
                />
              </div>
              <div className="pt-6 border-t border-[#333333]">
                <button 
                  onClick={handleUpdateProfile} 
                  className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all"
                >
                  Save Account Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
