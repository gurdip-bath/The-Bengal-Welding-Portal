import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const TR19_REPORT_LOG_KEY = 'bengal_tr19_report_log';

interface ReportLogEntry {
  id: string;
  jobId: string;
  reportRef: string;
  jobTitle?: string;
  customerName?: string;
  generatedAt: string;
}

const AdminReportLog: React.FC = () => {
  const navigate = useNavigate();
  const [logEntries, setLogEntries] = useState<ReportLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TR19_REPORT_LOG_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setLogEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setLogEntries([]);
    }
  }, []);

  const matchesSearch = (e: ReportLogEntry) =>
    !searchQuery ||
    (e.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.jobId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.reportRef || '').toLowerCase().includes(searchQuery.toLowerCase());

  const filteredLog = useMemo(
    () => logEntries.filter(matchesSearch),
    [logEntries, searchQuery]
  );

  const viewReport = (jobId: string) => {
    navigate('/dashboard/certificates', { state: { viewReportJobId: jobId } });
  };

  const editReport = (jobId: string) => {
    navigate(`/dashboard/jobs/${jobId}/tr19-report`);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Report Log</h1>
          <p className="text-gray-500 text-sm font-bold mt-0.5">
            All generated TR19 reports — {logEntries.length} total
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
        <input
          type="text"
          placeholder="Search by site, contact, report ref, job ref..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
        />
      </div>

      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-hidden">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-black border-b border-[#333333]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Report</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Site / Job</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Generated</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {filteredLog.map((entry) => (
              <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-mono font-bold text-white text-sm">{entry.reportRef}</p>
                  <p className="text-xs text-gray-500">{entry.jobId}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-white">{entry.jobTitle || entry.customerName || '—'}</p>
                  <p className="text-xs text-gray-500">{entry.customerName || '—'}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(entry.generatedAt).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => viewReport(entry.jobId)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-green-900/40 text-green-400 border border-green-800/50 hover:bg-green-800/40 transition-all"
                    >
                      View
                    </button>
                    <button
                      onClick={() => editReport(entry.jobId)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-[#333333] text-[#F2C200] hover:bg-[#F2C200] hover:text-black transition-all"
                    >
                      Edit Report
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLog.length === 0 && (
          <div className="px-6 py-16 text-center text-gray-500 font-bold">
            {logEntries.length === 0 ? 'No reports generated yet.' : 'No reports match your search.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportLog;
