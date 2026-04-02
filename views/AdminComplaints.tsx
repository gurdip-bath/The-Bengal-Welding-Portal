import React, { useState, useEffect } from 'react';
import { listAllComplaints, updateComplaintStatus, type ComplaintRow } from '../lib/complaints';
import { COLORS } from '../constants';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { User } from '../types';
import PhoneCallButton from '../components/PhoneCallButton';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
      <div className="text-sm text-white mt-1 break-words">{value || <span className="text-gray-500">—</span>}</div>
    </div>
  );
}

const AdminComplaints: React.FC = () => {
  const { user } = useOutletContext<{ user: User }>();
  if (user.role === 'ENGINEER') {
    return <Navigate to="/dashboard" replace />;
  }
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ComplaintRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<ComplaintRow | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAllComplaints();
      setComplaints(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleUpdateStatus = async () => {
    const target = selected || details;
    if (!target || !newStatus) return;
    setSubmitting(true);
    try {
      await updateComplaintStatus(target.id, newStatus, adminNotes);
      setSelected(null);
      setDetails(null);
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
    open: 'bg-amber-900/30 text-amber-400',
    in_progress: 'bg-[#FFF9E6]/20 text-[#B28900]',
    resolved: 'bg-green-900/30 text-green-400',
    closed: 'bg-gray-700 text-gray-400',
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-4"></i>
        <p>Loading complaints...</p>
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
        <h1 className="text-2xl font-bold text-[#F2C200]">Complaints</h1>
        <p className="text-gray-500 text-sm">Manage customer complaints and update status.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {complaints.length === 0 ? (
          <div className="p-8 bg-[#111111] rounded-xl border border-[#333333] text-center text-gray-500">
            No complaints found.
          </div>
        ) : (
          complaints.map((c) => (
            <div
              key={c.id}
              className="bg-[#111111] p-5 rounded-xl border border-[#333333] hover:border-[#333333]/80 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-white">{c.subject || 'Complaint'}</h3>
                  <p className="text-xs text-gray-500 mt-1">{c.customer_name} • {c.contact_email}</p>
                  {c.site_name && <p className="text-xs text-gray-500">{c.site_name}</p>}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${statusColors[c.status] || 'bg-gray-700 text-gray-400'}`}>
                  {c.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{c.description}</p>
              {Array.isArray((c as any).attachments) && (c as any).attachments.length > 0 && (
                <div className="mt-3 mb-3 border border-[#333333] rounded-xl bg-black/30 p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase">Attachment</p>
                    <a
                      href={(c as any).attachments[0].publicUrl}
                      download={(c as any).attachments[0].name}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[#F2C200] hover:brightness-110"
                    >
                      Download
                    </a>
                  </div>
                  {String((c as any).attachments[0].mime || '').startsWith('video/') ? (
                    <video
                      src={(c as any).attachments[0].publicUrl}
                      controls
                      className="w-full rounded-lg max-h-[320px] bg-black"
                    />
                  ) : (
                    <img
                      src={(c as any).attachments[0].publicUrl}
                      alt={(c as any).attachments[0].name || 'Complaint attachment'}
                      className="w-full rounded-lg max-h-[320px] object-contain bg-black"
                      loading="lazy"
                    />
                  )}
                  <p className="mt-2 text-[11px] text-gray-500 truncate">
                    {(c as any).attachments[0].name}
                  </p>
                </div>
              )}
              <p className="text-[10px] text-gray-600">Submitted {new Date(c.created_at).toLocaleString()}</p>
              {c.admin_notes && (
                <p className="text-xs text-gray-500 mt-2 italic">Admin notes: {c.admin_notes}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setDetails(c);
                    setAdminNotes(c.admin_notes || '');
                    setNewStatus(c.status);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-[#333333] text-white hover:bg-[#444] transition-all"
                >
                  View full details
                </button>
                <button
                  onClick={() => {
                    setSelected(c);
                    setAdminNotes(c.admin_notes || '');
                    setNewStatus(c.status);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-[#F2C200] text-black hover:brightness-110 transition-all"
                >
                  Update Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details modal */}
      {details && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">{details.subject || 'Complaint details'}</h2>
                <p className="text-xs opacity-80 truncate">
                  {details.customer_name} • {details.contact_email} • Submitted {new Date(details.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => { setDetails(null); setAdminNotes(''); setNewStatus(''); }}
                className="text-black hover:opacity-70"
                aria-label="Close"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Customer name" value={details.customer_name} />
                <Field label="Status" value={<span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[details.status] || 'bg-gray-700 text-gray-400'}`}>{details.status.replace('_', ' ')}</span>} />
                <Field label="Site name" value={details.site_name || ''} />
                <Field label="Site address" value={details.site_address || ''} />
                <Field label="Contact email" value={details.contact_email} />
                <Field
                  label="Contact phone"
                  value={
                    details.contact_phone?.trim() ? (
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        <span>{details.contact_phone}</span>
                        <PhoneCallButton phone={details.contact_phone} size="sm" />
                      </span>
                    ) : (
                      ''
                    )
                  }
                />
                <Field label="Complaint type" value={details.complaint_type || ''} />
                <Field label="Date of incident" value={details.date_of_incident ? new Date(details.date_of_incident).toLocaleDateString() : ''} />
                <Field label="Preferred contact" value={details.preferred_contact || ''} />
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</p>
                <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">{details.description}</p>
              </div>

              {Array.isArray((details as any).attachments) && (details as any).attachments.length > 0 && (
                <div className="border border-[#333333] rounded-xl bg-black/30 p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase">Attachment</p>
                    <a
                      href={(details as any).attachments[0].publicUrl}
                      download={(details as any).attachments[0].name}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[#F2C200] hover:brightness-110"
                    >
                      Download
                    </a>
                  </div>
                  {String((details as any).attachments[0].mime || '').startsWith('video/') ? (
                    <video
                      src={(details as any).attachments[0].publicUrl}
                      controls
                      className="w-full rounded-lg max-h-[420px] bg-black"
                    />
                  ) : (
                    <img
                      src={(details as any).attachments[0].publicUrl}
                      alt={(details as any).attachments[0].name || 'Complaint attachment'}
                      className="w-full rounded-lg max-h-[420px] object-contain bg-black"
                      loading="lazy"
                    />
                  )}
                  <p className="mt-2 text-[11px] text-gray-500 truncate">
                    {(details as any).attachments[0].name}
                  </p>
                </div>
              )}

              <div className="border-t border-[#333333]/70 pt-5">
                <h3 className="text-sm font-bold text-[#F2C200] mb-3">Admin response</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Notes (visible to customer)</label>
                    <textarea
                      rows={4}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200] resize-none"
                      placeholder="Write a response the customer can see..."
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setDetails(null); setAdminNotes(''); setNewStatus(''); }}
                      className="px-4 py-2 rounded-lg text-sm font-bold bg-[#333333] text-white hover:bg-[#444]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateStatus}
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-60"
                    >
                      {submitting ? 'Saving...' : 'Save & send to customer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-lg font-bold">Update Complaint</h2>
              <button onClick={() => { setSelected(null); setAdminNotes(''); setNewStatus(''); }} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500">
                This updates the complaint status and the notes the customer will see.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Notes (visible to customer)</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#F2C200] resize-none"
                  placeholder="Write a response the customer can see..."
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

export default AdminComplaints;
