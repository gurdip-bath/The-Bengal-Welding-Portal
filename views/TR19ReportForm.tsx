import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { Job } from '../types';
import { getSiteName, getJobIdentifierAndService } from '../utils/jobIdentity';

const SURVEYS_STORAGE_KEY = 'bengal_surveys';
const TR19_REPORTS_STORAGE_KEY = 'bengal_tr19_reports';

interface MicronReading {
  location: string;
  preClean: string;
  postClean: string;
}

interface TR19Report {
  jobId: string;
  leadOperativeName: string;
  besaCertNo: string;
  secondOperativeName: string;
  secondOpCertNo: string;
  timeOnSiteStart: string;
  timeOnSiteEnd: string;
  micronReadings: MicronReading[];
  photos: string[];
  cleaningMethods: string[];
  areasCleaned: string[];
  signedBy: string;
  signedAt: string;
  nextRecommendedCleanDate?: string;
}

const TR19_REPORT_LOG_KEY = 'bengal_tr19_report_log';

const DEFAULT_LOCATIONS = [
  'Canopy / extract plenum (behind filters)',
  'Ductwork - 1 metre from canopy',
  'Ductwork - 2 metres from canopy',
  'Discharge duct - downstream of fan',
  'Ductwork - mid-section',
  'Ductwork - termination',
];

const CLEANING_METHODS = [
  'Steam cleaning',
  'Pressure washing',
  'Rotary brush',
  'Manual scraping',
  'Chemical treatment',
];

const AREAS_CLEANED = [
  'Grease filters (removed, cleaned, refitted)',
  'Canopy / Extract plenum',
  'Ductwork (rear)',
  'Discharge ductwork (downstream of fan)',
];

