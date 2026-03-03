import React, { useState, useEffect } from 'react';
import {
  listServiceRequestsForAdmin,
  approveServiceRequest,
  rejectServiceRequest,
  type ServiceRequestRow,
  type ServiceRequestStatus,
} from '../lib/serviceRequests';
import { createJobFromServiceRequest } from '../lib/jobs';
import { useAdmin } from '../contexts/AdminContext';
import { COLORS } from '../constants';

const AdminServiceRequests: React.FC = () => {
  const { jobs, setJobs } = useAdmin();
  const [requests, setRequests] = useState<ServiceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ServiceRequestRow | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<ServiceRequestRow | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listServiceRequestsForAdmin();
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const pending = requests.filter((r) => r.status === 'pending');
  const approved = requests.filter((r) => r.status === 'approved');
  const rejected = requests.filter((r) => r.status === 'rejected');

  const handleApprove = async () => {
    if (!selected || !notes.trim()) return;
    setSubmitting(true);
    try {
      await approveServiceRequest(selected.id, notes);
      const job = await createJobFromServiceRequest(selected);
      setJobs((prev) => {
        const next = [job, ...prev];
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('bengal_jobs', JSON.stringify(next));
        }
        return next;
      });
      setSelected(null);
      setAction(null);
      setNotes('');
      await fetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !notes.trim()) return;
    setSubmitting(true);
    try {
      await rejectServiceRequest(selected.id, notes);
      setSelected(null);
      setAction(null);
      setNotes('');
      await fetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (req: ServiceRequestRow, a: 'approve' | 'reject') => {
    setSelected(req);
    setAction(a);
    setNotes('');
  };

  const StatusBadge = ({ status }: { status: ServiceRequestStatus }) => {
    const styles =
      status === 'pending'
        ? 'bg-[#FFF9E6]/20 text-[#B28900]'
        : status === 'approved'
        ? 'bg-green-900/30 text-green-400'
        : 'bg-red-900/30 text-red-400';
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles}`}>
        {status}
      </span>
    );
  };

  const card = (req: ServiceRequestRow, showActions = false) => (
    <div
      key={req.id}
      className="bg-[#111111] p-4 rounded-xl border border-[#333333] hover:border-[#333333]/80 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-bold text-white truncate">
          {req.business_name || req.full_name}
        </h3>
        <StatusBadge status={req.status} />
      </div>
      <p className="text-xs text-gray-500 mb-2">{req.full_name}</p>
      <p className="text-xs text-gray-400 mb-1">
        <i className="fas fa-calendar mr-1" style={{ color: COLORS.primary }} />
        {req.requested_date}
      </p>
      <p className="text-xs text-gray-400 truncate">
        <i className="fas fa-location-dot mr-1" style={{ color: COLORS.primary }} />
        {req.business_address || '—'}
      </p>
      {req.admin_notes && (
        <p className="text-xs text-gray-500 mt-2 italic">Admin notes: {req.admin_notes}</p>
      )}
      <button
        onClick={() => setDetailsOpen(req)}
        className="mt-3 w-full px-3 py-2 rounded-lg border border-[#333333] text-gray-400 text-sm font-bold hover:bg-white/5 hover:text-white transition-colors"
      >
        <i className="fas fa-eye mr-2" />
        View full details
      </button>
      {showActions && req.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => openAction(req, 'approve')}
            className="flex-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold"
          >
            Approve
          </button>
          <button
            onClick={() => openAction(req, 'reject')}
            className="flex-1 px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-500/80 text-white text-sm font-bold"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Service Requests</h1>

      {error && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/50 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">
          <i className="fas fa-spinner fa-spin text-2xl mb-2" />
          <p>Loading service requests...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Pending ({pending.length})</h2>
            <div className="space-y-3">
              {pending.map((r) => card(r, true))}
              {pending.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm font-bold rounded-xl border border-dashed border-[#333333]">
                  No pending requests.
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Approved ({approved.length})</h2>
            <div className="space-y-3">
              {approved.map((r) => card(r))}
              {approved.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm font-bold rounded-xl border border-dashed border-[#333333]">
                  No approved requests.
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Rejected ({rejected.length})</h2>
            <div className="space-y-3">
              {rejected.map((r) => card(r))}
              {rejected.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm font-bold rounded-xl border border-dashed border-[#333333]">
                  No rejected requests.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsOpen && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setDetailsOpen(null)}
        >
          <div
            className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#333333] flex justify-between items-start">
              <h3 className="text-xl font-bold text-[#F2C200]">Service Request Details</h3>
              <button
                onClick={() => setDetailsOpen(null)}
                className="p-2 text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Site Name</p>
                <p className="text-white font-medium">{detailsOpen.business_name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Site Address</p>
                <p className="text-white font-medium whitespace-pre-wrap">{detailsOpen.business_address || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Site Postcode</p>
                <p className="text-white font-medium">{detailsOpen.postcode || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes (from customer)</p>
                <p className="text-white font-medium whitespace-pre-wrap">{detailsOpen.notes || '—'}</p>
              </div>
              {detailsOpen.admin_notes && (
                <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#333333]">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Admin notes {detailsOpen.status === 'rejected' ? '(rejection reason)' : '(approval notes)'}
                  </p>
                  <p className="text-white font-medium whitespace-pre-wrap">{detailsOpen.admin_notes}</p>
                </div>
              )}
              <div className="border-t border-[#333333] pt-4 mt-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</p>
                  <p className="text-white font-medium">{detailsOpen.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Name</p>
                  <p className="text-white font-medium">{detailsOpen.contact_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Email</p>
                  <p className="text-white font-medium">{detailsOpen.contact_email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred Service Date</p>
                  <p className="text-white font-medium">{detailsOpen.requested_date}</p>
                </div>
              </div>
              {detailsOpen.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t border-[#333333]">
                  <button
                    onClick={() => {
                      setDetailsOpen(null);
                      openAction(detailsOpen, 'approve');
                    }}
                    className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setDetailsOpen(null);
                      openAction(detailsOpen, 'reject');
                    }}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-500/80 text-white font-bold"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {selected && action && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div
              className={`p-4 ${action === 'approve' ? 'bg-green-900/30' : 'bg-red-900/30'}`}
            >
              <h3 className="text-lg font-bold text-white">
                {action === 'approve' ? 'Approve' : 'Reject'} Request
              </h3>
              <p className="text-sm text-gray-400">{selected.business_name || selected.full_name}</p>
            </div>
            <div className="p-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                Notes (required)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={
                  action === 'approve'
                    ? 'Add notes for the customer (optional scheduling details...)'
                    : 'Explain why the request was rejected and what the customer should amend'
                }
                className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200] resize-none"
              />
            </div>
            <div className="p-4 flex gap-3 border-t border-[#333333]">
              <button
                onClick={() => {
                  setSelected(null);
                  setAction(null);
                  setNotes('');
                }}
                className="flex-1 py-2 rounded-xl border border-[#333333] text-gray-400 font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={action === 'approve' ? handleApprove : handleReject}
                disabled={!notes.trim() || submitting}
                className={`flex-1 py-2 rounded-xl font-bold ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-500 text-white disabled:opacity-50'
                    : 'bg-red-600/80 hover:bg-red-500/80 text-white disabled:opacity-50'
                }`}
              >
                {submitting ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServiceRequests;
