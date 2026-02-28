import React, { useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { Job } from '../types';
import { getSiteName, getJobIdentifierAndService, getSiteAddress } from '../utils/jobIdentity';

const FREQUENCY_OPTIONS = [
  'Every 3 months',
  'Every 6 months',
  'Every 12 months',
  'Every 18 months',
  'Every 24 months',
];

type StatusFilter = 'ALL' | 'OVERDUE' | 'DUE_SOON' | 'OK';
type CertificateStatus = 'OVERDUE' | 'DUE_SOON' | 'OK';

interface EditSiteForm {
  siteName: string;
  address: string;
  postcode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  lastCleanDate: string;
  nextDueDate: string;
  frequency: string;
  notes: string;
}

const formatDateForInput = (iso: string) => {
  const d = new Date(iso);
  return (
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear()
  );
};

const parseDateToISO = (ddmmyyyy: string) => {
  const parts = ddmmyyyy.split('/').filter(Boolean);
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const AdminSites: React.FC = () => {
  const { jobs, setJobs, searchQuery, setSearchQuery, openAddJobModal, handleDeleteJob } = useAdmin();
  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState<EditSiteForm | null>(null);

  const matchesSearch = (text?: string) =>
    !searchQuery || (text || '').toLowerCase().includes(searchQuery.toLowerCase());

  const getCertificateStatus = (job: Job): CertificateStatus | null => {
    const expiry = new Date(job.warrantyEndDate);
    if (expiry <= new Date(0)) return null;
    if (expiry < now) return 'OVERDUE';
    if (expiry <= ninetyDaysFromNow) return 'DUE_SOON';
    return 'OK';
  };

  const allSites = jobs
    .filter(
      (j) =>
        matchesSearch(j.customerName) ||
        matchesSearch(j.customerAddress) ||
        matchesSearch(j.customerPostcode) ||
        matchesSearch(j.customerEmail) ||
        matchesSearch(j.contactName) ||
        matchesSearch(j.warrantyEndDate) ||
        matchesSearch(j.id) ||
        matchesSearch(j.title) ||
        matchesSearch(j.jobType) ||
        matchesSearch(j.description) ||
        matchesSearch((j as Job & { certificateNumber?: string }).certificateNumber)
    )
    .sort((a, b) => new Date(a.warrantyEndDate).getTime() - new Date(b.warrantyEndDate).getTime());

  const filteredSites = allSites.filter((job) => {
    const status = getCertificateStatus(job);
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OVERDUE') return status === 'OVERDUE';
    if (statusFilter === 'DUE_SOON') return status === 'DUE_SOON';
    if (statusFilter === 'OK') return status === 'OK';
    return true;
  });

  const activeCount = allSites.length;

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setEditForm({
      siteName: job.customerName || '',
      address: job.customerAddress || '',
      postcode: job.customerPostcode || '',
      contactName: job.contactName || job.customerName || '',
      contactEmail: job.customerEmail || '',
      contactPhone: job.customerPhone || '',
      lastCleanDate: formatDateForInput(job.startDate),
      nextDueDate: formatDateForInput(job.warrantyEndDate),
      frequency: job.frequency || 'Every 12 months',
      notes: job.description || '',
    });
  };

  const closeEditModal = () => {
    setEditingJob(null);
    setEditForm(null);
  };

  const handleUpdateSite = () => {
    if (!editingJob || !editForm) return;
    if (!editForm.siteName.trim()) {
      alert('Please enter a Site Name.');
      return;
    }
    if (!editForm.postcode.trim()) {
      alert('Please enter a Postcode.');
      return;
    }
    const updated = jobs.map((j) =>
      j.id === editingJob.id
        ? {
            ...j,
            customerName: editForm.siteName.trim(),
            customerAddress: editForm.address.trim() || j.customerAddress,
            customerPostcode: editForm.postcode.trim(),
            contactName: editForm.contactName.trim() || j.contactName,
            customerEmail: editForm.contactEmail.trim() || j.customerEmail,
            customerPhone: editForm.contactPhone.trim() || j.customerPhone,
            startDate: parseDateToISO(editForm.lastCleanDate) || j.startDate,
            warrantyEndDate: parseDateToISO(editForm.nextDueDate) || j.warrantyEndDate,
            frequency: editForm.frequency,
            description: editForm.notes.trim() || j.description,
          }
        : j
    );
    setJobs(updated);
    localStorage.setItem('bengal_jobs', JSON.stringify(updated));
    closeEditModal();
  };

  const getStatusBadge = (status: CertificateStatus | null) => {
    if (!status) return null;
    if (status === 'OVERDUE')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          Overdue
        </span>
      );
    if (status === 'DUE_SOON')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2C200] text-black text-[10px] font-black uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-black/50" />
          Due Soon
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-600 text-white text-[10px] font-black uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        Up to Date
      </span>
    );
  };

  const inputClass =
    'w-full px-4 py-2.5 bg-[#111111] border border-[#333333] rounded-lg text-white text-sm focus:outline-none focus:border-[#F2C200] focus:ring-1 focus:ring-[#F2C200]/30';
  const labelClass = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Sites</h1>
            <p className="text-gray-500 text-sm font-bold mt-0.5">{activeCount} active site{activeCount !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={openAddJobModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F2C2001A] shrink-0"
          >
            <i className="fas fa-plus"></i>
            <span>Add Site</span>
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative w-full max-w-md flex-1">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
            <input
              type="text"
              placeholder="Search by site, contact, job ref, certificate #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-[#F2C200] text-black' : 'bg-[#111111] border border-[#333333] text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('OVERDUE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'OVERDUE' ? 'bg-[#F2C200] text-black' : 'bg-[#111111] border border-[#333333] text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Overdue
            </button>
            <button
              onClick={() => setStatusFilter('DUE_SOON')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'DUE_SOON' ? 'bg-[#F2C200] text-black' : 'bg-[#111111] border border-[#333333] text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#F2C200]" />
              Due Soon
            </button>
            <button
              onClick={() => setStatusFilter('OK')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'OK' ? 'bg-[#F2C200] text-black' : 'bg-[#111111] border border-[#333333] text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500" />
              OK
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-[#1A1A1A] border-b border-[#333333]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Site</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Next Due</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {filteredSites.map((job) => {
              const certStatus = getCertificateStatus(job);
              const contactName = job.contactName || job.customerName || '—';
              return (
                <tr key={job.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-white">{getSiteName(job)}</p>
                      <p className="text-xs text-gray-500">{getJobIdentifierAndService(job)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{getSiteAddress(job)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-white">{contactName}</p>
                      <p className="text-[10px] text-gray-500">{job.customerEmail || '—'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {new Date(job.warrantyEndDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(certStatus)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEditModal(job)}
                        className="text-gray-500 hover:text-[#F2C200] transition-colors"
                        title="Edit Site"
                      >
                        <i className="fas fa-pen"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredSites.length === 0 && (
          <div className="p-12 text-center text-gray-500 font-bold text-sm">No sites found.</div>
        )}
      </div>

      {/* Edit Site Modal */}
      {editingJob && editForm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[600] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit Site</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white p-1 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className={labelClass}>Site Name *</label>
                <input
                  type="text"
                  value={editForm.siteName}
                  onChange={(e) => setEditForm({ ...editForm, siteName: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. mikey shop"
                />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className={inputClass}
                  placeholder="101 ragland road"
                />
              </div>
              <div>
                <label className={labelClass}>Postcode *</label>
                <input
                  type="text"
                  value={editForm.postcode}
                  onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
                  className={inputClass}
                  placeholder="b66 3nd"
                />
              </div>
              <div>
                <label className={labelClass}>Contact Name</label>
                <input
                  type="text"
                  value={editForm.contactName}
                  onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                  className={inputClass}
                  placeholder="mikey"
                />
              </div>
              <div>
                <label className={labelClass}>Contact Email</label>
                <input
                  type="email"
                  value={editForm.contactEmail}
                  onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                  className={inputClass}
                  placeholder="mikey@outlook.com"
                />
              </div>
              <div>
                <label className={labelClass}>Contact Phone</label>
                <input
                  type="tel"
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                  className={inputClass}
                  placeholder="23453545"
                />
              </div>
              <div>
                <label className={labelClass}>Last Clean Date</label>
                <input
                  type="text"
                  value={editForm.lastCleanDate}
                  onChange={(e) => setEditForm({ ...editForm, lastCleanDate: e.target.value })}
                  className={inputClass}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className={labelClass}>Next Due Date</label>
                <input
                  type="text"
                  value={editForm.nextDueDate}
                  onChange={(e) => setEditForm({ ...editForm, nextDueDate: e.target.value })}
                  className={inputClass}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className={labelClass}>Frequency</label>
                <select
                  value={editForm.frequency}
                  onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                  className={inputClass}
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#111111] text-white">
                      {opt}
                    </option>
                  ))}
                </select>
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
            </div>
            <div className="p-6 border-t border-[#333333] flex items-center justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-transparent border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSite}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-colors shadow-lg shadow-[#F2C2001A]"
              >
                <i className="fas fa-check text-sm"></i>
                <span>Update Site</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSites;