const AdminTR19ReportForm: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { jobs, setJobs } = useAdmin();
  const [step, setStep] = useState(1);

  const job = jobs.find((j) => j.id === jobId);
  const [surveyPhotos, setSurveyPhotos] = useState<string[]>([]);

  const [leadOperativeName, setLeadOperativeName] = useState('');
  const [besaCertNo, setBesaCertNo] = useState('');
  const [secondOperativeName, setSecondOperativeName] = useState('');
  const [secondOpCertNo, setSecondOpCertNo] = useState('');
  const [timeOnSiteStart, setTimeOnSiteStart] = useState('08:00');
  const [timeOnSiteEnd, setTimeOnSiteEnd] = useState('16:00');
  const [micronReadings, setMicronReadings] = useState<MicronReading[]>(
    DEFAULT_LOCATIONS.map((loc) => ({ location: loc, preClean: '', postClean: '' }))
  );
  const [cleaningMethods, setCleaningMethods] = useState<string[]>([]);
  const [areasCleaned, setAreasCleaned] = useState<string[]>([]);
  const [nextRecommendedCleanDate, setNextRecommendedCleanDate] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    const surveys = JSON.parse(localStorage.getItem(SURVEYS_STORAGE_KEY) || '[]');
    const survey = surveys.find((s: { jobId: string }) => s.jobId === jobId);
    if (survey?.photos?.length) setSurveyPhotos(survey.photos);
  }, [jobId]);

  useEffect(() => {
    const reports = JSON.parse(localStorage.getItem(TR19_REPORTS_STORAGE_KEY) || '{}');
    const existing = reports[jobId || ''] as TR19Report | undefined;
    if (existing) {
      setLeadOperativeName(existing.leadOperativeName || '');
      setBesaCertNo(existing.besaCertNo || '');
      setSecondOperativeName(existing.secondOperativeName || '');
      setSecondOpCertNo(existing.secondOpCertNo || '');
      setTimeOnSiteStart(existing.timeOnSiteStart || '08:00');
      setTimeOnSiteEnd(existing.timeOnSiteEnd || '16:00');
      setMicronReadings(existing.micronReadings?.length ? existing.micronReadings : DEFAULT_LOCATIONS.map((loc) => ({ location: loc, preClean: '', postClean: '' })));
      setCleaningMethods(existing.cleaningMethods || []);
      setAreasCleaned(existing.areasCleaned || []);
      setNextRecommendedCleanDate(existing.nextRecommendedCleanDate || '');
    }
  }, [jobId]);

  const getDefaultNextCleanDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  };

  const updateMicron = (idx: number, field: 'preClean' | 'postClean', value: string) => {
    setMicronReadings((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const toggleCleaningMethod = (m: string) => {
    setCleaningMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };
  const toggleAreaCleaned = (a: string) => {
    setAreasCleaned((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const TOTAL_STEPS = 4;
  const getProgress = () => (step / TOTAL_STEPS) * 100;

  const handleSubmit = () => {
    if (!jobId || !job) return;
    const signedAt = new Date().toISOString().split('T')[0];
    const reportRef = `TR19-2026-${jobId.slice(-6).toUpperCase()}`;
    const report: TR19Report = {
      jobId,
      leadOperativeName,
      besaCertNo,
      secondOperativeName,
      secondOpCertNo,
      timeOnSiteStart,
      timeOnSiteEnd,
      micronReadings,
      photos: surveyPhotos,
      cleaningMethods,
      areasCleaned,
      signedBy: leadOperativeName,
      signedAt,
      nextRecommendedCleanDate: nextRecommendedCleanDate || getDefaultNextCleanDate(),
    };
    const reports = JSON.parse(localStorage.getItem(TR19_REPORTS_STORAGE_KEY) || '{}');
    reports[jobId] = report;
    localStorage.setItem(TR19_REPORTS_STORAGE_KEY, JSON.stringify(reports));

    const logEntry = {
      id: `LOG-${Date.now()}`,
      jobId,
      reportRef,
      jobTitle: job.title || job.customerName,
      customerName: job.customerName,
      generatedAt: new Date().toISOString(),
    };
    const log = JSON.parse(localStorage.getItem(TR19_REPORT_LOG_KEY) || '[]');
    localStorage.setItem(TR19_REPORT_LOG_KEY, JSON.stringify([logEntry, ...log]));

    const preMean = micronReadings
      .filter((r) => r.preClean && !isNaN(parseFloat(r.preClean)))
      .reduce((sum, r) => sum + parseFloat(r.preClean), 0);
    const preCount = micronReadings.filter((r) => r.preClean && !isNaN(parseFloat(r.preClean))).length;
    const postMean = micronReadings
      .filter((r) => r.postClean && !isNaN(parseFloat(r.postClean)))
      .reduce((sum, r) => sum + parseFloat(r.postClean), 0);
    const postCount = micronReadings.filter((r) => r.postClean && !isNaN(parseFloat(r.postClean))).length;
    const meanPre = preCount ? preMean / preCount : 0;
    const meanPost = postCount ? postMean / postCount : 0;

    const nextCleanDate = report.nextRecommendedCleanDate || getDefaultNextCleanDate();
    const updatedJob: Job = {
      ...job,
      status: 'COMPLETED',
      technician: leadOperativeName,
      greaseRating: `Pre: ${meanPre.toFixed(1)}µm / Post: ${meanPost.toFixed(1)}µm`,
      certificateNumber: `TR19-2026-${jobId.slice(-6).toUpperCase()}`,
      tr19Compliant: meanPost < 50,
      warrantyEndDate: nextCleanDate,
    };
    setJobs((prev: Job[]) => prev.map((j) => (j.id === jobId ? updatedJob : j)));
    const localJobs = JSON.parse(localStorage.getItem('bengal_jobs') || '[]');
    const idx = localJobs.findIndex((j: { id: string }) => j.id === jobId);
    const updated = idx >= 0 ? localJobs.map((j: { id: string }) => (j.id === jobId ? updatedJob : j)) : [updatedJob, ...localJobs];
    localStorage.setItem('bengal_jobs', JSON.stringify(updated));

    navigate('/dashboard/certificates', { state: { viewReportJobId: jobId } });
  };

  if (!job) {
    return (
      <div className="p-10 text-center text-white">
        Job not found.
      </div>
    );
  }

  const steps = [
    { n: 1, label: 'Details' },
    { n: 2, label: 'Microns' },
    { n: 3, label: 'Photos' },
    { n: 4, label: 'Sign' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F2C200] flex items-center gap-2">
            TR19 Post-Clean Verification Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {getSiteName(job)} — {getJobIdentifierAndService(job)}
          </p>
        </div>
        <button onClick={() => navigate('/dashboard/jobs')} className="text-gray-500 hover:text-white text-xl">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div>
        <p className="text-xs text-gray-500 font-bold mb-1">Overall progress</p>
        <div className="h-2 bg-[#333333] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F2C200] transition-all duration-300"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {steps.map(({ n, label }) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
              step === n ? 'bg-[#333333] text-white' : 'bg-black/50 text-gray-500 hover:text-white'
            }`}
          >
            {n} {label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Operative Details</h3>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Lead Operative Name *</label>
            <input
              value={leadOperativeName}
              onChange={(e) => setLeadOperativeName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">BESA GHO/GHT Cert No. *</label>
            <input
              value={besaCertNo}
              onChange={(e) => setBesaCertNo(e.target.value)}
              placeholder="Certificate number"
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Second Operative Name</label>
            <input
              value={secondOperativeName}
              onChange={(e) => setSecondOperativeName(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Second Op. Cert No.</label>
            <input
              value={secondOpCertNo}
              onChange={(e) => setSecondOpCertNo(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Time On Site - Start *</label>
            <input
              type="time"
              value={timeOnSiteStart}
              onChange={(e) => setTimeOnSiteStart(e.target.value)}
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Time On Site - End *</label>
            <input
              type="time"
              value={timeOnSiteEnd}
              onChange={(e) => setTimeOnSiteEnd(e.target.value)}
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Grease Thickness Measurements (µm)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#333333]">
                  <th className="py-2 text-xs font-bold text-gray-500">Location</th>
                  <th className="py-2 text-xs font-bold text-gray-500">Pre-clean (µm)</th>
                  <th className="py-2 text-xs font-bold text-gray-500">Post-clean (µm)</th>
                </tr>
              </thead>
              <tbody>
                {micronReadings.map((r, i) => (
                  <tr key={i} className="border-b border-[#333333]">
                    <td className="py-2 text-sm text-white">{r.location}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={r.preClean}
                        onChange={(e) => updateMicron(i, 'preClean', e.target.value)}
                        placeholder="0"
                        className="w-20 px-2 py-1.5 bg-black border border-[#333333] rounded text-white text-sm"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={r.postClean}
                        onChange={(e) => updateMicron(i, 'postClean', e.target.value)}
                        placeholder="0"
                        className="w-20 px-2 py-1.5 bg-black border border-[#333333] rounded text-white text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400">Cleaning method(s)</h4>
            <div className="flex flex-wrap gap-2">
              {CLEANING_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleCleaningMethod(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    cleaningMethods.includes(m) ? 'bg-[#F2C200] text-black border-[#F2C200]' : 'border-[#333333] text-gray-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400">Areas cleaned</h4>
            <div className="space-y-2">
              {AREAS_CLEANED.map((a) => (
                <label key={a} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={areasCleaned.includes(a)}
                    onChange={() => toggleAreaCleaned(a)}
                    className="rounded border-[#333333] bg-black text-[#F2C200]"
                  />
                  <span className="text-sm text-white">{a}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Next Recommended Clean Due Date</label>
            <div className="relative">
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={nextRecommendedCleanDate || getDefaultNextCleanDate()}
                onChange={(e) => setNextRecommendedCleanDate(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 bg-black border border-[#333333] rounded-xl text-white text-sm [color-scheme:dark]"
                title="Click to open calendar picker"
              />
              <i className="fas fa-calendar-alt text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Click the calendar icon to pick a date — client can amend based on site conditions</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-in fade-in">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Photographic Evidence</h3>
          <p className="text-xs text-gray-500">Photos from survey</p>
          {surveyPhotos.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {surveyPhotos.map((src, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl overflow-hidden border border-[#333333] cursor-pointer hover:border-[#F2C200] transition-colors"
                    onClick={() => setPhotoPreview(src)}
                  >
                    <img src={src} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              {photoPreview && (
                <div
                  className="fixed inset-0 bg-black/90 z-[600] flex items-center justify-center p-4"
                  onClick={() => setPhotoPreview(null)}
                >
                  <img src={photoPreview} alt="Enlarged" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">No photos from survey.</p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 animate-in fade-in">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Compliance Declaration</h3>
          <p className="text-sm text-gray-400">
            This Post-Clean Verification Report has been prepared in accordance with the BESA TR19 Grease Specification and Technical Bulletin TB/009. The cleaning described herein was carried out by trained and certificated operatives holding current BESA GHO/GHT certification.
          </p>
          <div className="bg-black/50 rounded-xl p-4 border border-[#333333]">
            <p className="text-xs text-gray-500">Lead Operative</p>
            <p className="text-white font-bold">{leadOperativeName || '—'}</p>
            <p className="text-xs text-gray-500 mt-2">Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-6">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-black border border-[#333333] text-gray-300 hover:text-white"
          >
            Back
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 flex items-center gap-2"
          >
            <i className="fas fa-check"></i>
            Submit Report & Generate Certificate
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminTR19ReportForm;
export { TR19_REPORTS_STORAGE_KEY, type TR19Report, type MicronReading };
