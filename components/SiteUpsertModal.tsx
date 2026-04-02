import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  createInstallationSite,
  updateInstallationSite,
  deleteInstallationSite,
  type InstallationSite,
  type InstallationSiteInsert,
} from '../lib/installationSites';
import { createCustomer, deleteUser, updateCustomer } from '../lib/auth';
import { useAdmin } from '../contexts/AdminContext';
import PhoneCallButton from './PhoneCallButton';
import type { Job } from '../types';

const MAX_MEDIA_FILES = 10;
const MAX_FILE_MB = 10;

/** Single address line for portal customer (site address + postcode). */
function customerAddressFromSite(address: string, postcode: string): string {
  const a = address.trim();
  const p = postcode.trim();
  if (!p) return a;
  if (!a) return p;
  return `${a}, ${p}`;
}

async function syncLinkedCustomerFromSite(
  linkedCustomerId: string,
  site: InstallationSite
): Promise<{ success: boolean; error?: string }> {
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('company_name, vat_number, account_type, balance, customer_type, completed, notes')
    .eq('id', linkedCustomerId)
    .maybeSingle();
  if (pErr) return { success: false, error: pErr.message };

  const addr = customerAddressFromSite(site.address, site.postcode);
  const at = profile?.account_type;
  const ct = profile?.customer_type;
  const result = await updateCustomer({
    userId: linkedCustomerId,
    name: site.site_name,
    address: addr,
    phone: site.contact_phone,
    email: site.contact_email?.trim() || '',
    companyName: (profile?.company_name as string | undefined) ?? '',
    vatNumber: (profile?.vat_number as string | undefined) ?? '',
    accountType: at === 'credit' || at === 'cash' ? at : null,
    balance: profile?.balance != null && Number.isFinite(Number(profile.balance)) ? Number(profile.balance) : 0,
    customerType: ct === 'trade' || ct === 'retail' ? ct : null,
    completed: Boolean(profile?.completed),
    notes: profile?.notes != null ? String(profile.notes) : null,
  });
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

type Props = {
  open: boolean;
  mode: 'add' | 'edit';
  initialSite?: InstallationSite | null;
  onClose: () => void;
  onSaved?: (site: InstallationSite) => void;
};

export default function SiteUpsertModal({ open, mode, initialSite, onClose, onSaved }: Props) {
  const isEdit = mode === 'edit';
  const { jobs, setJobs, saveJob, refreshJobs } = useAdmin();

  const [form, setForm] = useState<InstallationSiteInsert>(() => ({
    site_name: initialSite?.site_name ?? '',
    address: initialSite?.address ?? '',
    postcode: initialSite?.postcode ?? '',
    contact_name: initialSite?.contact_name ?? '',
    contact_phone: initialSite?.contact_phone ?? '',
    contact_email: initialSite?.contact_email ?? '',
    notes: initialSite?.notes ?? '',
    equipment_required: initialSite?.equipment_required ?? '',
    media: initialSite?.media ?? [],
  }));

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<
    { type: 'image' | 'video'; url: string; name?: string } | null
  >(null);

  const existingJobForSite = useMemo(() => {
    const siteId = initialSite?.id;
    if (!siteId) return null;
    const direct = jobs.find((j) => j.id === siteId) || null;
    if (direct) return direct;
    const matches = jobs.filter((j) => j.customerId === siteId);
    if (matches.length === 0) return null;
    return matches.reduce<Job>((best, j) => {
      const bestKey = (best.startDate || best.warrantyEndDate || '').slice(0, 10);
      const jKey = (j.startDate || j.warrantyEndDate || '').slice(0, 10);
      return jKey > bestKey ? j : best;
    }, matches[0]);
  }, [initialSite?.id, jobs]);

  const [jobDates, setJobDates] = useState<{ startDate: string; warrantyEndDate: string }>({
    startDate: '',
    warrantyEndDate: '',
  });

  const inputClass =
    'w-full px-4 py-2.5 bg-[#111111] border border-[#333333] rounded-lg text-white text-sm focus:outline-none focus:border-[#F2C200] focus:ring-1 focus:ring-[#F2C200]/30';
  const labelClass = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  // When a different site is opened for edit, sync form.
  useEffect(() => {
    if (!open) return;
    setForm({
      site_name: initialSite?.site_name ?? '',
      address: initialSite?.address ?? '',
      postcode: initialSite?.postcode ?? '',
      contact_name: initialSite?.contact_name ?? '',
      contact_phone: initialSite?.contact_phone ?? '',
      contact_email: initialSite?.contact_email ?? '',
      notes: initialSite?.notes ?? '',
      equipment_required: initialSite?.equipment_required ?? '',
      media: initialSite?.media ?? [],
    });
    setJobDates({
      startDate: existingJobForSite?.startDate?.slice(0, 10) || '',
      warrantyEndDate: existingJobForSite?.warrantyEndDate?.slice(0, 10) || '',
    });
    setSubmitError(null);
    setUploadError(null);
  }, [open, initialSite?.id, existingJobForSite?.id]);

  if (!open) return null;

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
        equipment_required: form.equipment_required?.trim() || null,
        media: form.media ?? [],
      };

      let saved: InstallationSite;
      if (isEdit) {
        if (!initialSite?.id) throw new Error('No site selected to edit');
        saved = await updateInstallationSite(initialSite.id, payload);
        if (initialSite.linked_customer_id) {
          const sync = await syncLinkedCustomerFromSite(initialSite.linked_customer_id, saved);
          if (!sync.success) {
            setSubmitError(
              `Site was saved, but syncing to the linked portal customer failed: ${sync.error ?? 'Unknown error'}. You can try saving again.`
            );
            setSubmitting(false);
            return;
          }
        }
      } else {
        saved = await createInstallationSite(payload);
        const cust = await createCustomer({
          name: saved.site_name,
          address: customerAddressFromSite(saved.address, saved.postcode),
          phone: saved.contact_phone,
          email: saved.contact_email?.trim() || undefined,
          sendInvite: false,
        });
        if (!cust.success || !cust.user) {
          await deleteInstallationSite(saved.id);
          throw new Error(
            cust.error ||
              'Could not create the portal customer. The site was not saved. If this email is already in use, choose another.'
          );
        }
        try {
          saved = await updateInstallationSite(saved.id, { linked_customer_id: cust.user.id });
        } catch (linkErr) {
          await deleteInstallationSite(saved.id);
          await deleteUser(cust.user.id);
          throw linkErr instanceof Error ? linkErr : new Error('Failed to link customer to site');
        }
      }

      const shouldUpsertJobDates =
        jobDates.startDate.trim() !== '' ||
        jobDates.warrantyEndDate.trim() !== '' ||
        !!existingJobForSite;

      if (shouldUpsertJobDates) {
        const base: Job =
          existingJobForSite ??
          ({
            id: saved.id,
            title: `${saved.site_name} — Renewal`,
            description: 'Renewal',
            customerId: saved.id,
            customerName: saved.site_name,
            customerAddress: saved.address,
            customerPostcode: saved.postcode,
            contactName: saved.contact_name,
            customerPhone: saved.contact_phone,
            customerEmail: saved.contact_email ?? undefined,
            status: 'PENDING',
            startDate: '',
            warrantyEndDate: '',
            scheduledCleanDate: undefined,
            paymentStatus: 'UNPAID',
            amount: 0,
          } as Job);

        const merged: Job = {
          ...base,
          customerId: saved.id,
          customerName: saved.site_name,
          customerAddress: saved.address,
          customerPostcode: saved.postcode,
          contactName: saved.contact_name,
          customerPhone: saved.contact_phone,
          customerEmail: saved.contact_email ?? undefined,
          startDate: jobDates.startDate.trim(),
          warrantyEndDate: jobDates.warrantyEndDate.trim(),
        };

        // Keep local UI in sync immediately.
        setJobs((prev) => {
          const idx = prev.findIndex((j) => j.id === merged.id);
          if (idx >= 0) return prev.map((j) => (j.id === merged.id ? merged : j));
          return [merged, ...prev];
        });

        try {
          if (saveJob) {
            await saveJob(merged);
          } else if (refreshJobs) {
            await refreshJobs();
          }
        } catch {
          // ignore; next refresh reconciles
        }
      }

      onSaved?.(saved);
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save site');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const currentCount = (form.media ?? []).length;
    if (currentCount + files.length > MAX_MEDIA_FILES) {
      setUploadError(`You can attach up to ${MAX_MEDIA_FILES} files per site.`);
      return;
    }

    const overLimit = Array.from(files).find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (overLimit) {
      setUploadError(`Each file must be ${MAX_FILE_MB} MB or smaller.`);
      return;
    }

    setUploading(true);
    try {
      const newMedia: { type: 'image' | 'video'; url: string; name?: string }[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `site-temp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('installation-site-media')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadError) {
          throw uploadError;
        }
        const { data } = supabase.storage.from('installation-site-media').getPublicUrl(path);
        const url = data.publicUrl;
        const type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
        newMedia.push({ type, url, name: file.name });
      }
      setForm((prev) => ({
        ...prev,
        media: [...(prev.media ?? []), ...newMedia],
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[600] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        <div className="p-6 border-b border-[#333333] flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{isEdit ? 'Edit Site' : 'Add Site'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {submitError && (
            <div className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-sm font-bold">
              {submitError}
            </div>
          )}
          {!isEdit && (
            <p className="text-xs text-gray-400 leading-relaxed">
              A portal customer is created from this site (no email invite). You can send an invite later from{' '}
              <span className="text-gray-300">Customers</span>.
            </p>
          )}
          {isEdit && initialSite?.linked_customer_id && (
            <p className="text-xs text-amber-200/90 bg-amber-950/40 border border-amber-800/40 rounded-lg px-3 py-2 leading-relaxed">
              Site name, address, and contact details sync to the linked portal customer when you save.
            </p>
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
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className={`${inputClass} flex-1 min-w-0`}
                placeholder="07123456789"
              />
              <PhoneCallButton phone={form.contact_phone} size="sm" />
            </div>
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
            <label className={labelClass}>What is required on this site (equipment, access, etc.)</label>
            <textarea
              rows={3}
              value={form.equipment_required || ''}
              onChange={(e) => setForm({ ...form, equipment_required: e.target.value })}
              className={`${inputClass} resize-none`}
              placeholder="List required equipment, access notes, special considerations..."
            />
          </div>
          <div className="pt-2 border-t border-[#333333]">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scheduling</p>
          </div>
          <div>
            <label className={labelClass}>Photos / Videos (optional)</label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              className="block w-full text-sm text-gray-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#F2C200] file:text-black hover:file:brightness-110 cursor-pointer"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Up to {MAX_MEDIA_FILES} files. Max {MAX_FILE_MB} MB per file.
            </p>
            {uploadError && <p className="mt-1 text-xs text-red-400 font-bold">{uploadError}</p>}
            {uploading && <p className="mt-1 text-xs text-gray-400 font-bold">Uploading files...</p>}
            {form.media && form.media.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-gray-400 font-bold">Attached files (click to view):</p>
                <div className="grid grid-cols-3 gap-2">
                  {form.media.map((m, idx) => (
                    <button
                      key={`${m.url}-${idx}`}
                      type="button"
                      onClick={() => setMediaPreview(m)}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-[#333333] hover:border-[#F2C200] transition-colors"
                    >
                      {m.type === 'image' ? (
                        <img src={m.url} alt={m.name || 'Site media'} className="w-full h-full object-cover" />
                      ) : (
                        <video src={m.url} className="w-full h-full object-cover" muted />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white transition-opacity">
                        View {m.type === 'image' ? 'Image' : 'Video'}
                      </div>
                    </button>
                  ))}
                </div>
                <ul className="space-y-0.5 text-[11px] text-gray-400">
                  {form.media.map((m, idx) => (
                    <li key={`name-${m.url}-${idx}`} className="truncate">
                      <span className="uppercase mr-1 text-[#F2C200]">[{m.type}]</span>
                      {m.name || m.url}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="p-6 border-t border-[#333333] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
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
                <span>{isEdit ? 'Update Site' : 'Add Site'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {mediaPreview && (
        <div className="fixed inset-0 bg-black/90 z-[700] flex items-center justify-center p-4" onClick={() => setMediaPreview(null)}>
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {mediaPreview.type === 'image' ? (
              <img src={mediaPreview.url} alt={mediaPreview.name || 'Site media'} className="max-w-full max-h-[80vh] object-contain" />
            ) : (
              <video src={mediaPreview.url} controls className="max-w-full max-h-[80vh] bg-black" />
            )}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <a
                href={mediaPreview.url}
                download={mediaPreview.name || 'site-media'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 text-xs font-bold text-white hover:bg-black"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="fas fa-download text-xs" />
                <span>Download</span>
              </a>
            </div>
            <button
              onClick={() => setMediaPreview(null)}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-2"
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

