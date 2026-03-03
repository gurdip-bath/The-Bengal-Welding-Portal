import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Job } from '../types';
import { useAdmin } from '../contexts/AdminContext';

const SURVEYS_STORAGE_KEY = 'bengal_surveys';

interface Survey {
  id: string;
  jobId: string;
  jobTitle: string;
  customerName: string;
  customerAddress: string;
  postcode: string;
  kitchenUse: string;
  linearMetres: string;
  diameterWidth: string;
  frequency: string;
  riskGrade: string;
  accessDifficulty: string;
  outOfHoursRequired: boolean;
  workingAtHeight: boolean;
  confinedSpaceEntry: boolean;
  greaseRating: number;
  visualCondition: string;
  photos: string[];
  notes: string;
  status: 'draft' | 'submitted';
  submittedAt?: string;
}

const KITCHEN_USE_OPTIONS = ['Light Use 1-6hrs/day', 'Moderate Use 6-12hrs/day', 'Heavy Use 12hrs+/day'];
const FREQUENCY_OPTIONS = ['3 months — Light Use', '6 months — Moderate Use', '12 months — Heavy Use'];
const RISK_GRADE_OPTIONS = ['Low Risk', 'Medium Risk', 'High Risk'];
const ACCESS_OPTIONS = ['Easy', 'Medium', 'Hard'];
const VISUAL_CONDITION_OPTIONS = [
  'Clean — No deposits',
  'Fair — Some deposits, serviceable',
  'Poor — Heavy deposits, requires attention',
  'Critical — Excessive build-up',
];
const GREASE_OPTIONS = [
  { value: 0, label: 'Clean', desc: 'No grease deposits present' },
  { value: 1, label: 'Light Film', desc: 'Thin film, easily wiped' },
  { value: 2, label: 'Moderate', desc: 'Visible build-up, tacky to touch' },
  { value: 3, label: 'Heavy', desc: 'Thick deposits, potential fire risk' },
  { value: 4, label: 'Critical', desc: 'Excessive build-up, immediate action required' },
];

