import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { listSiteSurveys, deleteSiteSurvey } from '../lib/siteSurveys';
import type { SiteSurvey } from '../lib/siteSurveys';

const SURVEYS_STORAGE_KEY = 'bengal_surveys';

interface Survey {
  id: string;
  jobId: string;
  jobTitle: string;
  customerName: string;
  customerAddress?: string;
  postcode?: string;
  linearMetres?: string;
  greaseRating?: number;
  status: 'draft' | 'submitted';
  submittedAt?: string;
}

const AdminSurveys: React.FC = () => {
  const { jobs } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [siteSurveys, setSiteSurveys] = useState<SiteSurvey[]>([]);
  const [siteSurveysLoading, setSiteSurveysLoading] = useState(true);
  const [quoteModal, setQuoteModal] = useState<{ survey: Survey; jobAmount: number } | null>(null);
  const [quotePrice, setQuotePrice] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SURVEYS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setSurveys(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSurveys([]);
    }
  }, []);

  useEffect(() => {
    listSiteSurveys()
      .then(setSiteSurveys)
      .catch(() => setSiteSurveys([]))
      .finally(() => setSiteSurveysLoading(false));
  }, []);

  const submittedSurveys = surveys.filter((s) => s.status === 'submitted');
  const matchesSearch = (s: Survey) =>
    !searchQuery ||
    (s.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.jobId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.customerAddress || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.postcode || '').toLowerCase().includes(searchQuery.toLowerCase());

  const filteredSurveys = useMemo(
    () => submittedSurveys.filter(matchesSearch),
    [submittedSurveys, searchQuery]
  );

  const getJobForSurvey = (jobId: string) => jobs.find((j) => j.id === jobId);

  const handleDeleteSurvey = (surveyId: string) => {
    if (!window.confirm('Delete this survey?')) return;
    const updated = surveys.filter((s) => s.id !== surveyId);
    setSurveys(updated);
    localStorage.setItem(SURVEYS_STORAGE_KEY, JSON.stringify(updated));
  };

  const openQuoteModal = (survey: Survey) => {
    const job = getJobForSurvey(survey.jobId);
    setQuoteModal({ survey, jobAmount: job?.amount ?? 0 });
    setQuotePrice(String(job?.amount ?? 0));
  };

  const sendQuoteEmail = () => {
    if (!quoteModal) return;
    const job = getJobForSurvey(quoteModal.survey.jobId);
    const email = job?.customerEmail || '';
    const price = parseFloat(quotePrice) || quoteModal.jobAmount;
    const subject = encodeURIComponent(`TR19 Quote — ${quoteModal.survey.jobTitle || quoteModal.survey.customerName}`);
    const body = encodeURIComponent(
      `Dear ${quoteModal.survey.customerName},\n\nThank you for your survey. Please find your quote below.\n\n` +
        `Site: ${quoteModal.survey.jobTitle || quoteModal.survey.customerName}\n` +
        `Client: ${quoteModal.survey.customerName}\n` +
        `Quote Amount: £${price.toLocaleString()}\n\n` +
        `Please reply to accept or discuss.\n\nBest regards`
    );
    window.location.href = `mailto:${email || 'customer@example.com'}?subject=${subject}&body=${body}`;
    setQuoteModal(null);
  };

  const getGreaseLabel = (rating: number | undefined) => {
    if (rating === undefined) return '—';
    const severity = rating >= 2 ? 'HIGH' : 'LOW';
    return `${rating}/4 ${severity}`;
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Surveys</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/jobs"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-[#111111] border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-all"
          >
            <i className="fas fa-briefcase"></i>
            TR19 from Job
          </Link>
          <Link
            to="/dashboard/surveys/add"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-all shadow-lg shadow-[#F2C2001A]"
          >
            <i className="fas fa-plus"></i>
            Add Site Survey
          </Link>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
        <input
          type="text"
          placeholder="Search by site, contact, job ref..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
        />
      </div>

      {/* Site Surveys (Supabase) */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider">Site Surveys</h2>
        {siteSurveysLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : siteSurveys.length === 0 ? (
          <p className="text-sm text-gray-500">No site surveys yet. Click &quot;Add Site Survey&quot; to create one.</p>
        ) : (
          <div className="space-y-3">
            {siteSurveys
              .filter((s) => !searchQuery || 
                s.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.postcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
              .map((s) => (
                <div
                  key={s.id}
                  className="bg-[#111111] rounded-2xl border border-[#333333] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-black text-white truncate">{s.site_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${s.status === 'submitted' ? 'bg-green-900/30 text-green-400 border border-green-800/50' : 'bg-amber-900/30 text-amber-400 border border-amber-800/50'}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{s.contact_name} — {s.contact_phone}</p>
                    <p className="text-xs text-gray-500">{s.address_line1}, {s.city} {s.postcode}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.survey_type} — {s.work_required.slice(0, 80)}{s.work_required.length > 80 ? '...' : ''}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Link
                        to={`/dashboard/surveys/edit/${s.id}`}
                        className="text-[#F2C200] hover:underline text-xs font-bold flex items-center gap-1"
                      >
                        <i className="fas fa-pencil-alt"></i> Edit
                      </Link>
                      <button
                        onClick={async () => {
                        if (!window.confirm('Delete this site survey?')) return;
                        try {
                          await deleteSiteSurvey(s.id);
                          setSiteSurveys((prev) => prev.filter((x) => x.id !== s.id));
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Failed to delete');
                        }
                      }}
                        className="text-red-500 hover:text-red-400 text-xs font-bold flex items-center gap-1"
                      >
                        <i className="fas fa-trash-alt"></i> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* TR19 Surveys (legacy localStorage) */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider">TR19 Surveys</h2>
        {submittedSurveys.length > 0 && (
          <p className="text-xs text-gray-500 font-bold">
            Go to <Link to="/dashboard/jobs" className="text-[#F2C200] hover:underline">Jobs</Link> to fill out the TR19 report and generate the certificate.
          </p>
        )}

      {filteredSurveys.length === 0 ? (
          <div className="bg-[#111111] rounded-2xl border border-[#333333] p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200] mx-auto mb-4">
              <i className="fas fa-clipboard-list text-3xl"></i>
            </div>
            <p className="text-gray-400 font-bold">
              {submittedSurveys.length === 0 ? 'No surveys yet.' : 'No surveys match your search.'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {submittedSurveys.length === 0
                ? 'Start a survey from the Jobs page.'
                : 'Go to Jobs to start a new survey.'}
            </p>
            {submittedSurveys.length === 0 && (
              <Link
                to="/dashboard/jobs"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl font-bold text-xs bg-[#F2C200] text-black hover:brightness-110"
              >
                Go to Jobs
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSurveys.map((s) => {
              const job = getJobForSurvey(s.jobId);
              const siteName = s.jobTitle || job?.title || s.customerName || 'TR19 Survey';
              const clientName = s.customerName || job?.customerName || '—';
              const linearM = s.linearMetres || job?.ductLength || '—';
              const greaseLabel = getGreaseLabel(s.greaseRating);
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-black text-gray-900 truncate">{siteName}</h3>
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase shrink-0">
                        APPROVED
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{clientName}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-700 font-bold">{linearM}m</span>
                      <span className="text-red-600 font-black">Grease: {greaseLabel}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <Link
                        to={`/dashboard/surveys/start/${s.jobId}`}
                        className="text-gray-500 hover:text-gray-700 text-xs font-bold flex items-center gap-1"
                      >
                        <i className="fas fa-pencil-alt"></i> Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteSurvey(s.id)}
                        className="text-red-500 hover:text-red-600 text-xs font-bold flex items-center gap-1"
                      >
                        <i className="fas fa-trash-alt"></i> Delete
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => openQuoteModal(s)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white border-2 border-gray-300 text-gray-800 hover:border-[#F2C200] hover:bg-[#F2C200]/5 transition-all shrink-0"
                  >
                    Quote <i className="fas fa-arrow-right text-xs"></i>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quote modal - send to client via email */}
      {quoteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Send Quote to Client</h2>
            <p className="text-sm text-gray-400">
              {quoteModal.survey.customerName} — {quoteModal.survey.jobTitle || 'TR19 Survey'}
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Quote Amount (£)</label>
              <input
                type="number"
                value={quotePrice}
                onChange={(e) => setQuotePrice(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white focus:border-[#F2C200] outline-none"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-gray-500">
              Opens your email client with the quote pre-filled. Ensure the customer email is set on the job.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setQuoteModal(null)}
                className="flex-1 py-3 rounded-xl font-bold border border-[#333333] text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={sendQuoteEmail}
                className="flex-1 py-3 rounded-xl font-bold bg-[#F2C200] text-black hover:brightness-110"
              >
                Open Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSurveys;
