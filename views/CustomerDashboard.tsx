
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { User, Job, QuoteRequest } from '../types';
import { MOCK_JOBS } from '../mockData';
import WarrantyCard from '../components/WarrantyCard';
import { COLORS } from '../constants';
import { createServiceRequest, hasServiceRequestPayment, createServiceRequestCheckout } from '../lib/api';
import { listServiceRequestsForCustomer, type ServiceRequestRow } from '../lib/serviceRequests';
import { listJobsForCustomer } from '../lib/jobs';

interface CustomerDashboardProps {
  user: User;
  quotes?: QuoteRequest[];
  onPayQuote?: (id: string) => void;
}

type TabType = 'ACTIVE' | 'HISTORY' | 'PROFILE';

const SERVICE_REQUEST_BANNER_DISMISSED_KEY = 'bengal_sr_banner_dismissed';

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user: initialUser, quotes = [], onPayQuote }) => {
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
  const [hasPayment, setHasPayment] = useState<boolean | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showPaymentSuccessBanner, setShowPaymentSuccessBanner] = useState(false);
  const requestFormRef = React.useRef<HTMLDivElement>(null);

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
        const [jobs, reqs] = await Promise.all([
          listJobsForCustomer(user.id),
          listServiceRequestsForCustomer(user.id),
        ]);
        setSupabaseJobs(jobs);
        setServiceRequests(reqs);
      } catch {
        // ignore - Supabase may not be configured
      }
    };
    load();
  }, [user.id]);

  useEffect(() => {
    hasServiceRequestPayment().then(setHasPayment).catch(() => setHasPayment(false));
  }, []);

  useEffect(() => {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    const query = qIndex >= 0 ? hash.slice(qIndex) : '';
    const params = new URLSearchParams(query);
    if (params.get('openRequestForm') === '1') {
      requestFormRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (params.get('payment_success') === '1') {
      setShowPaymentSuccessBanner(true);
      const openForm = params.get('openRequestForm') === '1' ? '?openRequestForm=1' : '';
      window.history.replaceState(null, '', `${window.location.pathname}#/dashboard${openForm}`);
      setTimeout(() => setShowPaymentSuccessBanner(false), 5000);
    }
  }, []);

  const localMyJobs = allJobs.filter((j) => j.customerId === user.id);
  const seenIds = new Set<string>();
  const myJobs = [...supabaseJobs, ...localMyJobs].filter((j) =>
    seenIds.has(j.id) ? false : (seenIds.add(j.id), true)
  );
  const myQuotes = quotes.filter(q => q.customerId === user.id);

  const historyItems = [
    ...myJobs.map(j => ({
      id: j.id,
      title: j.title,
      type: 'Job',
      status: j.status,
      date: j.startDate,
      amount: j.amount,
      isJob: true
    })),
    ...myQuotes.map(q => ({
      id: q.id,
      title: q.productName,
      type: 'Quote',
      status: q.status,
      date: q.date,
      amount: q.price || 0,
      isJob: false
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
          <span className="text-sm font-bold uppercase tracking-tight">Direct Debit set up successfully. You can now request a service.</span>
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
            <i className="fas fa-user-gear mr-2"></i>Profile
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
                £{(myJobs.filter(j => j.paymentStatus !== 'PAID').reduce((acc, curr) => acc + curr.amount, 0) + 
                   myQuotes.filter(q => q.status === 'QUOTED' || q.status === 'PENDING_PAYMENT').reduce((acc, curr) => acc + (curr.price || 0), 0)).toLocaleString()}
              </p>
            </div>
          </div>

          {myQuotes.some(q => q.status === 'QUOTED' || q.status === 'PENDING_PAYMENT') && (
            <section className="animate-in slide-in-from-left-4">
              <h2 className="text-lg font-bold text-[#F2C200] mb-4">Pending Quotes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myQuotes.filter(q => q.status === 'QUOTED' || q.status === 'PENDING_PAYMENT').map(quote => (
                  <div key={quote.id} className="bg-[#111111] p-5 rounded-2xl border border-[#333333] shadow-lg flex flex-col">
                    <div className="flex items-start space-x-4 mb-4">
                      <img src={quote.productImage} alt="" className="w-16 h-16 rounded-xl object-contain bg-black border border-[#333333] p-2" />
                      <div>
                        <h3 className="font-bold text-white">{quote.productName}</h3>
                        <p className="text-2xl font-black mt-1 text-[#F2C200]">£{quote.price?.toLocaleString()}</p>
                        {quote.status === 'PENDING_PAYMENT' && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF9E6] text-[#B28900]">
                            Payment in progress
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-black/50 border border-[#333333] p-3 rounded-xl mb-4">
                      <p className="text-xs font-bold text-[#F2C200] uppercase mb-1">Service Notes:</p>
                      <p className="text-sm text-gray-300 italic">{quote.adminNotes || "No notes provided."}</p>
                    </div>
                    <button 
                      onClick={() => onPayQuote?.(quote.id)}
                      className="w-full bg-[#F2C200] text-black py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-md"
                    >
                      <i className="fab fa-paypal"></i>
                      <span>{quote.status === 'PENDING_PAYMENT' ? 'Complete Payment' : 'Accept & Pay'} £{quote.price?.toLocaleString()}</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#F2C200]">My Service Orders</h2>
              <Link to="/products" className="text-sm font-semibold hover:text-white transition-colors" style={{ color: COLORS.primary }}>
                View Equipment Catalog
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {myJobs.filter((j) => j.status !== 'COMPLETED').length === 0 ? (
                <div className="p-8 bg-[#111111] rounded-xl border border-dashed border-[#333333] text-center text-gray-500">
                  No active service orders found for your account ID.
                </div>
              ) : (
                <>
                  {myJobs.filter((j) => j.status !== 'COMPLETED').map(job => (
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
                          <h3 className="font-bold text-white group-hover:text-[#F2C200] transition-colors">{job.title}</h3>
                          <p className="text-sm text-gray-400 line-clamp-1">{job.description}</p>
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

          <section ref={requestFormRef} className="bg-[#111111] border border-[#333333] p-6 rounded-2xl text-white">
            <h3 className="text-xl font-bold text-[#F2C200] mb-4">Request a Service</h3>
            {hasPayment === null && (
              <p className="text-gray-400 text-sm">Checking payment status…</p>
            )}
            {hasPayment === false && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  To request a service, set up Direct Debit and pay the initial service fee. Future services can be charged via Direct Debit.
                </p>
                {serviceErrorMessage && (
                  <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl text-sm">
                    {serviceErrorMessage}
                  </div>
                )}
                <button
                  type="button"
                  disabled={checkoutLoading}
                  onClick={async () => {
                    setServiceErrorMessage(null);
                    try {
                      setCheckoutLoading(true);
                      const { url } = await createServiceRequestCheckout();
                      window.location.href = url;
                    } catch (e) {
                      setServiceErrorMessage(e instanceof Error ? e.message : 'Failed to start checkout.');
                    } finally {
                      setCheckoutLoading(false);
                    }
                  }}
                  className="px-6 py-3 rounded-xl font-bold bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-60 transition-all"
                >
                  {checkoutLoading ? 'Redirecting…' : 'Set up Direct Debit & pay £150'}
                </button>
              </div>
            )}
            {hasPayment === true && (
              <>
            <p className="text-gray-400 text-sm mb-6">
              Fill in the details below and our team will be in touch to arrange your service.
            </p>
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
              </>
            )}
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
        <section className="animate-in slide-in-from-bottom-4">
          <div className="bg-[#111111] rounded-3xl border border-[#333333] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-[#333333] flex justify-between items-center bg-black/40">
              <div>
                <h2 className="text-xl font-bold text-[#F2C200]">Account Details</h2>
                <p className="text-gray-500 text-sm">Review and manage your contact information.</p>
              </div>
              {!isEditingProfile && (
                <button 
                  onClick={openEditProfile}
                  className="bg-[#F2C200] text-black px-6 py-2 rounded-xl font-bold text-sm hover:brightness-110 transition-all"
                >
                  <i className="fas fa-pen-to-square mr-2"></i>Edit Profile
                </button>
              )}
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full Name / Business</label>
                  <p className="text-lg font-bold text-white">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address</label>
                  <p className="text-lg font-bold text-white">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact Phone</label>
                  <p className="text-lg font-bold text-white">{user.phone || 'Not provided'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Service Address</label>
                  <p className="text-lg font-bold text-white leading-relaxed">{user.address || 'Not provided'}</p>
                </div>
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Business / Full Name</label>
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone Number</label>
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
