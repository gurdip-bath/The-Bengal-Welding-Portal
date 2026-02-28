
import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import { useAdmin } from '../contexts/AdminContext';
import { Job } from '../types';

const SERVICE_TYPES = ['Full Duct Clean', 'Partial Duct Clean', 'Filter Replacement', 'Grease Trap Clean', 'Inspection'];
const GREASE_RATINGS = ['Grade 1 - Heavy', 'Grade 2 - Light', 'Grade 3 - Trace', 'Grade 4 - Clean'];

// Derive certificate number from job or index (until real data)
const getCertificateNumber = (job: Job, index: number) =>
  (job as Job & { certificateNumber?: string }).certificateNumber ||
  `TR19-${String(1235 + index).padStart(6, '0')}`;

// Derive service type from title or default (until real data)
const getService = (job: Job) => job.title || 'Full Duct Clean';

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

const AdminCertificates: React.FC = () => {
  const { jobs, setJobs, searchQuery, setSearchQuery, openAddJobModal, handleDeleteJob } = useAdmin();
  const now = new Date();
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState<EditCertificateForm | null>(null);
  const [certificateView, setCertificateView] = useState<EditCertificateForm | null>(null);

  const matchesSearch = (text?: string) =>
    !searchQuery || (text || '').toLowerCase().includes(searchQuery.toLowerCase());

  const allCertificates = jobs
    .filter(
      (j) =>
        matchesSearch(j.title) ||
        matchesSearch(j.customerName) ||
        matchesSearch(j.customerId) ||
        matchesSearch(j.warrantyEndDate) ||
        matchesSearch(j.customerAddress) ||
        matchesSearch(j.customerPostcode)
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
    handleSaveCertificate();
    setCertificateView({ ...editForm });
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
            onClick={openAddJobModal}
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
            placeholder="Search certificates..."
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
              const isOverdue = new Date(job.warrantyEndDate) < now && new Date(job.warrantyEndDate) > new Date(0);
              const siteAddress = [job.customerAddress, job.customerPostcode].filter(Boolean).join(', ') || '-';
              return (
                <tr key={job.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">{getCertificateNumber(job, index)}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-bold">{job.customerName || 'No Name'}</p>
                      <p className="text-[10px] text-gray-500">{siteAddress}</p>
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-colors shadow-lg shadow-[#F2C2001A]"
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
