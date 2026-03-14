import React, { useState, useEffect } from 'react';
import {
  listInstallationSites,
  createInstallationSite,
  updateInstallationSite,
  deleteInstallationSite,
  type InstallationSite,
  type InstallationSiteInsert,
} from '../lib/installationSites';

const AdminSites: React.FC = () => {
  const [sites, setSites] = useState<InstallationSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSite, setEditingSite] = useState<InstallationSite | null>(null);
  const [form, setForm] = useState<InstallationSiteInsert>({
    site_name: '',
    address: '',
    postcode: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    notes: '',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSites = () => {
    setLoading(true);
    listInstallationSites()
      .then(setSites)
      .catch(() => setSites([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSites();
  }, []);

  const matchesSearch = (s: InstallationSite) =>
    !searchQuery ||
    s.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.postcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

  const filteredSites = sites.filter(matchesSearch);

  const openAdd = () => {
    setEditingSite(null);
    setForm({
      site_name: '',
      address: '',
      postcode: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      notes: '',
    });
    setSubmitError(null);
    setShowAddModal(true);
  };

  const openEdit = (s: InstallationSite) => {
    setEditingSite(s);
    setForm({
      site_name: s.site_name,
      address: s.address,
      postcode: s.postcode,
      contact_name: s.contact_name,
      contact_phone: s.contact_phone,
      contact_email: s.contact_email ?? '',
      notes: s.notes ?? '',
    });
    setSubmitError(null);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingSite(null);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!form.site_name.trim()) {
      setSubmitError('Site name is required');
      return;
    }
    if (!form.address.trim()) {
      setSubmitError('Address is required');
      return;
    }
    if (!form.postcode.trim()) {
      setSubmitError('Postcode is required');
      return;
    }
    if (!form.contact_name.trim()) {
      setSubmitError('Contact name is required');
      return;
    }
    if (!form.contact_phone.trim()) {
      setSubmitError('Contact number is required');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: InstallationSiteInsert = {
        site_name: form.site_name.trim(),
        address: form.address.trim(),
        postcode: form.postcode.trim(),
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email?.trim() || null,
        notes: form.notes?.trim() || null,
      };

      if (editingSite) {
        await updateInstallationSite(editingSite.id, payload);
      } else {
        await createInstallationSite(payload);
      }
      closeModal();
      loadSites();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save site');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (s: InstallationSite) => {
    if (!window.confirm(`Delete site "${s.site_name}"?`)) return;
    try {
      await deleteInstallationSite(s.id);
      loadSites();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
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
            <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Sites</h1>
            <p className="text-gray-500 text-sm font-bold mt-0.5">
              {sites.length} installation site{sites.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F2C2001A] shrink-0"
          >
            <i className="fas fa-plus"></i>
            <span>Add Site</span>
          </button>
        </div>
        <div className="relative w-full max-w-md">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
          <input
            type="text"
            placeholder="Search by site, address, postcode, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
          />
        </div>
      </div>

      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-bold text-sm">Loading...</div>
        ) : (
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-[#1A1A1A] border-b border-[#333333]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Site</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {filteredSites.map((s) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-white">{s.site_name}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{s.postcode}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-300">{s.address}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-white">{s.contact_name}</p>
                      <p className="text-[10px] text-gray-500">{s.contact_phone}</p>
                      {s.contact_email && (
                        <p className="text-[10px] text-gray-500">{s.contact_email}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-gray-500 hover:text-[#F2C200] transition-colors"
                        title="Edit Site"
                      >
                        <i className="fas fa-pen"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filteredSites.length === 0 && (
          <div className="p-12 text-center text-gray-500 font-bold text-sm">
            {sites.length === 0 ? 'No sites yet. Click Add Site to create one.' : 'No sites match your search.'}
          </div>
        )}
      </div>

      {/* Add/Edit Site Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[600] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editingSite ? 'Edit Site' : 'Add Site'}</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white p-1 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {submitError && (
                <div className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-sm font-bold">
                  {submitError}
                </div>
              )}
              <div>
                <label className={labelClass}>Site Name *</label>
                <input
                  type="text"
                  value={form.site_name}
                  onChange={(e) => setForm({ ...form, site_name: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Mick's Café"
                />
              </div>
              <div>
                <label className={labelClass}>Address *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={inputClass}
                  placeholder="101 Ragland Road"
                />
              </div>
              <div>
                <label className={labelClass}>Postcode *</label>
                <input
                  type="text"
                  value={form.postcode}
                  onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                  className={inputClass}
                  placeholder="B66 3ND"
                />
              </div>
              <div>
                <label className={labelClass}>Contact Name *</label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Mick"
                />
              </div>
              <div>
                <label className={labelClass}>Contact Number *</label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className={inputClass}
                  placeholder="07123456789"
                />
              </div>
              <div>
                <label className={labelClass}>Contact Email</label>
                <input
                  type="email"
                  value={form.contact_email || ''}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  className={inputClass}
                  placeholder="mick@example.com"
                />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`${inputClass} resize-none`}
                  placeholder="What jobs are on there, what is required..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-transparent border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-60 transition-colors shadow-lg shadow-[#F2C2001A]"
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-sm"></i>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-check text-sm"></i>
                    <span>{editingSite ? 'Update Site' : 'Add Site'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSites;