const AdminSurveyForm: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { jobs } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);

  let job = jobs.find((j) => j.id === jobId);
  if (!job && jobId) {
    const surveys = JSON.parse(localStorage.getItem(SURVEYS_STORAGE_KEY) || '[]');
    const survey = surveys.find((s: { jobId: string }) => s.jobId === jobId);
    if (survey) {
      job = {
        id: survey.jobId,
        title: survey.jobTitle,
        customerName: survey.customerName,
        customerAddress: survey.customerAddress,
        customerPostcode: survey.postcode,
      } as Job;
    }
  }

  const [siteDisplay, setSiteDisplay] = useState('');
  const [kitchenUse, setKitchenUse] = useState(KITCHEN_USE_OPTIONS[1]);
  const [linearMetres, setLinearMetres] = useState('');
  const [diameterWidth, setDiameterWidth] = useState('');
  const [frequency, setFrequency] = useState(FREQUENCY_OPTIONS[1]);
  const [riskGrade, setRiskGrade] = useState('');
  const [accessDifficulty, setAccessDifficulty] = useState(ACCESS_OPTIONS[0]);
  const [outOfHoursRequired, setOutOfHoursRequired] = useState(false);
  const [workingAtHeight, setWorkingAtHeight] = useState(false);
  const [confinedSpaceEntry, setConfinedSpaceEntry] = useState(false);
  const [greaseRating, setGreaseRating] = useState<number | null>(null);
  const [visualCondition, setVisualCondition] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (job) {
      setSiteDisplay(`${job.title || job.customerName} — ${job.customerName || '—'}`);
    }
  }, [job]);

  const getSurveys = (): Survey[] => {
    try {
      const stored = localStorage.getItem(SURVEYS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveSurvey = (status: 'draft' | 'submitted') => {
    if (!job) return;
    const surveyId = `SUR-${Date.now()}`;
    const surveys = getSurveys();
    const newSurvey: Survey = {
      id: surveyId,
      jobId: job.id,
      jobTitle: job.title || '',
      customerName: job.customerName || '',
      customerAddress: job.customerAddress || '',
      postcode: job.customerPostcode || '',
      kitchenUse,
      linearMetres,
      diameterWidth,
      frequency,
      riskGrade,
      accessDifficulty,
      outOfHoursRequired,
      workingAtHeight,
      confinedSpaceEntry,
      greaseRating: greaseRating ?? 0,
      visualCondition,
      photos,
      notes,
      status,
      submittedAt: status === 'submitted' ? new Date().toISOString() : undefined,
    };
    localStorage.setItem(SURVEYS_STORAGE_KEY, JSON.stringify([newSurvey, ...surveys]));
    navigate('/dashboard/jobs');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result as string].slice(0, 20));
      };
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  if (!job) {
    return (
      <div className="p-10 text-center text-white">
        Job not found.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F2C200] flex items-center gap-2">
            <i className="fas fa-file-alt"></i>
            New TR19 Grease Survey
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            BESA TR19® Grease Specification — Kitchen Extract Ductwork Assessment
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/surveys')}
          className="text-gray-500 hover:text-white text-xl"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Offline tip */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#333333] text-xs text-gray-400">
        <i className="fas fa-circle-info text-[#F2C200] shrink-0"></i>
        <p>
          <strong className="text-gray-300">Offline-friendly:</strong> Open the app and log in before visiting sites with poor signal.
          Surveys save to your device and work without connection.
        </p>
      </div>

      {/* SITE DETAILS */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-black text-[#F2C200] uppercase tracking-widest">Site Details</h2>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Site *</label>
          <input
            type="text"
            value={siteDisplay}
            readOnly
            className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm"
          />
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 space-y-2">
          <p className="text-xs text-gray-400">Client: <span className="text-white font-bold">{job.customerName || '—'}</span></p>
          <p className="text-xs text-gray-400">Address: <span className="text-white">{job.customerAddress || '—'}</span></p>
          <p className="text-xs text-gray-400">Postcode: <span className="text-white">{job.customerPostcode || '—'}</span></p>
          <p className="text-xs text-gray-400">Kitchen Use: <span className="text-white">{kitchenUse}</span></p>
        </div>
      </div>

      {/* DUCT MEASUREMENTS */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-black text-[#F2C200] uppercase tracking-widest">Duct Measurements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Linear Metres *</label>
            <input
              type="text"
              value={linearMetres}
              onChange={(e) => setLinearMetres(e.target.value)}
              placeholder="Enter length"
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Diameter/Width (mm) *</label>
            <input
              type="text"
              value={diameterWidth}
              onChange={(e) => setDiameterWidth(e.target.value)}
              placeholder="Enter size"
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Frequency (months) *</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <p className="text-[10px] text-gray-500 mt-1">Auto-suggested from kitchen use: {kitchenUse}</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Kitchen Use</label>
          <select
            value={kitchenUse}
            onChange={(e) => setKitchenUse(e.target.value)}
            className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none"
          >
            {KITCHEN_USE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* RISK & ACCESS ASSESSMENT */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-black text-[#F2C200] uppercase tracking-widest">Risk & Access Assessment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Risk Grade *</label>
            <select
              value={riskGrade}
              onChange={(e) => setRiskGrade(e.target.value)}
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none"
            >
              <option value="">Select...</option>
              {RISK_GRADE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Access Difficulty *</label>
            <select
              value={accessDifficulty}
              onChange={(e) => setAccessDifficulty(e.target.value)}
              className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none"
            >
              {ACCESS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { key: 'outOfHoursRequired', label: 'Out of hours required', value: outOfHoursRequired, set: setOutOfHoursRequired },
            { key: 'workingAtHeight', label: 'Working at height', sub: 'Duct access requires elevated working platform or ladder', value: workingAtHeight, set: setWorkingAtHeight },
            { key: 'confinedSpaceEntry', label: 'Confined space entry', sub: 'Access involves enclosed or restricted spaces requiring permit', value: confinedSpaceEntry, set: setConfinedSpaceEntry },
          ].map(({ key, label, sub, value, set }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-[#333333]">
              <div>
                <p className="text-sm font-bold text-white">{label}</p>
                {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
              </div>
              <button
                onClick={() => set(!value)}
                className={`w-12 h-6 rounded-full relative transition-colors ${value ? 'bg-[#F2C200]' : 'bg-[#333333]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${value ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* GREASE & CONDITION RATING */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-black text-[#F2C200] uppercase tracking-widest">Grease & Condition Rating</h2>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2">Grease Thickness Rating (0-4) *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GREASE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGreaseRating(opt.value)}
                className={`p-3 rounded-xl text-left border transition-colors ${
                  greaseRating === opt.value
                    ? 'bg-[#F2C200] text-black border-[#F2C200]'
                    : 'bg-[#1A1A1A] text-white border-[#333333] hover:border-[#F2C200]'
                }`}
              >
                <span className="font-black text-sm">{opt.value} {opt.label}</span>
                <p className="text-[10px] opacity-80 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Visual Condition *</label>
          <select
            value={visualCondition}
            onChange={(e) => setVisualCondition(e.target.value)}
            className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none"
          >
            <option value="">Select...</option>
            {VISUAL_CONDITION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PHOTOGRAPHIC EVIDENCE */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-black text-[#F2C200] uppercase tracking-widest">
          Photographic Evidence <span className={`ml-2 ${photos.length < 4 ? 'text-amber-500' : 'text-green-500'}`}>{photos.length}/4 min required</span>
        </h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full p-8 rounded-xl border-2 border-dashed border-[#333333] hover:border-[#F2C200] transition-colors flex flex-col items-center gap-2 text-gray-500 hover:text-[#F2C200]"
        >
          <i className="fas fa-camera text-2xl"></i>
          <span className="font-bold">Upload Before & After Photos</span>
          <span className="text-xs">Drag & drop or tap to select • Min 4 photos required</span>
        </button>
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative group">
                <img
                  src={p}
                  alt={`Photo ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-xl border border-[#333333] cursor-pointer hover:border-[#F2C200]"
                  onClick={() => setPhotoPreview(p)}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-gray-400">Notes / Issues Found</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record any defects, access issues, or recommendations..."
          rows={4}
          className="w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none resize-none"
        />
      </div>

      {/* Photo preview modal */}
      {photoPreview && (
        <div
          className="fixed inset-0 bg-black/90 z-[600] flex items-center justify-center p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <img src={photoPreview} alt="Enlarged" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4">
        <button
          onClick={() => navigate('/dashboard/surveys')}
          className="px-6 py-3 rounded-xl font-bold text-sm bg-[#333333] text-gray-300 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => saveSurvey('draft')}
          className="px-6 py-3 rounded-xl font-bold text-sm bg-black border border-[#333333] text-white hover:border-[#F2C200] transition-colors flex items-center gap-2"
        >
          <i className="fas fa-save"></i>
          Save as Draft
        </button>
        <button
          onClick={() => saveSurvey('submitted')}
          className="px-6 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-colors flex items-center gap-2 shadow-lg shadow-[#F2C2001A]"
        >
          <i className="fas fa-check"></i>
          Submit Survey
        </button>
      </div>
    </div>
  );
};

export default AdminSurveyForm;
