import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import type { Job, User } from '../types';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import {
  listInstallationSites,
  createInstallationSite,
  updateInstallationSite,
  deleteInstallationSite,
  type InstallationSite,
  type InstallationSiteInsert,
} from '../lib/installationSites';
import { supabase } from '../lib/supabase';

const MAX_MEDIA_FILES = 10;
const MAX_FILE_MB = 10;
type SiteStatus = 'OVERDUE' | 'DUE_SOON' | 'ACTIVE_SITE';
const SITE_STATUS_OVERRIDES_KEY = 'bengal_site_status_overrides';

const AdminSites: React.FC = () => {
  const { jobs, setJobs, saveJob, refreshJobs } = useAdmin();
  const { user } = useOutletContext<{ user: User }>();
  const canDeleteSite = user.role === 'ADMIN';
  const location = useLocation();
  const [sites, setSites] = useState<InstallationSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    equipment_required: '',
    media: [],
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<
    { type: 'image' | 'video'; url: string; name?: string } | null
  >(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleSite, setScheduleSite] = useState<InstallationSite | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [jobType, setJobType] = useState('TR19 Grease Clean (Kitchen Extract)');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });
  const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);
  const [siteFilter, setSiteFilter] = useState<'all' | 'overdue' | 'due-soon'>(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get('filter');
    if (value === 'overdue' || value === 'due-soon') return value;
    return 'all';
  });
  const [siteStatusOverrides, setSiteStatusOverrides] = useState<Record<string, SiteStatus>>(() => {
    try {
      const raw = localStorage.getItem(SITE_STATUS_OVERRIDES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, SiteStatus>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  const JOB_TYPES = [
    'TR19 Grease Clean (Kitchen Extract)',
    'Kitchen Installations',
    'Service Work',
    'Collections',
  ];

  const START_TIMES = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = (i % 2) * 30;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  const loadSites = () => {
    setLoading(true);
    setLoadError(null);
    listInstallationSites()
      .then(setSites)
      .catch((error) => {
        setSites([]);
        const message = error instanceof Error ? error.message : 'Failed to load sites';
        setLoadError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    const state = location.state as { openAdd?: boolean } | null;
    if (state?.openAdd) {
      openAdd();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get('filter');
    if (value === 'overdue' || value === 'due-soon') {
      setSiteFilter(value);
    } else {
      setSiteFilter('all');
    }
  }, [location.search]);

  useEffect(() => {
    try {
      localStorage.setItem(SITE_STATUS_OVERRIDES_KEY, JSON.stringify(siteStatusOverrides));
    } catch {
      // ignore
    }
  }, [siteStatusOverrides]);

  const matchesSearch = (s: InstallationSite) =>
    !searchQuery ||
    s.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.postcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

  const now = useMemo(() => new Date(), []);
  const ninetyDaysFromNow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d;
  }, []);

  const tr19Reports = useMemo(() => {
    try {
      const r = localStorage.getItem('bengal_tr19_reports');
      return r ? JSON.parse(r) : {};
    } catch {
      return {};
    }
  }, [jobs]);

  const jobsWithCompletedTR19 = useMemo(
    () => new Set<string>(Object.keys(tr19Reports).filter((id) => tr19Reports[id] != null)),
    [tr19Reports]
  );

  const installationSiteIdSet = useMemo(() => new Set<string>(sites.map((s) => s.id)), [sites]);

  const overdueJobsForFilter = useMemo(
    () =>
      jobs.filter((j) => {
        if (!j.warrantyEndDate) return false;
        const due = new Date(j.warrantyEndDate + (j.warrantyEndDate.length === 10 ? 'T12:00:00' : ''));
        if (Number.isNaN(due.getTime())) return false;
        return (
          due < now &&
          due > new Date(0) &&
          !jobsWithCompletedTR19.has(j.id)
        );
      }),
    [jobs, now, jobsWithCompletedTR19]
  );

  const dueSoonJobsForFilter = useMemo(
    () =>
      jobs.filter((j) => {
        if (!j.warrantyEndDate) return false;
        const due = new Date(j.warrantyEndDate + (j.warrantyEndDate.length === 10 ? 'T12:00:00' : ''));
        if (Number.isNaN(due.getTime())) return false;
        return (
          due > now &&
          due <= ninetyDaysFromNow &&
          !jobsWithCompletedTR19.has(j.id)
        );
      }),
    [jobs, now, ninetyDaysFromNow, jobsWithCompletedTR19]
  );

  const overdueSiteIds = useMemo(
    () =>
      new Set<string>(
        overdueJobsForFilter
          .map((j) => j.customerId)
          .filter((id): id is string => !!id && installationSiteIdSet.has(id))
      ),
    [overdueJobsForFilter, installationSiteIdSet]
  );

  const dueSoonSiteIds = useMemo(() => {
    // A site should never be counted in both buckets. If any job is overdue,
    // show it as overdue (and exclude it from due-soon).
    const ids = new Set<string>();
    for (const job of dueSoonJobsForFilter) {
      const id = job.customerId;
      if (!id) continue;
      if (!installationSiteIdSet.has(id)) continue;
      if (overdueSiteIds.has(id)) continue;
      ids.add(id);
    }
    return ids;
  }, [dueSoonJobsForFilter, installationSiteIdSet, overdueSiteIds]);

  const getComputedSiteStatus = (siteId: string): SiteStatus => {
    if (overdueSiteIds.has(siteId)) return 'OVERDUE';
    if (dueSoonSiteIds.has(siteId)) return 'DUE_SOON';
    return 'ACTIVE_SITE';
  };

  const getSiteStatus = (siteId: string): SiteStatus =>
    siteStatusOverrides[siteId] || getComputedSiteStatus(siteId);

  const getSiteStatusStyles = (status: SiteStatus) => {
    switch (status) {
      case 'OVERDUE':
        return 'bg-red-900/30 text-red-400 border-red-800/50';
      case 'DUE_SOON':
        return 'bg-amber-900/30 text-amber-400 border-amber-800/50';
      case 'ACTIVE_SITE':
      default:
        return 'bg-green-900/30 text-green-400 border-green-800/50';
    }
  };

  const getSiteStatusLabel = (status: SiteStatus) => {
    switch (status) {
      case 'OVERDUE':
        return 'Overdue';
      case 'DUE_SOON':
        return 'Due Soon';
      case 'ACTIVE_SITE':
      default:
        return 'Active Site';
    }
  };

  const statusCounts = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let active = 0;
    for (const site of sites) {
      const status = getSiteStatus(site.id);
      if (status === 'OVERDUE') overdue += 1;
      else if (status === 'DUE_SOON') dueSoon += 1;
      else active += 1;
    }
    return { overdue, dueSoon, active };
  }, [sites, siteStatusOverrides, overdueSiteIds, dueSoonSiteIds]);

  const filteredSites = sites.filter((s) => {
    if (!matchesSearch(s)) return false;
    const status = getSiteStatus(s.id);
    if (siteFilter === 'overdue') return status === 'OVERDUE';
    if (siteFilter === 'due-soon') return status === 'DUE_SOON';
    return true;
  });

  const siteScheduleMap = useMemo(() => {
    const map: Record<string, { startDate: string; endDate: string }> = {};
    for (const job of jobs) {
      if (!job.customerId || !job.startDate) continue;
      const siteId = job.customerId;
      const start = job.startDate.slice(0, 10);
      const end = (job.warrantyEndDate || job.startDate).slice(0, 10);
      const existing = map[siteId];
      if (!existing || start > existing.startDate) {
        map[siteId] = { startDate: start, endDate: end };
      }
    }
    return map;
  }, [jobs]);

  const getLatestScheduledJobForSite = (siteId: string): Job | null => {
    let latest: Job | null = null;
    for (const j of jobs) {
      if (!j.customerId || j.customerId !== siteId) continue;
      if (!j.startDate) continue;
      const start = j.startDate.slice(0, 10);
      if (!latest) {
        latest = j;
        continue;
      }
      const latestStart = latest.startDate?.slice(0, 10) || '';
      if (start > latestStart) latest = j;
    }
    return latest;
  };

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
      equipment_required: '',
      media: [],
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
      equipment_required: s.equipment_required ?? '',
      media: s.media ?? [],
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
        equipment_required: form.equipment_required?.trim() || null,
        media: form.media ?? [],
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
        const type: 'image' | 'video' =
          file.type.startsWith('video/') ? 'video' : 'image';
        newMedia.push({ type, url, name: file.name });
      }
      setForm((prev) => ({
        ...prev,
        media: [...(prev.media ?? []), ...newMedia],
      }));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload media. Please try again.'
      );
    } finally {
      setUploading(false);
      // reset input so same file can be selected again if needed
      e.target.value = '';
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

  const openScheduleForSite = (site: InstallationSite) => {
    const existing = getLatestScheduledJobForSite(site.id);
    setScheduleSite(site);
    setStartDate(existing?.startDate?.slice(0, 10) || '');
    setEndDate((existing?.warrantyEndDate || existing?.startDate || '').slice(0, 10) || '');
    setStartTime(existing?.startTime || '08:00');
    setJobType(existing?.jobType || 'TR19 Grease Clean (Kitchen Extract)');
    setScheduleError(null);
    setScheduleModalOpen(true);
  };

  const createJobsForRange = async () => {
    if (!scheduleSite) return;
    if (!startDate || !endDate) {
      setScheduleError('Please choose both a start date and an end date.');
      return;
    }
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    if (end < start) {
      setScheduleError('End date must be on or after the start date.');
      return;
    }
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const existing = getLatestScheduledJobForSite(scheduleSite.id);
    const nextJob: Job = existing
      ? {
          ...existing,
          title: `${scheduleSite.site_name} — ${jobType}`,
          description: jobType,
          customerId: scheduleSite.id,
          customerName: scheduleSite.site_name,
          customerAddress: scheduleSite.address,
          customerPostcode: scheduleSite.postcode,
          contactName: scheduleSite.contact_name,
          status: existing.status || 'PENDING',
          startDate: startStr,
          warrantyEndDate: endStr,
          scheduledCleanDate: startStr,
          startTime,
          jobType,
        }
      : {
          id: `${scheduleSite.id}-${startStr}-${endStr}-${Math.random().toString(36).slice(2, 8)}`,
          title: `${scheduleSite.site_name} — ${jobType}`,
          description: jobType,
          customerId: scheduleSite.id,
          customerName: scheduleSite.site_name,
          customerAddress: scheduleSite.address,
          customerPostcode: scheduleSite.postcode,
          contactName: scheduleSite.contact_name,
          status: 'PENDING',
          startDate: startStr,
          warrantyEndDate: endStr,
          scheduledCleanDate: startStr,
          paymentStatus: 'UNPAID',
          amount: 0,
          startTime,
          jobType,
          leadOperative: 'ZAKEE — zakee.hussain@outlook.com',
        };

    setJobs((prev) => {
      if (existing) {
        return prev.map((j) => (j.id === existing.id ? nextJob : j));
      }
      return [nextJob, ...prev];
    });
    try {
      if (saveJob) {
        await saveJob(nextJob);
      } else if (refreshJobs) {
        await refreshJobs();
      }
    } catch {
      // ignore; next refresh reconciles
    }
    setScheduleModalOpen(false);
    setScheduleSite(null);
    setScheduleError(null);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Sites</h1>
            <p className="text-gray-500 text-sm font-bold mt-0.5">
              {siteFilter === 'all' && `${sites.length} installation site${sites.length !== 1 ? 's' : ''}`}
              {siteFilter === 'overdue' && `${statusCounts.overdue} overdue site${statusCounts.overdue !== 1 ? 's' : ''}`}
              {siteFilter === 'due-soon' && `${statusCounts.dueSoon} due soon site${statusCounts.dueSoon !== 1 ? 's' : ''}`}
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/dashboard/sites"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
              siteFilter === 'all'
                ? 'bg-[#F2C200]/10 border-[#F2C200] text-[#F2C200]'
                : 'bg-[#111111] border-[#333333] text-gray-400 hover:border-[#F2C200] hover:text-white'
            }`}
          >
            <i className="fas fa-building text-sm"></i>
            <span>Active Sites</span>
            <span className="text-[10px] font-black opacity-80">({sites.length})</span>
          </Link>
          <Link
            to="/dashboard/sites?filter=overdue"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
              siteFilter === 'overdue'
                ? 'bg-red-500/10 border-red-500 text-red-400'
                : 'bg-[#111111] border-[#333333] text-gray-400 hover:border-red-500 hover:text-red-400'
            }`}
          >
            <i className="fas fa-triangle-exclamation text-sm"></i>
            <span>Overdue</span>
            <span className="text-[10px] font-black opacity-80">({statusCounts.overdue})</span>
          </Link>
          <Link
            to="/dashboard/sites?filter=due-soon"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
              siteFilter === 'due-soon'
                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                : 'bg-[#111111] border-[#333333] text-gray-400 hover:border-amber-500 hover:text-amber-400'
            }`}
          >
            <i className="fas fa-clock text-sm"></i>
            <span>Due Soon</span>
            <span className="text-[10px] font-black opacity-80">({statusCounts.dueSoon})</span>
          </Link>
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
        {loadError && (
          <div className="mx-4 mt-4 px-4 py-3 rounded-lg bg-red-900/20 border border-red-800/40 text-red-300 text-sm font-bold">
            Unable to load sites: {loadError}
          </div>
        )}
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-bold text-sm">Loading...</div>
        ) : (
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-[#1A1A1A] border-b border-[#333333]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Site</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
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
                      {siteScheduleMap[s.id] && (
                        <p className="text-[10px] text-gray-400 font-bold mt-1">
                          Next job:{' '}
                          {new Date(siteScheduleMap[s.id].startDate + 'T12:00:00').toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {siteScheduleMap[s.id].endDate &&
                            siteScheduleMap[s.id].endDate !== siteScheduleMap[s.id].startDate && (
                              <>
                                {' '}
                                —{' '}
                                {new Date(siteScheduleMap[s.id].endDate + 'T12:00:00').toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </>
                            )}
                        </p>
                      )}
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
                  <td className="px-6 py-4">
                    <div
                      className={`inline-flex items-center px-3 py-1.5 rounded-full border ${getSiteStatusStyles(getSiteStatus(s.id))}`}
                    >
                      <select
                        value={getSiteStatus(s.id)}
                        onChange={(e) =>
                          setSiteStatusOverrides((prev) => ({
                            ...prev,
                            [s.id]: e.target.value as SiteStatus,
                          }))
                        }
                        className="bg-transparent text-[10px] font-bold uppercase tracking-widest focus:outline-none cursor-pointer appearance-none pr-4 relative z-10 text-inherit"
                        aria-label={`Update status for site ${s.site_name}`}
                      >
                        <option value="OVERDUE">Overdue</option>
                        <option value="DUE_SOON">Due Soon</option>
                        <option value="ACTIVE_SITE">Active Site</option>
                      </select>
                      <i className="fas fa-chevron-down text-[8px] -ml-3 opacity-60"></i>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {s.media && s.media.length > 0 && (
                        <button
                          onClick={() => {
                            // Open edit modal focused on this site's media
                            openEdit(s);
                          }}
                          className="text-xs font-bold text-[#F2C200] hover:text-white flex items-center gap-1"
                          title="View attached media"
                        >
                          <i className="fas fa-photo-film text-sm" />
                          <span>Media ({s.media.length})</span>
                        </button>
                      )}
                      <button
                        onClick={() => openScheduleForSite(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold hover:brightness-110 active:scale-95 transition-all ${
                          siteScheduleMap[s.id]
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#F2C200] text-black'
                        }`}
                      >
                        {siteScheduleMap[s.id] ? 'Dates confirmed' : 'Schedule dates'}
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-[#333333] text-[#F2C200] hover:bg-[#F2C200] hover:text-black transition-all"
                        title="Edit Site"
                      >
                        <i className="fas fa-pen text-[10px]"></i>
                        Edit
                      </button>
                      {canDeleteSite && (
                        <button
                          onClick={() => handleDelete(s)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-red-900/40 text-red-400 border border-red-800/50 hover:bg-red-800/40 transition-all"
                          title="Delete"
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filteredSites.length === 0 && (
          <div className="p-12 text-center text-gray-500 font-bold text-sm">
            {sites.length === 0
              ? 'No sites yet. Click Add Site to create one.'
              : siteFilter === 'overdue'
                ? 'No overdue sites.'
                : siteFilter === 'due-soon'
                  ? 'No due soon sites.'
                  : 'No sites match your search.'}
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
                <label className={labelClass}>What is required on this site (equipment, access, etc.)</label>
                <textarea
                  rows={3}
                  value={form.equipment_required || ''}
                  onChange={(e) => setForm({ ...form, equipment_required: e.target.value })}
                  className={`${inputClass} resize-none`}
                  placeholder="List required equipment, access notes, special considerations..."
                />
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
                {uploadError && (
                  <p className="mt-1 text-xs text-red-400 font-bold">{uploadError}</p>
                )}
                {uploading && (
                  <p className="mt-1 text-xs text-gray-400 font-bold">
                    Uploading files...
                  </p>
                )}
                {form.media && form.media.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] text-gray-400 font-bold">
                      Attached files (click to view):
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {form.media.map((m, idx) => (
                        <button
                          key={`${m.url}-${idx}`}
                          type="button"
                          onClick={() => setMediaPreview(m)}
                          className="relative group aspect-square rounded-lg overflow-hidden border border-[#333333] hover:border-[#F2C200] transition-colors"
                        >
                          {m.type === 'image' ? (
                            <img
                              src={m.url}
                              alt={m.name || 'Site media'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={m.url}
                              className="w-full h-full object-cover"
                              muted
                            />
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
                          <span className="uppercase mr-1 text-[#F2C200]">
                            [{m.type}]
                          </span>
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

      {/* Schedule Dates Modal */}
      {scheduleModalOpen && scheduleSite && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[650] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Schedule dates</h2>
                <p className="text-sm text-gray-500 font-bold mt-0.5">
                  {scheduleSite.site_name} — {scheduleSite.address}
                </p>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {scheduleError && (
                <div className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-bold">
                  {scheduleError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Start date *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDateField('start');
                      const base = startDate ? new Date(startDate + 'T12:00:00') : new Date();
                      setCalendarView({ year: base.getFullYear(), month: base.getMonth() });
                    }}
                    className={`${inputClass} text-left flex items-center justify-between`}
                  >
                    <span>
                      {startDate
                        ? new Date(startDate + 'T12:00:00').toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Select start date'}
                    </span>
                    <i className="fas fa-calendar-alt text-gray-400 ml-3" />
                  </button>
                </div>
                <div>
                  <label className={labelClass}>End date *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDateField('end');
                      const base = endDate ? new Date(endDate + 'T12:00:00') : new Date();
                      setCalendarView({ year: base.getFullYear(), month: base.getMonth() });
                    }}
                    className={`${inputClass} text-left flex items-center justify-between`}
                  >
                    <span>
                      {endDate
                        ? new Date(endDate + 'T12:00:00').toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Select end date'}
                    </span>
                    <i className="fas fa-calendar-alt text-gray-400 ml-3" />
                  </button>
                </div>
              </div>
              {activeDateField && (
                <div className="bg-black border border-[#333333] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarView((v) =>
                          v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }
                        )
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#333333] hover:text-white transition-colors"
                    >
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <span className="text-sm font-bold text-white">
                      {new Date(calendarView.year, calendarView.month).toLocaleString('default', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarView((v) =>
                          v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }
                        )
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#333333] hover:text-white transition-colors"
                    >
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 text-center">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <div key={d} className="text-[9px] font-black text-gray-500 py-1">
                        {d}
                      </div>
                    ))}
                    {(() => {
                      const firstDay = new Date(calendarView.year, calendarView.month, 1).getDay();
                      const daysInMonth = new Date(calendarView.year, calendarView.month + 1, 0).getDate();
                      const padding = Array.from({ length: firstDay }, (_, i) => (
                        <div key={`p-${i}`} className="py-1.5" />
                      ));
                      const days = Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dateStr = `${calendarView.year}-${String(calendarView.month + 1).padStart(2, '0')}-${String(
                          day
                        ).padStart(2, '0')}`;
                        const isSelected =
                          (activeDateField === 'start' && startDate === dateStr) ||
                          (activeDateField === 'end' && endDate === dateStr);
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (activeDateField === 'start') {
                                setStartDate(dateStr);
                              } else {
                                setEndDate(dateStr);
                              }
                              setScheduleError(null);
                            }}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              isSelected
                                ? 'bg-[#F2C200] text-black'
                                : isToday
                                  ? 'bg-[#333333] text-[#F2C200]'
                                  : 'text-gray-300 hover:bg-[#333333] hover:text-white'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      });
                      return [...padding, ...days];
                    })()}
                  </div>
                </div>
              )}
              <div>
                <label className={labelClass}>Start time *</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputClass}
                >
                  {START_TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Job type *</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className={inputClass}
                >
                  {JOB_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              {startDate && endDate && (
                <p className="text-[11px] text-gray-400 font-bold">
                  This will create{' '}
                  <span className="text-[#F2C200]">
                    {(() => {
                      const start = new Date(startDate + 'T12:00:00');
                      const end = new Date(endDate + 'T12:00:00');
                      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
                      const diffMs = end.getTime() - start.getTime();
                      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
                      return days;
                    })()}
                  </span>{' '}
                  day job spanning this range.
                </p>
              )}
            </div>
            <div className="p-6 border-t border-[#333333] flex items-center justify-end gap-3">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-transparent border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createJobsForRange}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-60 transition-colors shadow-lg shadow-[#F2C2001A]"
              >
                <i className="fas fa-calendar-plus text-sm"></i>
                <span>Add to calendar</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {mediaPreview && (
        <div
          className="fixed inset-0 bg-black/90 z-[700] flex items-center justify-center p-4"
          onClick={() => setMediaPreview(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {mediaPreview.type === 'image' ? (
              <img
                src={mediaPreview.url}
                alt={mediaPreview.name || 'Site media'}
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : (
              <video
                src={mediaPreview.url}
                controls
                className="max-w-full max-h-[80vh] bg-black"
              />
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
};

export default AdminSites;
