import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  listStockRequestsForAdmin,
  listStockRequestsForEngineer,
  createStockRequest,
  updateStockRequest,
  deleteStockRequest,
  type StockRequestRow,
  type StockRequestStatus,
} from '../lib/stockRequests';
import type { User } from '../types';

const STATUS_OPTIONS: { value: StockRequestStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'delivered', label: 'Delivered' },
];

const STATUS_COLORS: Record<StockRequestStatus, string> = {
  pending: 'bg-amber-900/30 text-amber-400',
  ordered: 'bg-blue-900/30 text-blue-400',
  delivered: 'bg-green-900/30 text-green-400',
};

interface OutletContext {
  user: User;
}

const AdminStockRequests: React.FC = () => {
  const { user } = useOutletContext<OutletContext>();
  const isAdmin = user.role === 'ADMIN';

  const [requests, setRequests] = useState<StockRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<StockRequestStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StockRequestRow | null>(null);
  const [addForm, setAddForm] = useState({
    item_description: '',
    quantity: '',
    site_or_job: '',
    notes: '',
  });
  const [editForm, setEditForm] = useState<Partial<StockRequestRow>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin
        ? await listStockRequestsForAdmin()
        : await listStockRequestsForEngineer(user.id);
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [isAdmin, user.id]);

  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.item_description.trim()) {
      setError('Please enter what you need.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createStockRequest({
        requested_by: user.id,
        item_description: addForm.item_description.trim(),
        quantity: addForm.quantity.trim() || undefined,
        site_or_job: addForm.site_or_job.trim() || undefined,
        notes: addForm.notes.trim() || undefined,
      });
      setShowAddModal(false);
      setAddForm({ item_description: '', quantity: '', site_or_job: '', notes: '' });
      await fetchRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    setError(null);
    try {
      const updates: Parameters<typeof updateStockRequest>[1] = {
        item_description: editForm.item_description ?? selectedRequest.item_description,
        quantity: editForm.quantity !== undefined ? editForm.quantity : selectedRequest.quantity,
        site_or_job: editForm.site_or_job !== undefined ? editForm.site_or_job : selectedRequest.site_or_job,
        notes: editForm.notes !== undefined ? editForm.notes : selectedRequest.notes,
      };
      if (isAdmin) {
        if (editForm.status != null) updates.status = editForm.status;
        if (editForm.admin_notes !== undefined) updates.admin_notes = editForm.admin_notes;
      }
      await updateStockRequest(selectedRequest.id, updates);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this stock request?')) return;
    try {
      await deleteStockRequest(id);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete request');
    }
  };

  const canEditStatus = isAdmin;
  const canEditRequest = (r: StockRequestRow) => isAdmin || r.requested_by === user.id;

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-4" />
        <p>Loading stock requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F2C200]">Stock Requests</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isAdmin
              ? 'View and manage all stock requests. Update status and admin notes.'
              : 'Request items you need for your site. Status is updated by admin.'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#F2C200] text-black px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"
        >
          <i className="fas fa-plus" />
          <span>New request</span>
        </button>
      </header>

      {error && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StockRequestStatus | 'all')}
            className="px-4 py-2 bg-[#111111] border border-[#333333] rounded-xl text-sm text-white focus:ring-1 focus:ring-[#F2C200] outline-none"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead className="bg-[#1A1A1A] border-b border-[#333333]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Site / Job</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              {isAdmin && (
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Requested by</th>
              )}
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {filteredRequests.map((req) => (
              <tr key={req.id} className="hover:bg-white/5">
                <td className="px-6 py-4 font-bold text-white">{req.item_description}</td>
                <td className="px-6 py-4 text-gray-300">{req.quantity || '—'}</td>
                <td className="px-6 py-4 text-gray-300">{req.site_or_job || '—'}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[req.status]}`}
                  >
                    {req.status}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {req.requested_by === user.id ? 'You' : req.requested_by.slice(0, 8) + '…'}
                  </td>
                )}
                <td className="px-6 py-4 text-xs text-gray-500">
                  {new Date(req.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {canEditRequest(req) && (
                    <button
                      onClick={() => {
                        setSelectedRequest(req);
                        setEditForm({
                          item_description: req.item_description,
                          quantity: req.quantity ?? '',
                          site_or_job: req.site_or_job ?? '',
                          notes: req.notes ?? '',
                          status: req.status,
                          admin_notes: req.admin_notes ?? '',
                        });
                      }}
                      className="p-2 text-[#F2C200] hover:bg-[#F2C200]/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <i className="fas fa-pencil-alt" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRequests.length === 0 && (
          <div className="p-12 text-center text-gray-500 font-bold text-sm">
            No stock requests yet. Add a request for items you need.
          </div>
        )}
      </div>

      {/* Add request modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">New stock request</h2>
              <button onClick={() => setShowAddModal(false)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">What you need *</label>
                <input
                  type="text"
                  value={addForm.item_description}
                  onChange={(e) => setAddForm({ ...addForm, item_description: e.target.value })}
                  placeholder="e.g. Grease filter cartridges, duct tape"
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quantity</label>
                <input
                  type="text"
                  value={addForm.quantity}
                  onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                  placeholder="e.g. 2 boxes, 5 units"
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Site / Job</label>
                <input
                  type="text"
                  value={addForm.site_or_job}
                  onChange={(e) => setAddForm({ ...addForm, site_or_job: e.target.value })}
                  placeholder="Optional: site name or job ref"
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Notes</label>
                <textarea
                  rows={2}
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Urgency, delivery preference..."
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold border border-[#333333] text-gray-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl font-black bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-70"
                >
                  {submitting ? <i className="fas fa-spinner fa-spin" /> : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit request modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit request</h2>
              <button onClick={() => setSelectedRequest(null)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">What you need *</label>
                <input
                  type="text"
                  value={editForm.item_description ?? selectedRequest.item_description}
                  onChange={(e) => setEditForm({ ...editForm, item_description: e.target.value })}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quantity</label>
                <input
                  type="text"
                  value={editForm.quantity ?? selectedRequest.quantity ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Site / Job</label>
                <input
                  type="text"
                  value={editForm.site_or_job ?? selectedRequest.site_or_job ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, site_or_job: e.target.value })}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes ?? selectedRequest.notes ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
                />
              </div>

              {/* Status: admin only */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Status {!canEditStatus && '(read-only)'}
                </label>
                {canEditStatus ? (
                  <select
                    value={editForm.status ?? selectedRequest.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StockRequestStatus })}
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className={`w-full p-4 rounded-xl inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[selectedRequest.status]}`}
                  >
                    {selectedRequest.status}
                  </div>
                )}
              </div>

              {/* Admin notes: admin only */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Admin notes</label>
                  <textarea
                    rows={3}
                    value={editForm.admin_notes ?? selectedRequest.admin_notes ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                    placeholder="Order ref, ETA, delivery notes..."
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {canEditRequest(selectedRequest) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedRequest.id)}
                    className="px-4 py-3 rounded-xl font-bold border border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl font-black bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-70"
                >
                  {submitting ? <i className="fas fa-spinner fa-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStockRequests;
