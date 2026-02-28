import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSiteName, getJobIdentifierAndService, getSiteAddress, getJobService } from '../utils/jobIdentity';
import html2pdf from 'html2pdf.js';
import { useAdmin } from '../contexts/AdminContext';
import { Job } from '../types';
import { TR19_REPORTS_STORAGE_KEY, type TR19Report } from './TR19ReportForm';

const SERVICE_TYPES = ['Full Duct Clean', 'Partial Duct Clean', 'Filter Replacement', 'Grease Trap Clean', 'Inspection'];
const GREASE_RATINGS = ['Grade 1 - Heavy', 'Grade 2 - Light', 'Grade 3 - Trace', 'Grade 4 - Clean'];

// Derive certificate number from job or index (until real data)
const getCertificateNumber = (job: Job, index: number) =>
  (job as Job & { certificateNumber?: string }).certificateNumber ||
  `TR19-${String(1235 + index).padStart(6, '0')}`;

// Use shared job identity for service type
const getService = getJobService;

// Derive grease grade from job or index (until real data)
const getGreaseGrade = (job: Job, index: number) =>
  (job as Job & { greaseRating?: string }).greaseRating || GREASE_RATINGS[index % GREASE_RATINGS.length];

// Derive technician from job or default
const getTechnician = (job: Job) => (job as Job & { technician?: string }).technician || 'Mike Turner';

interface EditCertificateForm {
  siteName: string;
  certificateNumber: string;
  jobDate: string;
  technician: string;
  serviceType: string;
  greaseRating: string;
  ductLength: string;
  clientEmail: string;
  siteAddress: string;
  notes: string;
  tr19Compliant: boolean;
}

const generateUniqueCertificateNumber = (jobs: Job[]): string => {
  const numbers = jobs
    .map((j) => (j as Job & { certificateNumber?: string }).certificateNumber)
    .filter((n): n is string => !!n && /^TR19-\d+$/.test(n))
    .map((n) => parseInt(n.replace('TR19-', ''), 10));
  const max = numbers.length ? Math.max(...numbers, 1234) : 1234;
  return `TR19-${String(max + 1).padStart(6, '0')}`;
};

