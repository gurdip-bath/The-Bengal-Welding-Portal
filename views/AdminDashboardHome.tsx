import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Job } from '../types';
import { useAdmin } from '../contexts/AdminContext';
import { listServiceRequestsForAdmin } from '../lib/serviceRequests';

const TR19_REPORTS_STORAGE_KEY = 'bengal_tr19_reports';

interface ScheduleSiteData {
  id: string;
  siteName: string;
  clientName: string;
  address: string;
  contractValue: number;
  daysText: string;
  daysUrgent: boolean;
  dueDate: string;
  dueDateShort: string;
  customerId: string;
  isScheduled?: boolean;
  scheduledDate?: string;
  jobId?: string;
}

interface ScheduledRenewal {
  scheduledDate: string;
  jobId: string;
  contractValue: number;
}

const SCHEDULED_STORAGE_KEY = 'bengal_revenue_scheduled';

const AdminDashboardHome: React.FC = () => {
  const { jobs, setJobs, quotes, openAddJobModal } = useAdmin();
  const [scheduledMap, setScheduledMap] = useState<Record<string, ScheduledRenewal>>(() => {
    try {
      const stored = localStorage.getItem(SCHEDULED_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
    return {};
  });
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleSite, setScheduleSite] = useState<ScheduleSiteData | null>(null);
  const [contractValueInput, setContractValueInput] = useState('1200');
  const [jobDate, setJobDate] = useState('');
  const [calendarView, setCalendarView] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [pendingServiceRequestsCount, setPendingServiceRequestsCount] = useState(0);
  const [startTime, setStartTime] = useState('08:00');
  const [duration, setDuration] = useState(2);
  const [jobType, setJobType] = useState('TR19 Grease Clean (Kitchen Extract)');

  const JOB_TYPES = [
    'TR19 Grease Clean (Kitchen Extract)',
    'Ductwork Inspection & Report',
    'Fire Safety Compliance Check',
    'Full Kitchen Extract Deep Clean',
  ];

  const START_TIMES = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = (i % 2) * 30;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  useEffect(() => {
    localStorage.setItem(SCHEDULED_STORAGE_KEY, JSON.stringify(scheduledMap));
  }, [scheduledMap]);

  useEffect(() => {
    listServiceRequestsForAdmin()
      .then((reqs) => setPendingServiceRequestsCount(reqs.filter((r) => r.status === 'pending').length))
      .catch(() => {});
  }, []);

  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  const uniqueSites = new Set(jobs.map((j) => j.customerId)).size;
  const overdueJobs = jobs.filter((j) => new Date(j.warrantyEndDate) < now && new Date(j.warrantyEndDate) > new Date(0));
  const dueSoonJobs = jobs.filter((j) => {
    const expiry = new Date(j.warrantyEndDate);
    return expiry > now && expiry <= ninetyDaysFromNow;
  });
  const pendingQuotes = quotes.filter((q) => q.status === 'NEW' || q.status === 'QUOTED' || q.status === 'PENDING_PAYMENT');

  const getPostcode = (job: Job) =>
    job.customerPostcode || (job.customerAddress ? job.customerAddress.split(',').pop()?.trim() || '' : '');

  const tr19Reports = useMemo(() => {
    try {
      const r = localStorage.getItem(TR19_REPORTS_STORAGE_KEY);
      return r ? JSON.parse(r) : {};
    } catch {
      return {};
    }
  }, [jobs]);

  const ninetyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.getTime();
  }, []);

  const completedInLast90DaysValue = useMemo(() => {
    return jobs
      .filter((j) => {
        const report = tr19Reports[j.id] as { signedAt?: string } | undefined;
        if (!report?.signedAt) return false;
        const signedAt = new Date(report.signedAt + (report.signedAt.length === 10 ? 'T12:00:00' : '')).getTime();
        return signedAt >= ninetyDaysAgo;
      })
      .reduce((sum, j) => sum + (j.amount ?? 0), 0);
  }, [jobs, tr19Reports, ninetyDaysAgo]);

  const jobsWithCompletedTR19 = new Set(
    Object.keys(tr19Reports).filter((id) => tr19Reports[id] != null)
  );
  const overdueForRevenue = overdueJobs.filter((j) => !jobsWithCompletedTR19.has(j.id));

  const recentCertificates = jobs
    .filter((j) => tr19Reports[j.id] != null)
    .sort((a, b) => new Date(b.warrantyEndDate).getTime() - new Date(a.warrantyEndDate).getTime())
    .slice(0, 6);

  const renewalItems = useMemo(() => {
    const items: (Job & { isOverdue: boolean; daysText: string })[] = [];
    for (const job of jobs) {
      const dueDateStr = job.warrantyEndDate;
      const dueDate = new Date(dueDateStr + (dueDateStr?.length === 10 ? 'T12:00:00' : ''));
      const dueTime = dueDate.getTime();
      const isOverdue = dueTime < now.getTime();
      const isDueWithin90Days = dueTime <= ninetyDaysFromNow.getTime();
      if (!isOverdue && !isDueWithin90Days) continue;
      const diff = Math.floor((dueTime - now.getTime()) / (1000 * 60 * 60 * 24));
      items.push({
        ...job,
        isOverdue: diff < 0,
        daysText: diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d left`,
      });
    }
    return items.sort((a, b) => new Date(a.warrantyEndDate).getTime() - new Date(b.warrantyEndDate).getTime());
  }, [jobs, now, ninetyDaysFromNow]);

  const jobsDueToSchedule = useMemo(() => {
    return jobs
      .filter((j) => {
        const due = new Date(j.warrantyEndDate + (j.warrantyEndDate?.length === 10 ? 'T12:00:00' : ''));
        return due <= ninetyDaysFromNow;
      })
      .map((job) => {
        const scheduled = scheduledMap[job.id];
        const diff = Math.floor(
          (new Date(job.warrantyEndDate + 'T12:00:00').getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysLeft = diff < 0 ? Math.abs(diff) : diff;
        const dueDateShort = new Date(job.warrantyEndDate + 'T12:00:00').toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
        let daysColor = 'text-green-500';
        if (daysLeft <= 30) daysColor = 'text-red-500';
        else if (daysLeft <= 60) daysColor = 'text-amber-500';
        return {
          id: job.id,
          siteName: job.title || job.customerName || 'Unnamed Site',
          clientName: job.customerName || '—',
          address: job.customerAddress || '',
          contractValue: scheduled?.contractValue ?? job.amount ?? 0,
          daysText: `${daysLeft}d`,
          daysLeft,
          daysColor,
          daysUrgent: daysLeft <= 30,
          dueDate: job.warrantyEndDate,
          dueDateShort,
          customerId: job.customerId || job.id,
          isScheduled: !!scheduled,
          scheduledDate: scheduled?.scheduledDate,
          jobId: scheduled?.jobId,
        } as ScheduleSiteData & { daysLeft: number; daysColor: string };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [jobs, scheduledMap, now, ninetyDaysFromNow]);

  const revenueSites: ScheduleSiteData[] = overdueForRevenue.map((job) => {
    const scheduled = scheduledMap[job.id];
    const diff = Math.floor((new Date(job.warrantyEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysOverdue = Math.abs(diff);
    const dueDateShort = new Date(job.warrantyEndDate + 'T12:00:00').toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
    return {
      id: job.id,
      siteName: job.title || job.customerName || 'Unnamed Site',
      clientName: job.customerName || '—',
      address: job.customerAddress || '',
      contractValue: scheduled?.contractValue ?? job.amount ?? 0,
      daysText: `${daysOverdue}d`,
      daysUrgent: true,
      dueDate: job.warrantyEndDate,
      dueDateShort,
      customerId: job.customerId || job.id,
      isScheduled: !!scheduled,
      scheduledDate: scheduled?.scheduledDate,
      jobId: scheduled?.jobId,
    };
  });

  // Dynamic Revenue Protection metrics
  const nowDateStr = now.toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

  const sitesAtRisk = revenueSites.filter((s) => !s.isScheduled);
  const sitesScheduled = revenueSites.filter((s) => s.isScheduled);
  const sitesDueThisMonth = sitesAtRisk.filter(
    (s) => s.dueDate >= nowDateStr && s.dueDate <= endOfMonthStr
  );

  const revenueAtRisk = revenueSites.reduce((sum, s) => sum + s.contractValue, 0);
  const protectedThisQtr =
    sitesScheduled.reduce((sum, s) => sum + s.contractValue, 0) + completedInLast90DaysValue;
  const dueThisMonthValue = sitesDueThisMonth.reduce((sum, s) => sum + s.contractValue, 0);
  const dueThisMonthCount = sitesDueThisMonth.length;

  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const job of jobs) {
      const rawDate = job.startDate || job.warrantyEndDate;
      if (!rawDate) continue;
      const dateStr = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(job);
    }
    return map;
  }, [jobs]);

  const selectedJobsForDay = useMemo(() => {
    if (!jobDate) return [];
    return jobsByDate[jobDate] || [];
  }, [jobDate, jobsByDate]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {pendingServiceRequestsCount > 0 && (
        <Link
          to="/dashboard/service-requests"
          className="block p-4 rounded-xl bg-[#FFF9E6]/10 border border-[#B28900]/50 text-[#F2C200] hover:bg-[#FFF9E6]/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <i className="fas fa-clipboard-check text-xl" />
            <div>
              <p className="font-bold">You have {pendingServiceRequestsCount} pending service request{pendingServiceRequestsCount !== 1 ? 's' : ''}</p>
              <p className="text-sm text-gray-400">Review and approve or reject</p>
            </div>
            <i className="fas fa-chevron-right ml-auto" />
          </div>
        </Link>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm font-bold mt-0.5">
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={openAddJobModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-[#111111] border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-all"
          >
            <i className="fas fa-building-user"></i>
            <span>Add Site</span>
          </button>
          <Link
            to="/dashboard/certificates"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F2C2001A]"
          >
            <i className="fas fa-plus"></i>
            <i className="fas fa-certificate"></i>
            <span>New Certificate</span>
          </Link>
        </div>
      </div>

      {/* Revenue Protection Section - Layout from reference image */}
      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-hidden">
        {/* Section Header */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#333333]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200]">
              <i className="fas fa-shield-halved text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Revenue Protection</h2>
              <p className="text-gray-500 text-sm font-bold">Overdue certificates — schedule job → survey → generate certificate</p>
            </div>
          </div>
          <Link
            to="/dashboard/certificates"
            className="px-6 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F2C2001A] whitespace-nowrap"
          >
            Manage Certificates
          </Link>
        </div>

        {/* Stat Cards - Vertical Stack */}
        <div className="p-6 space-y-4">
          {/* DUE THIS MONTH */}
          <div className="bg-black rounded-xl border border-[#333333] p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <i className="fas fa-calendar-clock"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Due This Month</p>
              <p className="text-2xl font-black text-white">£{dueThisMonthValue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 font-bold">{dueThisMonthCount} sites</p>
            </div>
          </div>

          {/* REVENUE AT RISK - sum of overdue certificate values not yet scheduled; only show when > 0 */}
          {revenueAtRisk > 0 && (
            <div className="bg-black rounded-xl border border-[#333333] p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Revenue at Risk</p>
                <p className="text-2xl font-black text-red-500">£{revenueAtRisk.toLocaleString()}</p>
                <p className="text-xs text-gray-500 font-bold">
                  Sum of {revenueSites.length} overdue site{revenueSites.length !== 1 ? 's' : ''} pending TR19
                </p>
              </div>
            </div>
          )}

          {/* PROTECTED THIS QTR */}
          <div className="bg-black rounded-xl border border-[#333333] p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
              <i className="fas fa-circle-dollar-to-slot"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Protected This Qtr</p>
              <p className="text-2xl font-black text-green-500">£{protectedThisQtr.toLocaleString()}</p>
              <p className="text-xs text-gray-500 font-bold">Scheduled + completed in last 90 days</p>
            </div>
          </div>

          {/* Site Cards - jobs due within 90 days, color-coded: red (0-30d), yellow (31-60d), green (61-90d) */}
          {jobsDueToSchedule.length === 0 ? (
            <div className="bg-black rounded-xl border border-[#333333] p-8 text-center">
              <p className="text-gray-500 font-bold">No jobs due within 90 days.</p>
              <p className="text-xs text-gray-600 mt-1">Jobs due for scheduling will appear here.</p>
            </div>
          ) : (
          jobsDueToSchedule.map((site) =>
            site.isScheduled ? (
              <div
                key={site.id}
                className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black text-white truncate">{site.clientName}</p>
                    <p className="text-xs text-gray-400 font-bold truncate">{site.siteName}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#F2C200]/20 flex items-center justify-center text-[#F2C200] shrink-0">
                    <i className="fas fa-check text-sm"></i>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-amber-500 text-xs font-bold">{site.dueDateShort}</span>
                  <span className="text-white font-bold">£{site.contractValue.toLocaleString()}</span>
                  {site.jobId ? (
                    <Link
                      to={`/jobs/${site.jobId}`}
                      className="px-4 py-2 rounded-xl font-bold text-xs bg-[#0070ba] text-white hover:brightness-110 transition-all"
                    >
                      View Record
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        setScheduleSite({ ...site, daysText: site.daysText.replace('d', ' days') });
                        setContractValueInput(site.contractValue.toString());
                        const initialDate = site.scheduledDate || site.dueDate || new Date().toISOString().split('T')[0];
                        setJobDate(initialDate);
                        const [y, m] = initialDate.split('-').map(Number);
                        setCalendarView({ year: y, month: m - 1 });
                        setStartTime('08:00');
                        setDuration(2);
                        setJobType('TR19 Grease Clean (Kitchen Extract)');
                        setScheduleModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl font-bold text-xs bg-[#0070ba] text-white hover:brightness-110 transition-all"
                    >
                      Schedule
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                key={site.id}
                className="bg-black rounded-xl border border-[#333333] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1 order-first">
                  <p className="text-lg font-black text-white break-words sm:truncate">{site.clientName}</p>
                  <p className="text-xs text-gray-400 font-bold break-words sm:truncate mt-0.5">{site.siteName}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <span className="text-amber-500 text-xs font-bold">{site.dueDateShort}</span>
                  <span className="text-white font-bold">£{site.contractValue.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-2xl font-black ${(site as { daysColor?: string }).daysColor || 'text-gray-400'}`}>
                    {site.daysText}
                  </span>
                  <button
                    onClick={() => {
                      setScheduleSite({ ...site, daysText: site.daysText.replace('d', ' days') });
                      setContractValueInput(site.contractValue.toString());
                      const initialDate = site.dueDate || new Date().toISOString().split('T')[0];
                      setJobDate(initialDate);
                      const [y, m] = initialDate.split('-').map(Number);
                      setCalendarView({ year: y, month: m - 1 });
                      setStartTime('08:00');
                      setDuration(2);
                      setJobType('TR19 Grease Clean (Kitchen Extract)');
                      setScheduleModalOpen(true);
                    }}
                    className="px-5 py-2 rounded-xl font-bold text-xs bg-[#0070ba] text-white hover:brightness-110 transition-all"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111111] p-6 rounded-2xl border border-[#333333] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200]">
            <i className="fas fa-building text-xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Active Sites</p>
            <p className="text-2xl font-black text-white">{uniqueSites}</p>
          </div>
        </div>
        <div className="bg-[#111111] p-6 rounded-2xl border border-[#333333] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <i className="fas fa-triangle-exclamation text-xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Overdue</p>
            <p className="text-2xl font-black text-white">{overdueJobs.length}</p>
          </div>
        </div>
        <div className="bg-[#111111] p-6 rounded-2xl border border-[#333333] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <i className="fas fa-clock text-xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Due Soon</p>
            <p className="text-2xl font-black text-white">{dueSoonJobs.length}</p>
          </div>
        </div>
        <div className="bg-[#111111] p-6 rounded-2xl border border-[#333333] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <i className="fas fa-file-invoice-dollar text-xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">New Quotes</p>
            <p className="text-2xl font-black text-white">{pendingQuotes.length}</p>
          </div>
        </div>
      </div>

      {/* Job Calendar */}
      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-hidden">
        <div className="p-4 border-b border-[#333333] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Job Calendar</h2>
            <p className="text-xs text-gray-500 font-bold">
              Highlighted days have scheduled or active jobs. Click a date to view jobs.
            </p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)] gap-4">
          <div className="bg-black border border-[#333333] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
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
                  const isSelected = jobDate === dateStr;
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const hasJobs = !!jobsByDate[dateStr]?.length;
                  let baseClasses =
                    'py-1.5 rounded-lg text-xs font-bold transition-colors border border-transparent';
                  let stateClasses = '';
                  if (isSelected) {
                    stateClasses = 'bg-[#F2C200] text-black';
                  } else if (hasJobs) {
                    stateClasses = 'bg-[#F2C200]/15 text-[#F2C200] hover:bg-[#F2C200]/25';
                  } else if (isToday) {
                    stateClasses = 'bg-[#333333] text-[#F2C200]';
                  } else {
                    stateClasses = 'text-gray-300 hover:bg-[#333333] hover:text-white';
                  }
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setJobDate(dateStr)}
                      className={`${baseClasses} ${stateClasses}`}
                    >
                      {day}
                    </button>
                  );
                });
                return [...padding, ...days];
              })()}
            </div>
            {jobDate && (
              <p className="text-[10px] text-gray-500 mt-2 font-bold">
                Selected:{' '}
                {new Date(jobDate + 'T12:00:00').toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          <div className="bg-black border border-[#333333] rounded-xl p-3 flex flex-col min-h-[180px]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Jobs on selected day
              </p>
              {selectedJobsForDay.length > 0 && (
                <span className="text-[10px] font-bold text-[#F2C200]">
                  {selectedJobsForDay.length} job{selectedJobsForDay.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {(!jobDate || selectedJobsForDay.length === 0) && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-600 font-bold text-center px-4">
                  Select a highlighted date to see scheduled jobs for that day.
                </p>
              </div>
            )}
            {jobDate && selectedJobsForDay.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedJobsForDay.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#111111] border border-[#333333] hover:border-[#F2C200] hover:bg-[#111111]/80 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white group-hover:text-[#F2C200] truncate">
                        {job.title || job.customerName || 'Job'}
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold truncate">
                        {job.customerAddress || job.id}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/5 text-gray-300">
                        {job.status}
                      </span>
                      {job.amount != null && (
                        <span className="text-xs font-bold text-[#F2C200]">
                          £{job.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two columns: Renewal Dashboard | Recent Certificates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renewal Dashboard */}
        <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-hidden">
          <div className="p-4 border-b border-[#333333] flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Renewal Dashboard</h2>
            <Link
              to="/dashboard/sites"
              className="text-xs font-bold text-[#F2C200] hover:underline uppercase tracking-wider"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[#333333] max-h-[400px] overflow-y-auto">
            {renewalItems.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                to={`/jobs/${item.id}`}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      item.isOverdue ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-[#F2C200] transition-colors truncate">
                      {item.customerName || 'No Name'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold">{getPostcode(item) || item.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      item.isOverdue ? 'bg-red-900/30 text-red-400' : 'bg-amber-900/30 text-amber-400'
                    }`}
                  >
                    {item.daysText}
                  </span>
                  <i className="fas fa-chevron-right text-[10px] text-gray-600 group-hover:text-[#F2C200] transition-colors" />
                </div>
              </Link>
            ))}
            {renewalItems.length === 0 && (
              <div className="p-12 text-center text-gray-500 text-sm font-bold">
                No sites due for renewal.
              </div>
            )}
          </div>
        </div>

        {/* Recent Certificates */}
        <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-hidden">
          <div className="p-4 border-b border-[#333333] flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Recent Certificates</h2>
            <Link
              to="/dashboard/certificates"
              className="text-xs font-bold text-[#F2C200] hover:underline uppercase tracking-wider"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[#333333] max-h-[400px] overflow-y-auto">
            {recentCertificates.map((cert) => (
              <Link
                key={cert.id}
                to="/dashboard/certificates"
                state={{ viewReportJobId: cert.id }}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200] shrink-0">
                    <i className="fas fa-file-certificate"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-[#F2C200] transition-colors truncate">
                      {cert.customerName || cert.title || 'Certificate'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold">
                      {new Date(cert.warrantyEndDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-[10px] font-black uppercase border border-green-800/50 shrink-0">
                  Compliant
                </span>
              </Link>
            ))}
            {recentCertificates.length === 0 && (
              <div className="p-12 text-center text-gray-500 text-sm font-bold">
                No recent certificates.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/dashboard/certificates"
          className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#111111] border border-[#333333] hover:border-[#F2C200] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200] mb-3 group-hover:bg-[#F2C200]/20 transition-colors">
            <i className="fas fa-certificate text-xl"></i>
          </div>
          <span className="text-sm font-bold text-white group-hover:text-[#F2C200] transition-colors">
            New Certificate
          </span>
        </Link>
        <Link
          to="/dashboard/surveys"
          className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#111111] border border-[#333333] hover:border-[#F2C200] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200] mb-3 group-hover:bg-[#F2C200]/20 transition-colors">
            <i className="fas fa-clipboard-list text-xl"></i>
          </div>
          <span className="text-sm font-bold text-white group-hover:text-[#F2C200] transition-colors">
            New Survey
          </span>
        </Link>
        <Link
          to="/dashboard/quotes"
          className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#111111] border border-[#333333] hover:border-[#F2C200] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200] mb-3 group-hover:bg-[#F2C200]/20 transition-colors">
            <i className="fas fa-file-invoice-dollar text-xl"></i>
          </div>
          <span className="text-sm font-bold text-white group-hover:text-[#F2C200] transition-colors">
            New Quote
          </span>
        </Link>
        <button
          onClick={openAddJobModal}
          className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#111111] border border-[#333333] hover:border-[#F2C200] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200] mb-3 group-hover:bg-[#F2C200]/20 transition-colors">
            <i className="fas fa-building-user text-xl"></i>
          </div>
          <span className="text-sm font-bold text-white group-hover:text-[#F2C200] transition-colors">
            Add Site
          </span>
        </button>
      </div>

      {/* Schedule Renewal Job Modal */}
      {scheduleModalOpen && scheduleSite && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#333333] flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Schedule Renewal Job</h2>
                <p className="text-sm text-gray-500 font-bold mt-0.5">
                  {scheduleSite.siteName} — {scheduleSite.clientName}
                </p>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Modal Body - scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {/* Client Information Card */}
              <div className="bg-black rounded-xl border border-[#333333] p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <i className="fas fa-building text-gray-500 w-4"></i>
                  <span className="text-gray-400">Client:</span>
                  <span className="font-bold text-white">{scheduleSite.clientName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <i className="fas fa-location-dot text-gray-500 w-4"></i>
                  <span className="text-gray-300 font-medium">{scheduleSite.address}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Contract value:</span>
                    <span className="font-bold text-white">£{scheduleSite.contractValue.toLocaleString()}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      scheduleSite.daysUrgent ? 'bg-red-900/40 text-red-400' : 'bg-amber-900/40 text-amber-400'
                    }`}
                  >
                    {scheduleSite.daysText}
                  </span>
                </div>
              </div>

              {/* JOB DATE & TIME */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Job Date & Time
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Job Date *</label>
                    <div className="bg-black border border-[#333333] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
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
                            const dateStr = `${calendarView.year}-${String(calendarView.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = jobDate === dateStr;
                            const isToday =
                              dateStr === new Date().toISOString().split('T')[0];
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setJobDate(dateStr)}
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
                      {jobDate && (
                        <p className="text-[10px] text-gray-500 mt-2 font-bold">
                          Selected: {new Date(jobDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Start Time *</label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none appearance-none"
                    >
                      {START_TIMES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Duration *</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none appearance-none"
                    >
                      <option value={1}>1 hour</option>
                      <option value={2}>2 hours</option>
                      <option value={3}>3 hours</option>
                      <option value={4}>4 hours</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <i className="fas fa-clock"></i>
                      Estimated finish:{' '}
                      {(() => {
                        const [h, m] = startTime.split(':').map(Number);
                        const end = h * 60 + m + duration * 60;
                        const endH = Math.floor(end / 60) % 24;
                        const endM = end % 60;
                        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* ASSIGN OPERATIVE */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Assign Operative
                </h3>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Lead Operative *</label>
                  <select className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none appearance-none">
                    <option>ZAKEE — zakee.hussain@outlook.com</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Second Operative (optional)
                  </label>
                  <select className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none appearance-none">
                    <option>None</option>
                  </select>
                </div>
              </div>

              {/* JOB DETAILS */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Job Details
                </h3>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Job Type *</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none appearance-none"
                  >
                    {JOB_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Special Instructions</label>
                  <textarea
                    placeholder="e.g. Access via rear entrance, contact site manager on arrival, out of hours access code:"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Notify Client Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-bold text-white">Notify Client?</span>
                  <p className="text-xs text-gray-500">Email client contact about the scheduled visit</p>
                </div>
                <button className="w-12 h-6 rounded-full bg-[#F2C200] relative">
                  <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-black transition-all" />
                </button>
              </div>

              {/* Editable Contract Value - at bottom */}
              <div className="pt-2 border-t border-[#333333]">
                <label className="block text-xs font-bold text-gray-400 mb-1">Contract value (£)</label>
                <input
                  type="number"
                  value={contractValueInput}
                  onChange={(e) => setContractValueInput(e.target.value)}
                  min={0}
                  step={0.01}
                  placeholder="1200"
                  className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm font-bold focus:border-[#F2C200] focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#333333] flex gap-3">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-black border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const newValue = parseFloat(contractValueInput) || 0;
                  if (scheduleSite && jobDate) {
                    const existingJob = jobs.find((j) => j.id === scheduleSite.id);
                    const updates: Partial<Job> = {
                      title: `${scheduleSite.siteName || scheduleSite.clientName} — ${jobType}`,
                      description: jobType,
                      status: 'PENDING',
                      startDate: jobDate,
                      amount: newValue,
                      startTime,
                      duration,
                      jobType,
                      leadOperative: 'ZAKEE — zakee.hussain@outlook.com',
                    };
                    const updatedJob: Job = existingJob
                      ? { ...existingJob, ...updates }
                      : ({
                          id: scheduleSite.id,
                          title: updates.title,
                          description: jobType,
                          customerId: scheduleSite.customerId || scheduleSite.id,
                          customerName: scheduleSite.clientName,
                          customerAddress: scheduleSite.address,
                          status: 'PENDING',
                          startDate: jobDate,
                          warrantyEndDate: scheduleSite.dueDate || jobDate,
                          paymentStatus: 'UNPAID',
                          amount: newValue,
                          startTime,
                          duration,
                          jobType,
                          leadOperative: 'ZAKEE — zakee.hussain@outlook.com',
                        } as Job);
                    setJobs((prev) => {
                      const idx = prev.findIndex((j) => j.id === scheduleSite.id);
                      const updated = idx >= 0
                        ? prev.map((j) => (j.id === scheduleSite.id ? updatedJob : j))
                        : [updatedJob, ...prev];
                      localStorage.setItem('bengal_jobs', JSON.stringify(updated));
                      return updated;
                    });
                    setScheduledMap((prev) => ({
                      ...prev,
                      [scheduleSite.id]: {
                        scheduledDate: jobDate,
                        jobId: scheduleSite.id,
                        contractValue: newValue,
                      },
                    }));
                  }
                  setScheduleModalOpen(false);
                }}
                className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F2C2001A]"
              >
                Schedule Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardHome;
