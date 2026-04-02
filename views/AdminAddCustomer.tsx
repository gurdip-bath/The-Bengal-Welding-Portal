import React, { useState, useEffect } from 'react';
import PhoneCallButton from '../components/PhoneCallButton';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { createCustomer } from '../lib/auth';
import { updateLead } from '../lib/leads';
import type { LeadRow } from '../lib/leads';
import { LOGO, BRAND_NAME } from '../constants';
import { useOutletContext } from 'react-router-dom';
import type { CustomerAttachment, CustomerAttachmentKind, User } from '../types';
import { supabase } from '../lib/supabase';

const AdminAddCustomer: React.FC = () => {
  const { user } = useOutletContext<{ user: User }>();
  if (user.role === 'ENGINEER') {
    return <Navigate to="/dashboard" replace />;
  }
  const location = useLocation();
  const navigate = useNavigate();
  const fromLead = (location.state as { fromLead?: LeadRow } | null)?.fromLead;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    companyName: '',
    vatNumber: '',
    accountType: '' as '' | 'credit' | 'cash',
    balance: '0',
    customerType: '' as '' | 'trade' | 'retail',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [attachmentWarning, setAttachmentWarning] = useState<string>('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingUploading, setPendingUploading] = useState(false);

  useEffect(() => {
    if (fromLead) {
      setForm({
        name: fromLead.name || '',
        email: fromLead.email || '',
        phone: fromLead.phone || '',
        address: '',
        companyName: '',
        vatNumber: '',
        accountType: '',
        balance: '0',
        customerType: '',
        notes: '',
      });
    }
  }, [fromLead]);

  const handleSubmit = async (e: React.FormEvent, sendInvite = false) => {
    e.preventDefault();
    setError('');
    setAttachmentWarning('');
    setSuccess(false);
    if (!form.name.trim()) {
      setError('Please enter the customer name.');
      return;
    }
    if (sendInvite && !form.email.trim()) {
      setError('A valid email is required to send an invite.');
      return;
    }
    setLoading(true);
    try {
      const result = await createCustomer({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        companyName: form.companyName.trim() || undefined,
        vatNumber: form.vatNumber.trim() || undefined,
        accountType: form.accountType || null,
        balance: Number.isFinite(Number(form.balance)) ? Number(form.balance) : 0,
        customerType: form.customerType || null,
        completed: false,
        sendInvite,
        notes: form.notes.trim() || null,
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

        // Optional: upload attachments after customer is created (never blocks creation)
        if (result.user?.id && pendingFiles.length > 0) {
          const CUSTOMER_ATTACHMENTS_BUCKET = 'customer-attachments';
          const MAX_FILE_MB = 50;

          const toAttachmentKind = (file: File): CustomerAttachmentKind => {
            if (file.type === 'application/pdf') return 'pdf';
            if (file.type.startsWith('image/')) return 'image';
            if (file.type.startsWith('video/')) return 'video';
            return 'file';
          };

          const safeFileName = (name: string) =>
            name
              .trim()
              .replace(/[^\w.\- ]+/g, '')
              .replace(/\s+/g, '-')
              .slice(0, 120) || 'file';

          const generateAttachmentPath = (customerId: string, fileName: string) => {
            const cleaned = safeFileName(fileName);
            const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            return `${customerId}/${slug}-${cleaned}`;
          };

          setPendingUploading(true);
          try {
            const overLimit = pendingFiles.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
            if (overLimit) {
              throw new Error(`Each attachment must be ${MAX_FILE_MB} MB or smaller.`);
            }
            const created: CustomerAttachment[] = [];
            for (const file of pendingFiles) {
              const path = generateAttachmentPath(result.user.id, file.name);
              const { error: uploadError } = await supabase.storage
                .from(CUSTOMER_ATTACHMENTS_BUCKET)
                .upload(path, file, { cacheControl: '3600', upsert: false });
              if (uploadError) throw new Error(uploadError.message || 'Upload failed');
              const { data } = supabase.storage.from(CUSTOMER_ATTACHMENTS_BUCKET).getPublicUrl(path);
              created.push({
                kind: toAttachmentKind(file),
                path,
                url: data.publicUrl,
                name: file.name,
                mime: file.type || undefined,
                size: file.size || undefined,
                uploadedAt: new Date().toISOString(),
              });
            }
            const { error: saveError } = await supabase
              .from('profiles')
              .update({ attachments: created })
              .eq('id', result.user.id);
            if (saveError) throw new Error(saveError.message || 'Failed to save attachments');
            setPendingFiles([]);
          } catch (err) {
            setAttachmentWarning(
              err instanceof Error
                ? `Customer created, but attachments failed: ${err.message}`
                : 'Customer created, but attachments failed.'
            );
          } finally {
            setPendingUploading(false);
          }
        }

        setSuccess(true);
        setForm({
          name: '',
          email: '',
          phone: '',
          address: '',
          companyName: '',
          vatNumber: '',
          accountType: '',
          balance: '0',
          customerType: '',
          notes: '',
        });
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

  const handleInviteClick = async () => {
    const fakeEvent = { preventDefault: () => undefined } as React.FormEvent;
    await handleSubmit(fakeEvent, true);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-[#F2C200]">Add Customer</h1>
        <p className="text-gray-500 text-sm mt-1">
          Add a new customer now and update contact details anytime.
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
              Customer has been successfully added.
            </div>
          )}
          {attachmentWarning && (
            <div className="mb-4 p-3 rounded-xl bg-amber-900/20 border border-amber-800/40 text-amber-300 text-sm font-bold">
              <i className="fas fa-triangle-exclamation mr-2" />
              {attachmentWarning}
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
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
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="customer@example.com"
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">Add email now if available, or leave blank and update later.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Phone</label>
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="07123 456 789"
                  className="w-full min-w-0 flex-1 p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
                <PhoneCallButton phone={form.phone} size="sm" />
              </div>
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
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Notes</label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes (optional)"
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Company Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">VAT Number</label>
              <input
                type="text"
                value={form.vatNumber}
                onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Account Type</label>
                <select
                  value={form.accountType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      accountType: e.target.value === 'credit' || e.target.value === 'cash' ? e.target.value : '',
                    })
                  }
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                >
                  <option value="">None</option>
                  <option value="credit">Credit</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Customer Type</label>
                <select
                  value={form.customerType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customerType: e.target.value === 'trade' || e.target.value === 'retail' ? e.target.value : '',
                    })
                  }
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
                >
                  <option value="">None</option>
                  <option value="trade">Trade</option>
                  <option value="retail">Retail</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Attachments (optional)</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                disabled={loading || pendingUploading}
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setPendingFiles(files);
                }}
                className="block w-full text-sm text-gray-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#F2C200] file:text-black hover:file:brightness-110 cursor-pointer disabled:opacity-60"
              />
              <p className="mt-1 text-[10px] text-gray-500 font-bold">
                {pendingFiles.length > 0 ? `${pendingFiles.length} file(s) selected` : 'You can add files now or later via Customers → Edit.'}
              </p>
              {pendingUploading && (
                <p className="mt-1 text-[10px] text-gray-400 font-bold">
                  <i className="fas fa-spinner fa-spin mr-2" />
                  Uploading attachments...
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="submit"
                disabled={loading || pendingUploading}
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
                    Add Customer
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={loading || pendingUploading}
                onClick={() => {
                  void handleInviteClick();
                }}
                className="w-full py-4 rounded-xl font-black uppercase tracking-widest bg-black border border-[#F2C200] text-[#F2C200] hover:bg-[#1A1A1A] disabled:opacity-70 transition-all"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2" />
                    Sending invite...
                  </>
                ) : (
                  <>
                    <i className="fas fa-envelope mr-2" />
                    Add &amp; Send Invite
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAddCustomer;
