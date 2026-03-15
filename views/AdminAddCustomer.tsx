import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createCustomer } from '../lib/auth';
import { updateLead } from '../lib/leads';
import type { LeadRow } from '../lib/leads';
import { LOGO, BRAND_NAME } from '../constants';

const AdminAddCustomer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fromLead = (location.state as { fromLead?: LeadRow } | null)?.fromLead;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (fromLead) {
      setForm({
        name: fromLead.name || '',
        email: fromLead.email || '',
        phone: fromLead.phone || '',
        address: '',
      });
    }
  }, [fromLead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!form.name.trim()) {
      setError('Please enter the customer name.');
      return;
    }
    if (!form.email.trim()) {
      setError('Please enter the customer email.');
      return;
    }
    setLoading(true);
    try {
      const result = await createCustomer({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      if (result.success) {
        if (fromLead && result.user) {
          try {
            await updateLead(fromLead.id, {
              status: 'converted',
              customer_id: result.user.id,
            });
          } catch {
            // non-blocking
          }
        }
        setSuccess(true);
        setForm({ name: '', email: '', phone: '', address: '' });
        if (fromLead) {
          navigate('/dashboard/leads', { replace: true, state: {} });
        }
      } else {
        setError(result.error || 'Failed to add customer.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-[#F2C200]">Add Customer</h1>
        <p className="text-gray-500 text-sm mt-1">
          Add a new customer and send them an email to register their password.
        </p>
      </header>

      <div className="max-w-xl">
        <div className="bg-[#111111] rounded-2xl border border-[#333333] p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-black rounded-xl border border-[#333333]">
              {LOGO('w-12 h-auto')}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{BRAND_NAME}</h2>
              <p className="text-xs text-gray-500">New customer registration</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-green-900/30 border border-green-800/50 text-green-400 text-sm">
              <i className="fas fa-check-circle mr-2" />
              Customer added. An email has been sent to them to set their password.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name or business name"
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="customer@example.com"
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">They will receive an invite email to set their password.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07123 456 789"
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Address</label>
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full address"
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-black uppercase tracking-widest bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-70 transition-all"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" />
                  Adding customer...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus mr-2" />
                  Add Customer & Send Invite
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAddCustomer;
