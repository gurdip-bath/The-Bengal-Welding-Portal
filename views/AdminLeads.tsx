import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  type LeadRow,
  type LeadSource,
  type LeadStatus,
} from '../lib/leads';

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'email', label: 'Email' },
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'parked', label: 'Parked' },
  { value: 'converted', label: 'Converted' },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  pending: 'bg-amber-900/30 text-amber-400',
  parked: 'bg-gray-700 text-gray-400',
  converted: 'bg-green-900/30 text-green-400',
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  whatsapp: 'WhatsApp',
  social_media: 'Social Media',
  email: 'Email',
};

const AdminLeads: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [filterSource, setFilterSource] = useState<LeadSource | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [addForm, setAddForm] = useState({
    source: 'whatsapp' as LeadSource,
    name: '',
    phone: '',
    email: '',
    enquiry: '',
  });
  const [editForm, setEditForm] = useState<Partial<LeadRow>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLeads();
      setLeads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter((l) => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (filterSource !== 'all' && l.source !== filterSource) return false;
    return true;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      setError('Please enter the customer name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createLead(addForm);
      setShowAddModal(false);
      setAddForm({ source: 'whatsapp', name: '', phone: '', email: '', enquiry: '' });
      await fetchLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedLead) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateLead(selectedLead.id, editForm);
      setSelectedLead(null);
      await fetchLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await deleteLead(id);
      setSelectedLead(null);
      await fetchLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete lead');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-4" />
        <p>Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F2C200]">Customer Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            Enquiries from WhatsApp, social media, and email. Track status and actions.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#F2C200] text-black px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"
        >
          <i className="fas fa-plus" />
          <span>Add Lead</span>
        </button>
      </header>

      {error && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as LeadSource | 'all')}
          className="px-4 py-2 bg-[#111111] border border-[#333333] rounded-xl text-sm text-white focus:ring-1 focus:ring-[#F2C200] outline-none"
        >
          <option value="all">All sources</option>
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'all')}
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

      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead className="bg-[#1A1A1A] border-b border-[#333333]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Number</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Enquiry</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-white/5">
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-gray-400 uppercase">
                    {SOURCE_LABELS[lead.source]}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-white">{lead.name}</td>
                <td className="px-6 py-4 text-gray-300">{lead.phone || '—'}</td>
                <td className="px-6 py-4 text-gray-300">{lead.email || '—'}</td>
                <td className="px-6 py-4 text-gray-400 max-w-[200px] truncate" title={lead.enquiry || ''}>
                  {lead.enquiry || '—'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[lead.status]}`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    {lead.email?.trim() && (
                      <button
                        onClick={() => navigate('/dashboard/add-customer', { state: { fromLead: lead } })}
                        className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                        title="Add as customer"
                      >
                        <i className="fas fa-user-plus" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedLead(lead);
                        setEditForm({
                          status: lead.status,
                          admin_notes: lead.admin_notes || '',
                        });
                      }}
                      className="p-2 text-[#F2C200] hover:bg-[#F2C200]/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <i className="fas fa-pencil-alt" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLeads.length === 0 && (
          <div className="p-12 text-center text-gray-500 font-bold text-sm">
            No leads found. Add a lead from WhatsApp, social media, or email.
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">Add Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Source *</label>
                <select
                  value={addForm.source}
                  onChange={(e) => setAddForm({ ...addForm, source: e.target.value as LeadSource })}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Name *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Customer name"
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone</label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="07123 456 789"
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Enquiry</label>
                <textarea
                  rows={3}
                  value={addForm.enquiry}
                  onChange={(e) => setAddForm({ ...addForm, enquiry: e.target.value })}
                  placeholder="What the enquiry is about..."
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
                  {submitting ? <i className="fas fa-spinner fa-spin" /> : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">Update Lead</h2>
              <button onClick={() => setSelectedLead(null)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                <select
                  value={editForm.status ?? selectedLead.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LeadStatus })}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Admin Notes</label>
                <textarea
                  rows={4}
                  value={editForm.admin_notes ?? selectedLead.admin_notes ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                  placeholder="Pending actions, follow-up notes..."
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
                />
              </div>
              <div className="flex flex-col gap-3 pt-2">
                {selectedLead.email?.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLead(null);
                      navigate('/dashboard/add-customer', { state: { fromLead: selectedLead } });
                    }}
                    className="w-full py-3 rounded-xl font-bold border border-green-500/50 text-green-400 hover:bg-green-500/10 flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-user-plus" />
                    Add as customer
                  </button>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedLead.id)}
                    className="px-4 py-3 rounded-xl font-bold border border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
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
        </div>
      )}
    </div>
  );
};

export default AdminLeads;