const AdminCertificates: React.FC = () => {
  const { jobs, setJobs, searchQuery, setSearchQuery, handleDeleteJob } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const now = new Date();
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState<EditCertificateForm | null>(null);
  const [certificateView, setCertificateView] = useState<EditCertificateForm | null>(null);
  const [certificateFromReport, setCertificateFromReport] = useState<{ job: Job; report: TR19Report } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isNewCertificateModalOpen, setIsNewCertificateModalOpen] = useState(false);
  const [newCertificateForm, setNewCertificateForm] = useState<EditCertificateForm | null>(null);

  useEffect(() => {
    const viewJobId = (location.state as { viewReportJobId?: string })?.viewReportJobId;
    if (viewJobId && jobs.length) {
      const job = jobs.find((j) => j.id === viewJobId);
      const reports = JSON.parse(localStorage.getItem(TR19_REPORTS_STORAGE_KEY) || '{}');
      const report = reports[viewJobId];
      if (job && report) {
        setCertificateFromReport({ job, report });
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, jobs, navigate, location.pathname]);

  const uniqueSites = Array.from(new Set(jobs.map((j) => j.customerName).filter(Boolean))) as string[];

  const matchesSearch = (text?: string) =>
    !searchQuery || (text || '').toLowerCase().includes(searchQuery.toLowerCase());

  const tr19Reports = useMemo(() => {
    try {
      const r = localStorage.getItem(TR19_REPORTS_STORAGE_KEY);
      return r ? JSON.parse(r) : {};
    } catch {
      return {};
    }
  }, [jobs]);

  const openCertificateFromReport = (job: Job) => {
    const report = tr19Reports[job.id];
    if (report) setCertificateFromReport({ job, report });
  };

  const allCertificates = jobs
    .filter(
      (j) => {
        const certNum = (j as Job & { certificateNumber?: string }).certificateNumber;
        return (
          matchesSearch(j.title) ||
          matchesSearch(j.customerName) ||
          matchesSearch(j.customerId) ||
          matchesSearch(j.warrantyEndDate) ||
          matchesSearch(j.customerAddress) ||
          matchesSearch(j.customerPostcode) ||
          matchesSearch(j.contactName) ||
          matchesSearch(j.id) ||
          matchesSearch(j.customerEmail) ||
          matchesSearch(certNum) ||
          matchesSearch(j.jobType) ||
          matchesSearch(j.description)
        );
      }
    )
    .sort((a, b) => new Date(b.warrantyEndDate).getTime() - new Date(a.warrantyEndDate).getTime());

  const openEditModal = (job: Job) => {
    const idx = allCertificates.findIndex((j) => j.id === job.id);
    const dateStr = job.warrantyEndDate;
    const d = new Date(dateStr);
    const formattedDate =
      String(d.getDate()).padStart(2, '0') +
      '/' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '/' +
      d.getFullYear();
    const j = job as Job & { certificateNumber?: string; technician?: string; greaseRating?: string; ductLength?: string; tr19Compliant?: boolean };
    setEditingJob(job);
    setEditForm({
      siteName: job.customerName || '',
      certificateNumber: j.certificateNumber || getCertificateNumber(job, idx >= 0 ? idx : 0),
      jobDate: formattedDate,
      technician: j.technician || getTechnician(job),
      serviceType: getService(job),
      greaseRating: j.greaseRating || getGreaseGrade(job, idx >= 0 ? idx : 0),
      ductLength: j.ductLength || '15',
      clientEmail: job.customerEmail || '',
      siteAddress: [job.customerAddress, job.customerPostcode].filter(Boolean).join(', ') || '',
      notes: job.description || '',
      tr19Compliant: j.tr19Compliant ?? true,
    });
  };

  const closeEditModal = () => {
    setEditingJob(null);
    setEditForm(null);
  };

  const openNewCertificateModal = () => {
    const today = new Date();
    const formattedDate =
      String(today.getDate()).padStart(2, '0') +
      '/' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '/' +
      today.getFullYear();
    setNewCertificateForm({
      siteName: '',
      certificateNumber: generateUniqueCertificateNumber(jobs),
      jobDate: formattedDate,
      technician: 'Mike Turner',
      serviceType: 'Full Duct Clean',
      greaseRating: 'Grade 2 - Light',
      ductLength: '15',
      clientEmail: '',
      siteAddress: '',
      notes: '',
      tr19Compliant: true,
    });
    setIsNewCertificateModalOpen(true);
  };

  const closeNewCertificateModal = () => {
    setIsNewCertificateModalOpen(false);
    setNewCertificateForm(null);
  };

  const handleSiteSelect = (siteName: string) => {
    if (!newCertificateForm) return;
    const matchingJob = jobs.find((j) => j.customerName === siteName);
    setNewCertificateForm({
      ...newCertificateForm,
      siteName,
      siteAddress: matchingJob
        ? [matchingJob.customerAddress, matchingJob.customerPostcode].filter(Boolean).join(', ')
        : '',
      clientEmail: matchingJob?.customerEmail || '',
    });
  };

  const handleSaveNewCertificate = () => {
    if (!newCertificateForm) return;
    if (!newCertificateForm.siteName.trim()) {
      alert('Please select a Site Name.');
      return;
    }
    const [day, month, year] = newCertificateForm.jobDate.split('/');
    const warrantyEndDate =
      year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : new Date().toISOString().split('T')[0];
    const parts = newCertificateForm.siteAddress.split(',').map((p) => p.trim()).filter(Boolean);
    const postcode = parts.length > 1 ? parts[parts.length - 1] : '';
    const newJob: Job = {
      id: `J-${Math.floor(Math.random() * 10000)}`,
      title: newCertificateForm.serviceType,
      description: newCertificateForm.notes.trim(),
      customerId: `SITE-${Math.floor(Math.random() * 9000) + 1000}`,
      customerName: newCertificateForm.siteName.trim(),
      customerEmail: newCertificateForm.clientEmail.trim(),
      customerAddress: newCertificateForm.siteAddress || undefined,
      customerPostcode: postcode || undefined,
      status: 'COMPLETED',
      startDate: warrantyEndDate,
      warrantyEndDate,
      paymentStatus: 'PAID',
      amount: 0,
      certificateNumber: newCertificateForm.certificateNumber,
      technician: newCertificateForm.technician,
      greaseRating: newCertificateForm.greaseRating,
      ductLength: newCertificateForm.ductLength,
      tr19Compliant: newCertificateForm.tr19Compliant,
    };
    const updated = [newJob, ...jobs];
    setJobs(updated);
    localStorage.setItem('bengal_jobs', JSON.stringify(updated));
    closeNewCertificateModal();
  };

  const handleGenerateNewCertificate = () => {
    if (!newCertificateForm) return;
    if (!newCertificateForm.siteName.trim()) {
      alert('Please select a Site Name.');
      return;
    }
    const formData = { ...newCertificateForm };
    handleSaveNewCertificate();
    setCertificateView(formData);
  };

  const handleSaveCertificate = () => {
    if (!editingJob || !editForm) return;
    if (!editForm.siteName.trim()) {
      alert('Please enter a Site Name.');
      return;
    }
    const [day, month, year] = editForm.jobDate.split('/');
    const warrantyEndDate = year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : editingJob.warrantyEndDate;
    const parts = editForm.siteAddress.split(',').map((p) => p.trim()).filter(Boolean);
    const postcode = parts.length > 1 ? parts[parts.length - 1] : (editingJob.customerPostcode || '');
    const updated = jobs.map((j) =>
      j.id === editingJob.id
        ? {
            ...j,
            customerName: editForm.siteName.trim(),
            warrantyEndDate,
            customerEmail: editForm.clientEmail.trim() || j.customerEmail,
            customerAddress: editForm.siteAddress || j.customerAddress,
            customerPostcode: postcode,
            title: editForm.serviceType,
            description: editForm.notes.trim() || j.description,
            certificateNumber: editForm.certificateNumber,
            technician: editForm.technician,
            greaseRating: editForm.greaseRating,
            ductLength: editForm.ductLength,
            tr19Compliant: editForm.tr19Compliant,
          }
        : j
    );
    setJobs(updated);
    localStorage.setItem('bengal_jobs', JSON.stringify(updated));
    closeEditModal();
  };

  const handleGenerateCertificate = () => {
    if (!editingJob || !editForm) return;
    if (!editForm.siteName.trim()) {
      alert('Please enter a Site Name.');
      return;
    }
    const report = tr19Reports[editingJob.id];
    if (!report) {
      alert('Complete the TR19 Report for this job before generating a certificate.');
      return;
    }
    handleSaveCertificate();
    if (report) {
      const [day, month, year] = editForm.jobDate.split('/');
      const warrantyEndDate = year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : editingJob.warrantyEndDate;
      const parts = editForm.siteAddress.split(',').map((p) => p.trim()).filter(Boolean);
      const postcode = parts.length > 1 ? parts[parts.length - 1] : (editingJob.customerPostcode || '');
      const mergedJob: Job = {
        ...editingJob,
        customerName: editForm.siteName.trim(),
        warrantyEndDate,
        customerEmail: editForm.clientEmail.trim() || editingJob.customerEmail,
        customerAddress: editForm.siteAddress || editingJob.customerAddress,
        customerPostcode: postcode,
        title: editForm.serviceType,
        description: editForm.notes.trim() || editingJob.description,
        certificateNumber: editForm.certificateNumber,
      };
      closeEditModal();
      setCertificateFromReport({ job: mergedJob, report });
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 bg-[#111111] border border-[#333333] rounded-lg text-white text-sm focus:outline-none focus:border-[#F2C200] focus:ring-1 focus:ring-[#F2C200]/30';
  const labelClass = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Certificates</h1>
            <p className="text-gray-500 text-sm font-bold mt-0.5">
              {allCertificates.length} certificate{allCertificates.length !== 1 ? 's' : ''} generated
            </p>
          </div>
          <button
            onClick={openNewCertificateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F2C2001A] shrink-0"
          >
            <i className="fas fa-plus"></i>
            <span>New Certificate</span>
          </button>
        </div>
        <div className="relative w-full max-w-md">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
          <input
            type="text"
            placeholder="Search by site, contact, certificate #, job ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
          />
        </div>
      </div>

      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-[#1A1A1A] border-b border-[#333333]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Certificate #</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Site</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Service</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Grease</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {allCertificates.map((job, index) => {
              const hasTR19 = !!tr19Reports[job.id];
              const isOverdue = !hasTR19 && new Date(job.warrantyEndDate) < now && new Date(job.warrantyEndDate) > new Date(0);
              return (
                <tr key={job.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">{getCertificateNumber(job, index)}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-bold">{getSiteName(job)}</p>
                      <p className="text-xs text-gray-500">{getJobIdentifierAndService(job)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{getSiteAddress(job)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{getService(job)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        index % 3 === 0
                          ? 'bg-red-900/30 text-red-400'
                          : index % 3 === 1
                          ? 'bg-amber-900/30 text-amber-400'
                          : 'bg-green-900/30 text-green-400'
                      }`}
                    >
                      {getGreaseGrade(job, index)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {new Date(job.warrantyEndDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/30 text-red-400 text-[10px] font-black uppercase border border-red-800/50">
                        <i className="fas fa-triangle-exclamation text-[8px]"></i>
                        Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-[10px] font-black uppercase border border-green-800/50">
                        <i className="fas fa-check text-[8px]"></i>
                        Compliant
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tr19Reports[job.id] && (
                      <button
                        onClick={() => openCertificateFromReport(job)}
                        className="text-[#0070ba] hover:text-[#005a94] text-xs font-bold mr-4"
                      >
                        View TR19 Report
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(job)}
                      className="text-gray-400 hover:text-[#F2C200] text-xs font-bold mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {allCertificates.length === 0 && (
          <div className="p-12 text-center text-gray-500 font-bold text-sm">No certificates.</div>
        )}
      </div>

      {/* TR19 Report-based Certificate View */}
      {certificateFromReport && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[700] flex items-center justify-center p-4 overflow-y-auto print:bg-white print:backdrop-blur-none print:p-0 print:static">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-8 overflow-hidden print:shadow-none print:my-0">
            <div id="certificate-print-report" className="p-10 space-y-6 text-sm">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <p className="font-bold text-gray-900">TR19 demo company</p>
                  <p className="text-xs text-gray-500">VHR Registration: —</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-gray-900">Report Ref {certificateFromReport.job.certificateNumber || certificateFromReport.job.id}</p>
                  <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Executive Compliance Summary */}
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
                <p className="text-2xl font-black text-green-600 mb-2">COMPLIANT</p>
                <p className="text-xs text-gray-600 mb-4">Overall Post-Clean Verification Status</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-green-600 font-bold">SYSTEM CLEANED ENTIRELY: YES</p>
                    {(() => {
                      const r = certificateFromReport.report.micronReadings;
                      const postVals = r.filter((x) => x.postClean && !isNaN(parseFloat(x.postClean)));
                      const meanPost = postVals.length ? postVals.reduce((s, x) => s + parseFloat(x.postClean), 0) / postVals.length : 0;
                      return (
                        <p className="text-green-600 font-bold mt-1">MEAN POST-CLEAN READING: {meanPost.toFixed(1)}µm (Below 50µm threshold)</p>
                      );
                    })()}
                  </div>
                  <div className="text-right">
                    {(() => {
                      const r = certificateFromReport.report.micronReadings;
                      const preVals = r.filter((x) => x.preClean && !isNaN(parseFloat(x.preClean)));
                      const meanPre = preVals.length ? preVals.reduce((s, x) => s + parseFloat(x.preClean), 0) / preVals.length : 0;
                      return <p className="text-blue-600 font-bold">MEAN PRE-CLEAN READING: {meanPre.toFixed(1)}µm</p>;
                    })()}
                  </div>
                </div>
              </div>

              {/* Client & Site Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-black text-gray-500 uppercase mb-2">Client Details</h4>
                  <p className="text-gray-700"><span className="font-bold">CLIENT / BUSINESS NAME:</span> {certificateFromReport.job.customerName || '—'}</p>
                  <p className="text-gray-700"><span className="font-bold">SITE CONTACT:</span> {certificateFromReport.job.contactName || '—'}</p>
                  <p className="text-gray-700"><span className="font-bold">CONTACT EMAIL:</span> {certificateFromReport.job.customerEmail || '—'}</p>
                  <p className="text-gray-700"><span className="font-bold">KITCHEN USE CATEGORY:</span> Moderate Use 6-12hrs/day</p>
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-500 uppercase mb-2">Site Details</h4>
                  <p className="text-gray-700"><span className="font-bold">SITE ADDRESS:</span> {[certificateFromReport.job.customerAddress, certificateFromReport.job.customerPostcode].filter(Boolean).join(', ') || '—'}</p>
                  <p className="text-gray-700"><span className="font-bold">CONTACT PHONE:</span> {certificateFromReport.job.customerPhone || '—'}</p>
                  <p className="text-gray-700"><span className="font-bold">TYPE OF PREMISES:</span> Restaurant</p>
                </div>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-black text-gray-500 uppercase mb-2">Job Details</h4>
                  <p className="text-gray-700"><span className="font-bold">JOB NUMBER:</span> {certificateFromReport.job.id}</p>
                  <p className="text-gray-700"><span className="font-bold">TIME ON SITE:</span> {certificateFromReport.report.timeOnSiteStart} - {certificateFromReport.report.timeOnSiteEnd}</p>
                  <p className="text-gray-700"><span className="font-bold">LEAD BESA GHO/GHT CERT NO.:</span> {certificateFromReport.report.besaCertNo || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-700 mt-6"><span className="font-bold">DATE OF CLEAN:</span> {new Date(certificateFromReport.job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="text-gray-700"><span className="font-bold">LEAD OPERATIVE:</span> {certificateFromReport.report.leadOperativeName}</p>
                  <p className="text-gray-700"><span className="font-bold">CLEANING METHOD(S):</span> {certificateFromReport.report.cleaningMethods?.length ? certificateFromReport.report.cleaningMethods.join(', ') : '—'}</p>
                </div>
              </div>
              {certificateFromReport.report.areasCleaned?.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-gray-500 uppercase mb-2">Areas Cleaned</h4>
                  <div className="flex flex-wrap gap-2">
                    {certificateFromReport.report.areasCleaned.map((a) => (
                      <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">✓ {a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Grease Thickness Measurements */}
              <div>
                <h4 className="text-xs font-black text-gray-500 uppercase mb-3">Grease Thickness Measurements (WFTT/DTT)</h4>
                <table className="w-full text-left border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-xs font-bold text-gray-700 border-b">Location</th>
                      <th className="px-3 py-2 text-xs font-bold text-gray-700 border-b">Pre-clean (µm)</th>
                      <th className="px-3 py-2 text-xs font-bold text-gray-700 border-b">Post-clean (µm)</th>
                      <th className="px-3 py-2 text-xs font-bold text-gray-700 border-b">Pass/Fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificateFromReport.report.micronReadings?.map((r, i) => {
                      const post = parseFloat(r.postClean);
                      const pass = !isNaN(post) && post < 50;
                      return (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-700">{r.location}</td>
                          <td className="px-3 py-2 text-blue-600 font-bold">{r.preClean || '—'}</td>
                          <td className="px-3 py-2 text-green-600 font-bold">{r.postClean || '—'}</td>
                          <td className="px-3 py-2"><span className={pass ? 'text-green-600 font-bold' : 'text-red-600'}>{pass ? 'PASS' : r.postClean ? 'FAIL' : '—'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {(() => {
                  const r = certificateFromReport.report.micronReadings || [];
                  const preVals = r.filter((x) => x.preClean && !isNaN(parseFloat(x.preClean))).map((x) => parseFloat(x.preClean));
                  const postVals = r.filter((x) => x.postClean && !isNaN(parseFloat(x.postClean))).map((x) => parseFloat(x.postClean));
                  const meanPre = preVals.length ? preVals.reduce((a, b) => a + b, 0) / preVals.length : 0;
                  const meanPost = postVals.length ? postVals.reduce((a, b) => a + b, 0) / postVals.length : 0;
                  const pass = meanPost < 50;
                  return (
                    <p className="text-xs text-gray-500 mt-2">
                      Mean Average: Pre {meanPre.toFixed(1)}µm | Post {meanPost.toFixed(1)}µm — {pass ? 'PASS' : 'FAIL'}. Post-clean mean must be below 50µm for PASS.
                    </p>
                  );
                })()}
              </div>

              {/* Cleaning Frequency */}
              <div className="bg-blue-600 text-white p-4 rounded-lg">
                <p className="text-xs font-bold uppercase mb-1">Next Recommended Clean Due Date</p>
                <p className="text-xl font-black">
                  {certificateFromReport.report.nextRecommendedCleanDate
                    ? new Date(certificateFromReport.report.nextRecommendedCleanDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                    : new Date(new Date().setMonth(new Date().getMonth() + 6)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Photographic Evidence */}
              {certificateFromReport.report.photos?.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-gray-500 uppercase mb-3">Photographic Evidence</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {certificateFromReport.report.photos.slice(0, 6).map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Evidence ${i + 1}`}
                        className="w-full aspect-square object-cover rounded border border-gray-200 cursor-pointer hover:border-[#0070ba] transition-colors"
                        onClick={() => setPhotoPreview(src)}
                      />
                    ))}
                  </div>
                  {photoPreview && (
                    <div
                      className="fixed inset-0 bg-black/90 z-[800] flex items-center justify-center p-4"
                      onClick={() => setPhotoPreview(null)}
                    >
                      <img src={photoPreview} alt="Enlarged" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
                    </div>
                  )}
                </div>
              )}

              {/* Compliance Declaration */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-xs font-black text-gray-500 uppercase mb-2">Compliance Declaration & Signatures</h4>
                <p className="text-gray-700 text-xs mb-4">
                  This Post-Clean Verification Report has been prepared in accordance with the <strong>BESA TR19 Grease Specification</strong> and <strong>Technical Bulletin TB/009</strong>. The cleaning described herein was carried out by trained and certificated operatives holding current BESA GHO/GHT certification.
                </p>
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs font-bold text-gray-500">LEAD OPERATIVE</p>
                    <p className="font-bold text-gray-900">{certificateFromReport.report.leadOperativeName}</p>
                    <p className="text-xs text-gray-500">Date: {new Date(certificateFromReport.report.signedAt || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => {
                  const el = document.getElementById('certificate-print-report');
                  if (el) html2pdf().set({ filename: `TR19-report-${certificateFromReport.job.id}.pdf` }).from(el).save();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-[#0070ba] text-white hover:brightness-110"
              >
                <i className="fas fa-download text-sm"></i>
                Download PDF
              </button>
              <button
                onClick={() => setCertificateFromReport(null)}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-[#111111] text-white hover:bg-[#222222]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Certificate View */}
      {certificateView && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[700] flex items-center justify-center p-4 overflow-y-auto print:bg-white print:backdrop-blur-none print:p-0 print:static">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8 overflow-hidden print:shadow-none print:my-0">
            <div id="certificate-print" className="p-10 space-y-6">
              <h1 className="text-2xl font-black text-gray-900 text-center tracking-tight">
                TR19 Flow | DUCT COMPLIANCE
              </h1>
              <h2 className="text-lg font-bold text-[#F2C200]">
                BESA TR19 Grease Compliance Statement
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Site:</span>
                  <span className="text-gray-700">{certificateView.siteName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Address:</span>
                  <span className="text-gray-700">{certificateView.siteAddress || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Job Date:</span>
                  <span className="text-gray-700">
                    {(() => {
                      const parts = certificateView.jobDate.split('/').filter(Boolean);
                      if (parts.length === 3) {
                        const [d, m, y] = parts;
                        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                      }
                      return certificateView.jobDate || '—';
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Technician:</span>
                  <span className="text-gray-700">{certificateView.technician}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Service Type:</span>
                  <span className="text-gray-700">{certificateView.serviceType}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Grease Rating:</span>
                  <span className="text-gray-700">{certificateView.greaseRating}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Duct Length:</span>
                  <span className="text-gray-700">{certificateView.ductLength} metres</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Compliant:</span>
                  <span className="text-gray-700">
                    {certificateView.tr19Compliant ? 'Yes - TR19 Compliant' : 'No'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Certificate Number:</span>
                  <span className="text-gray-700 font-mono">{certificateView.certificateNumber}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900 min-w-[140px]">Notes:</span>
                  <span className="text-gray-700">{certificateView.notes || 'None'}</span>
                </div>
              </div>
              <div className="pt-12 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-[#F2C200] flex items-center justify-center text-black font-black text-xl">
                  99.9%
                </div>
                <div className="w-48 h-px bg-gray-800" />
                <div className="text-center">
                  <p className="font-bold text-gray-900">{certificateView.technician}</p>
                  <p className="text-sm text-gray-600">TR19 Technician</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => {
                  const element = document.getElementById('certificate-print');
                  if (element) {
                    html2pdf()
                      .set({ filename: `certificate-${certificateView.certificateNumber || 'TR19'}.pdf` })
                      .from(element)
                      .save();
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-colors shadow-lg shadow-[#F2C2001A]"
              >
                <i className="fas fa-download text-sm"></i>
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => setCertificateView(null)}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-[#111111] text-white hover:bg-[#222222] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Certificate Modal */}
      {isNewCertificateModalOpen && newCertificateForm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[600] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">New Certificate</h2>
              <button
                onClick={closeNewCertificateModal}
                className="text-gray-400 hover:text-white p-1 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Site Name *</label>
                  <select
                    value={newCertificateForm.siteName}
                    onChange={(e) => handleSiteSelect(e.target.value)}
                    className={inputClass}
                  >
                    <option value="" className="bg-[#111111] text-white">
                      Select a site...
                    </option>
                    {uniqueSites.map((site) => (
                      <option key={site} value={site} className="bg-[#111111] text-white">
                        {site}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Certificate Number</label>
                  <input
                    type="text"
                    value={newCertificateForm.certificateNumber}
                    onChange={(e) =>
                      setNewCertificateForm({ ...newCertificateForm, certificateNumber: e.target.value })
                    }
                    className={inputClass}
                    placeholder="TR19-001235"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Job Date *</label>
                  <input
                    type="text"
                    value={newCertificateForm.jobDate}
                    onChange={(e) =>
                      setNewCertificateForm({ ...newCertificateForm, jobDate: e.target.value })
                    }
                    className={inputClass}
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                <div>
                  <label className={labelClass}>Technician</label>
                  <input
                    type="text"
                    value={newCertificateForm.technician}
                    onChange={(e) =>
                      setNewCertificateForm({ ...newCertificateForm, technician: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Mike Turner"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Service Type</label>
                  <select
                    value={newCertificateForm.serviceType}
                    onChange={(e) =>
                      setNewCertificateForm({ ...newCertificateForm, serviceType: e.target.value })
                    }
                    className={inputClass}
                  >
                    {SERVICE_TYPES.map((s) => (
                      <option key={s} value={s} className="bg-[#111111] text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Grease Rating</label>
                  <select
                    value={newCertificateForm.greaseRating}
                    onChange={(e) =>
                      setNewCertificateForm({ ...newCertificateForm, greaseRating: e.target.value })
                    }
                    className={inputClass}
                  >
                    {GREASE_RATINGS.map((g) => (
                      <option key={g} value={g} className="bg-[#111111] text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Duct Length (m)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newCertificateForm.ductLength}
                    onChange={(e) =>
                      setNewCertificateForm({ ...newCertificateForm, ductLength: e.target.value })
                    }
                    className={inputClass}
                    placeholder="15"
                  />
                </div>
                <div>
                  <label className={labelClass}>Client Email</label>
                  <input
                    type="email"
                    value={newCertificateForm.clientEmail}
                    onChange={(e) =>
                      setNewCertificateForm({ ...newCertificateForm, clientEmail: e.target.value })
                    }
                    className={inputClass}
                    placeholder="client@example.com"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Site Address</label>
                <textarea
                  rows={2}
                  value={newCertificateForm.siteAddress}
                  onChange={(e) =>
                    setNewCertificateForm({ ...newCertificateForm, siteAddress: e.target.value })
                  }
                  className={`${inputClass} resize-none`}
                  placeholder="12 High Street, Birmingham, B1 1BB"
                />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  rows={3}
                  value={newCertificateForm.notes}
                  onChange={(e) =>
                    setNewCertificateForm({ ...newCertificateForm, notes: e.target.value })
                  }
                  className={`${inputClass} resize-none`}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="new-tr19-compliant"
                  checked={newCertificateForm.tr19Compliant}
                  onChange={(e) =>
                    setNewCertificateForm({ ...newCertificateForm, tr19Compliant: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-[#333333] bg-[#111111] text-[#F2C200] focus:ring-[#F2C200]/50"
                />
                <label htmlFor="new-tr19-compliant" className="text-sm font-bold text-white">
                  TR19 Compliant
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex items-center justify-end gap-3">
              <button
                onClick={closeNewCertificateModal}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-transparent border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateNewCertificate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-colors shadow-lg shadow-[#F2C2001A]"
              >
                <i className="fas fa-file-arrow-up text-sm"></i>
                <span>Generate Certificate</span>
              </button>
              <button
                onClick={handleSaveNewCertificate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-transparent border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-colors"
              >
                <i className="fas fa-check text-sm"></i>
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Certificate Modal */}
      {editingJob && editForm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[600] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit Certificate</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white p-1 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Site Name *</label>
                  <input
                    type="text"
                    value={editForm.siteName}
                    onChange={(e) => setEditForm({ ...editForm, siteName: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Bella Italia Restaurant"
                  />
                </div>
                <div>
                  <label className={labelClass}>Certificate Number</label>
                  <input
                    type="text"
                    value={editForm.certificateNumber}
                    onChange={(e) => setEditForm({ ...editForm, certificateNumber: e.target.value })}
                    className={inputClass}
                    placeholder="TR19-001235"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Job Date *</label>
                  <input
                    type="text"
                    value={editForm.jobDate}
                    onChange={(e) => setEditForm({ ...editForm, jobDate: e.target.value })}
                    className={inputClass}
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                <div>
                  <label className={labelClass}>Technician</label>
                  <input
                    type="text"
                    value={editForm.technician}
                    onChange={(e) => setEditForm({ ...editForm, technician: e.target.value })}
                    className={inputClass}
                    placeholder="Mike Turner"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Service Type</label>
                  <select
                    value={editForm.serviceType}
                    onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
                    className={inputClass}
                  >
                    {SERVICE_TYPES.map((s) => (
                      <option key={s} value={s} className="bg-[#111111] text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Grease Rating</label>
                  <select
                    value={editForm.greaseRating}
                    onChange={(e) => setEditForm({ ...editForm, greaseRating: e.target.value })}
                    className={inputClass}
                  >
                    {GREASE_RATINGS.map((g) => (
                      <option key={g} value={g} className="bg-[#111111] text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Duct Length (m)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.ductLength}
                    onChange={(e) => setEditForm({ ...editForm, ductLength: e.target.value })}
                    className={inputClass}
                    placeholder="15"
                  />
                </div>
                <div>
                  <label className={labelClass}>Client Email</label>
                  <input
                    type="email"
                    value={editForm.clientEmail}
                    onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                    className={inputClass}
                    placeholder="marco@bellaitalia.co.uk"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Site Address</label>
                <textarea
                  rows={2}
                  value={editForm.siteAddress}
                  onChange={(e) => setEditForm({ ...editForm, siteAddress: e.target.value })}
                  className={`${inputClass} resize-none`}
                  placeholder="12 High Street, Birmingham, B1 1BB"
                />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className={`${inputClass} resize-none`}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tr19-compliant"
                  checked={editForm.tr19Compliant}
                  onChange={(e) => setEditForm({ ...editForm, tr19Compliant: e.target.checked })}
                  className="w-4 h-4 rounded border-[#333333] bg-[#111111] text-[#F2C200] focus:ring-[#F2C200]/50"
                />
                <label htmlFor="tr19-compliant" className="text-sm font-bold text-white">
                  TR19 Compliant
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex items-center justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-transparent border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateCertificate}
                disabled={!editingJob || !tr19Reports[editingJob.id]}
                title={editingJob && !tr19Reports[editingJob.id] ? 'Complete TR19 Report first' : undefined}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-lg ${
                  editingJob && tr19Reports[editingJob.id]
                    ? 'bg-[#F2C200] text-black hover:brightness-110 shadow-[#F2C2001A]'
                    : 'bg-[#333333] text-gray-500 cursor-not-allowed'
                }`}
              >
                <i className="fas fa-file-arrow-up text-sm"></i>
                <span>Generate Certificate</span>
              </button>
              <button
                onClick={handleSaveCertificate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-transparent border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-colors"
              >
                <i className="fas fa-check text-sm"></i>
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificates;
