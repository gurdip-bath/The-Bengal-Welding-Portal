
import React from 'react';
import { Link } from 'react-router-dom';
import { Job } from '../types';
import { useAdmin } from '../contexts/AdminContext';

const AdminDashboardHome: React.FC = () => {
  const { jobs, quotes, openAddJobModal } = useAdmin();
  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  const uniqueSites = new Set(jobs.map((j) => j.customerId)).size;
  const overdueJobs = jobs.filter((j) => new Date(j.warrantyEndDate) < now && new Date(j.warrantyEndDate) > new Date(0));
  const dueSoonJobs = jobs.filter((j) => {
    const expiry = new Date(j.warrantyEndDate);
    return expiry > now && expiry <= ninetyDaysFromNow;
  });
  const pendingQuotes = quotes.filter((q) => q.status === 'NEW' || q.status === 'QUOTED');

  const renewalItems = [...overdueJobs, ...dueSoonJobs]
    .map((j) => ({
      ...j,
      isOverdue: new Date(j.warrantyEndDate) < now,
      daysText: (() => {
        const diff = Math.floor((new Date(j.warrantyEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d left`;
      })(),
    }))
    .sort((a, b) => new Date(a.warrantyEndDate).getTime() - new Date(b.warrantyEndDate).getTime());

  const recentCertificates = jobs
    .filter((j) => new Date(j.warrantyEndDate) > now)
    .sort((a, b) => new Date(b.warrantyEndDate).getTime() - new Date(a.warrantyEndDate).getTime())
    .slice(0, 6);

  const getPostcode = (job: Job) =>
    job.customerPostcode || (job.customerAddress ? job.customerAddress.split(',').pop()?.trim() || '' : '');

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
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
          <button
            onClick={openAddJobModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F2C2001A]"
          >
            <i className="fas fa-plus"></i>
            <i className="fas fa-file-certificate"></i>
            <span>New Certificate</span>
          </button>
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
                to="/dashboard/certificates"
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
                to={`/jobs/${cert.id}`}
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
        <button
          onClick={openAddJobModal}
          className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#111111] border border-[#333333] hover:border-[#F2C200] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200] mb-3 group-hover:bg-[#F2C200]/20 transition-colors">
            <i className="fas fa-certificate text-xl"></i>
          </div>
          <span className="text-sm font-bold text-white group-hover:text-[#F2C200] transition-colors">
            New Certificate
          </span>
        </button>
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
    </div>
  );
};

export default AdminDashboardHome;
