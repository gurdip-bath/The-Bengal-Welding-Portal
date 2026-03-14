import React, { useState, useEffect } from 'react';
import { listAllWarrantyClaims, updateWarrantyClaimStatus, type WarrantyClaimRow } from '../lib/warrantyClaims';
import { COLORS } from '../constants';

const AdminWarrantyClaims: React.FC = () => {
  const [claims, setClaims] = useState<WarrantyClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WarrantyClaimRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAllWarrantyClaims();
      setClaims(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load warranty claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleUpdateStatus = async () => {
    if (!selected || !newStatus) return;
    setSubmitting(true);
    try {
      await updateWarrantyClaimStatus(selected.id, newStatus, adminNotes);
      setSelected(null);
      setAdminNotes('');
      setNewStatus('');
      await fetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    submitted: 'bg-amber-900/30 text-amber-400',
    under_review: 'bg-[#FFF9E6]/20 text-[#B28900]',
    approved: 'bg-green-900/30 text-green-400',
    rejected: 'bg-red-900/30 text-red-400',
    resolved: 'bg-green-900/30 text-green-400',
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-4"></i>
        <p>Loading warranty claims...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/20 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#F2C200]">Warranty Claims</h1>
        <p className="text-gray-500 text-sm">Manage customer warranty claims and update status.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {claims.length === 0 ? (
          <div className="p-8 bg-[#111111] rounded-xl border border-[#333333] text-center text-gray-500">
            No warranty claims found.
          </div>
        ) : (
          claims.map((c) => (
            <div
              key={c.id}
              className="bg-[#111111] p-5 rounded-xl border border-[#333333] hover:border-[#333333]/80 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-white">{c.product_name || `Job ${c.job_id}`}</h3>
                  {c.gar_code && <span className="text-xs text-[#F2C200]">GAR: {c.gar_code}</span>}
                  <p className="text-xs text-gray-500 mt-1">{c.contact_email || c.contact_phone || '—'}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${statusColors[c.status] || 'bg-gray-700 text-gray-400'}`}>
                  {c.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{c.description}</p>
              <p className="text-[10px] text-gray-600">Submitted {new Date(c.created_at).toLocaleString()} • Job: {c.job_id}</p>
              {c.admin_notes && (
                <p className="text-xs text-gray-500 mt-2 italic">Admin notes: {c.admin_notes}</p>
              )}
              <button
                onClick={() => {
                  setSelected(c);
                  setAdminNotes(c.admin_notes || '');
                  setNewStatus(c.status);
                }}
                className="mt-3 px-4 py-2 rounded-lg text-sm font-bold bg-[#F2C200] text-black hover:brightness-110 transition-all"
              >
                Update Status
              </button>
            </div>
          ))
        )}
      </div>

      {/* Update modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-lg font-bold">Update Warranty Claim</h2>
              <button onClick={() => { setSelected(null); setAdminNotes(''); setNewStatus(''); }} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Admin Notes</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200] resize-none"
                  placeholder="Internal notes..."
                />
              </div>
              <button
                onClick={handleUpdateStatus}
                disabled={submitting}
                className="w-full bg-[#F2C200] text-black py-3 rounded-xl font-bold hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWarrantyClaims;
