import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { Job, JobStatus } from '../types';
import { getSiteName, getJobIdentifierAndService, getSiteAddress } from '../utils/jobIdentity';
import PhoneCallButton from '../components/PhoneCallButton';

const SURVEYS_STORAGE_KEY = 'bengal_surveys';
const TR19_REPORTS_STORAGE_KEY = 'bengal_tr19_reports';

type StatusFilter = JobStatus | 'ALL';

const AdminJobs: React.FC = () => {
  const { jobs, searchQuery, setSearchQuery, handleDeleteJob, openAddJobModal, openEditJobModal, openAddSiteTypeModal, updateStatus } = useAdmin();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const surveys = useMemo(() => {
    try {
      const s = localStorage.getItem(SURVEYS_STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  }, [jobs]);

  const tr19Reports = useMemo(() => {
    try {
      const r = localStorage.getItem(TR19_REPORTS_STORAGE_KEY);
      return r ? JSON.parse(r) : {};
    } catch {
      return {};
    }
  }, [jobs]);

  const jobHasSubmittedSurvey = (jobId: string) =>
    surveys.some((s: { jobId: string; status: string }) => s.jobId === jobId && s.status === 'submitted');

  const jobHasTR19Report = (jobId: string) => !!tr19Reports[jobId];

  const isTR19Job = (job: Job) => {
    const jobType = (job.jobType || '').toLowerCase();
    const title = (job.title || '').toLowerCase();
    // Keep historical TR19 records visible even if legacy jobs lack explicit TR19 labels.
    return jobType.includes('tr19') || title.includes('tr19') || jobHasTR19Report(job.id);
  };

  const jobsNeedingReport = jobs.filter(
    (j) => isTR19Job(j) && jobHasSubmittedSurvey(j.id) && !jobHasTR19Report(j.id)
  );

  const matchesSearch = (text?: string) =>
    !searchQuery || (text || '').toLowerCase().includes(searchQuery.toLowerCase());

  const jobsByStatus = useMemo(() => {
    const base = jobs.filter(
      (j) =>
        matchesSearch(j.title) ||
        matchesSearch(j.customerName) ||
        matchesSearch(j.customerId) ||
        matchesSearch(j.id) ||
        matchesSearch(j.contactName) ||
        matchesSearch(j.description) ||
        matchesSearch(j.jobType) ||
        matchesSearch((j as Job & { certificateNumber?: string }).certificateNumber) ||
        matchesSearch(j.customerAddress) ||
        matchesSearch(j.customerPostcode) ||
        matchesSearch(j.customerEmail)
    );
    return {
      ALL: base.length,
      PENDING: base.filter((j) => j.status === 'PENDING').length,
      IN_PROGRESS: base.filter((j) => j.status === 'IN_PROGRESS').length,
      COMPLETED: base.filter((j) => j.status === 'COMPLETED').length,
      CANCELLED: base.filter((j) => j.status === 'CANCELLED').length,
    };
  }, [jobs, searchQuery]);

  const filteredJobs = jobs
    .filter(
      (j) =>
        matchesSearch(j.title) ||
        matchesSearch(j.customerName) ||
        matchesSearch(j.customerId) ||
        matchesSearch(j.id) ||
        matchesSearch(j.contactName) ||
        matchesSearch(j.description) ||
        matchesSearch(j.jobType) ||
        matchesSearch((j as Job & { certificateNumber?: string }).certificateNumber) ||
        matchesSearch(j.customerAddress) ||
        matchesSearch(j.customerPostcode) ||
        matchesSearch(j.customerEmail)
    )
    .filter((j) => (statusFilter === 'ALL' ? true : j.status === statusFilter))
    .sort((a, b) => getSiteName(a).localeCompare(getSiteName(b), undefined, { sensitivity: 'base' }));

  const getStatusStyles = (status: JobStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-orange-900/30 text-orange-400 border-orange-800/50';
      case 'IN_PROGRESS':
        return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
      case 'COMPLETED':
        return 'bg-green-900/30 text-green-400 border-green-800/50';
      case 'CANCELLED':
        return 'bg-red-900/30 text-red-400 border-red-800/50';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Jobs</h1>
            <p className="text-gray-500 text-sm font-bold mt-0.5">
              {statusFilter === 'ALL' && `${jobsByStatus.ALL} job${jobsByStatus.ALL !== 1 ? 's' : ''}`}
              {statusFilter === 'PENDING' && `${jobsByStatus.PENDING} pending`}
              {statusFilter === 'IN_PROGRESS' && `${jobsByStatus.IN_PROGRESS} in progress`}
              {statusFilter === 'COMPLETED' && `${jobsByStatus.COMPLETED} completed`}
              {statusFilter === 'CANCELLED' && `${jobsByStatus.CANCELLED} cancelled`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (openAddSiteTypeModal ? openAddSiteTypeModal() : openAddJobModal())}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#111111] border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-all shrink-0"
          >
            <i className="fas fa-building-user"></i>
            <span>Add Job</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'ALL' as const, label: 'All', icon: 'fa-briefcase' },
              { id: 'PENDING' as const, label: 'Pending', icon: 'fa-clock' },
              { id: 'IN_PROGRESS' as const, label: 'In Progress', icon: 'fa-spinner' },
              { id: 'COMPLETED' as const, label: 'Completed', icon: 'fa-check' },
              { id: 'CANCELLED' as const, label: 'Cancelled', icon: 'fa-times' },
            ] as const
          ).map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                statusFilter === id
                  ? id === 'CANCELLED'
                    ? 'bg-red-500/10 border-red-500 text-red-400'
                    : id === 'COMPLETED'
                      ? 'bg-green-500/10 border-green-500 text-green-400'
                      : id === 'IN_PROGRESS'
                        ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                        : id === 'PENDING'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                          : 'bg-[#F2C200]/10 border-[#F2C200] text-[#F2C200]'
                  : 'bg-[#111111] border-[#333333] text-gray-400 hover:border-[#F2C200] hover:text-white'
              }`}
            >
              <i className={`fas ${icon} text-sm`}></i>
              <span>{label}</span>
              <span className="text-[10px] font-black opacity-80">({jobsByStatus[id]})</span>
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-md">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
          <input
            type="text"
            placeholder="Search by site, contact, job ref, certificate #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
          />
        </div>
      </div>

      {jobsNeedingReport.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-black text-[#F2C200] uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-certificate"></i>
            TR19 Certificates
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobsNeedingReport
              .filter(
                (j) =>
                  matchesSearch(j.title) ||
                  matchesSearch(j.customerName) ||
                  matchesSearch(j.customerId) ||
                  matchesSearch(j.id) ||
                  matchesSearch(j.contactName) ||
                  matchesSearch(j.description) ||
                  matchesSearch(j.jobType) ||
                  matchesSearch((j as Job & { certificateNumber?: string }).certificateNumber) ||
                  matchesSearch(j.customerAddress) ||
                  matchesSearch(j.customerPostcode) ||
                  matchesSearch(j.customerEmail)
              )
              .filter((j) => (statusFilter === 'ALL' ? true : j.status === statusFilter))
              .map((job) => (
                <div
                  key={job.id}
                  className="bg-[#1A1A1A] rounded-2xl border border-[#333333] p-6 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-black text-white truncate">{getSiteName(job)}</p>
                      <p className="text-xs text-gray-500">{getJobIdentifierAndService(job)}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-900/40 text-amber-400 text-[10px] font-black uppercase border border-amber-800/50 shrink-0">
                      <i className="fas fa-check mr-1"></i> Needs Report
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Complete micron readings, photos & compliance details</p>
                  <Link
                    to={`/dashboard/jobs/${job.id}/tr19-report`}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-sm bg-amber-500 text-black hover:bg-amber-400 transition-all"
                  >
                    <i className="fas fa-clipboard-check"></i>
                    Fill Out TR19 Report
                  </Link>
                  <div className="flex items-center justify-between pt-4 border-t border-[#333333]">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-gray-500 hover:text-[#F2C200] text-xs font-bold flex items-center gap-1"
                    >
                      <i className="fas fa-camera"></i> Photos
                    </Link>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-gray-500 hover:text-[#F2C200] text-xs font-bold flex items-center gap-1"
                    >
                      <i className="fas fa-info-circle"></i> Details
                    </Link>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-red-900/40 text-red-400 border border-red-800/50 hover:bg-red-800/40 transition-all"
                    >
                      <i className="fas fa-trash-alt text-[10px]"></i>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-x-auto scrollbar-hide">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-black border-b border-[#333333]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Site / Job</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {filteredJobs
              .filter((j) => !jobHasSubmittedSurvey(j.id) || jobHasTR19Report(j.id))
              .map((job) => (
                <tr key={job.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-white">{getSiteName(job)}</p>
                      <p className="text-xs text-gray-500">{getJobIdentifierAndService(job)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{getSiteAddress(job)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-300">{getSiteName(job)}</p>
                    <p className="text-[10px] text-gray-500">{job.customerId || job.id}</p>
                    {job.customerPhone?.trim() ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-gray-400">{job.customerPhone}</span>
                        <PhoneCallButton phone={job.customerPhone} size="sm" />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full border ${getStatusStyles(job.status)}`}>
                      <select
                        value={job.status}
                        onChange={(e) => updateStatus(job.id, e.target.value as JobStatus)}
                        className="bg-transparent text-[10px] font-bold uppercase tracking-widest focus:outline-none cursor-pointer appearance-none pr-4 relative z-10 text-inherit"
                        aria-label={`Update status for job ${job.id}`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                      <i className="fas fa-chevron-down text-[8px] -ml-3 opacity-60"></i>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {jobHasTR19Report(job.id) ? (
                      (() => {
                        const d = new Date(job.warrantyEndDate + (job.warrantyEndDate?.length === 10 ? 'T12:00:00' : ''));
                        const diff = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <span title={d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}>
                            {diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d until next clean`}
                          </span>
                        );
                      })()
                    ) : (
                      new Date(job.startDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {jobHasTR19Report(job.id) ? (
                        <>
                          <button
                            onClick={() => navigate('/dashboard/certificates', { state: { viewReportJobId: job.id } })}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-green-900/40 text-green-400 border border-green-800/50 hover:bg-green-800/40 transition-all"
                          >
                            <i className="fas fa-certificate"></i> View Certificate
                          </button>
                          <Link
                            to={`/dashboard/jobs/${job.id}/tr19-report`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-[#333333] text-[#F2C200] hover:bg-[#F2C200] hover:text-black transition-all"
                          >
                            <i className="fas fa-pen"></i> Edit Report
                          </Link>
                        </>
                      ) : jobHasSubmittedSurvey(job.id) ? (
                        <Link
                          to={`/dashboard/jobs/${job.id}/tr19-report`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 text-black hover:bg-amber-400 transition-all"
                        >
                          Fill Out TR19 Report
                        </Link>
                      ) : (
                        <Link
                          to={`/dashboard/surveys/start/${job.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-[#333333] text-[#F2C200] hover:bg-[#F2C200] hover:text-black transition-all"
                        >
                          Start Survey
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditJobModal(job)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-[#F2C200] text-black hover:brightness-110 transition-all"
                      >
                        <i className="fas fa-pen"></i> Edit Record
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-red-900/40 text-red-400 border border-red-800/50 hover:bg-red-800/40 transition-all"
                        title="Delete job"
                      >
                        <i className="fas fa-trash-alt text-[10px]"></i>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {filteredJobs.filter((j) => !jobHasSubmittedSurvey(j.id) || jobHasTR19Report(j.id)).length === 0 &&
          jobsNeedingReport.filter(
            (j) =>
              (matchesSearch(j.title) || matchesSearch(j.customerName)) &&
              (statusFilter === 'ALL' ? true : j.status === statusFilter)
          ).length === 0 && (
          <div className="px-6 py-16 text-center text-gray-500 font-bold">
            No jobs found. Schedule a job from the Dashboard.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminJobs;
