import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { createSiteSurvey, updateSiteSurvey, getSiteSurvey } from '../lib/siteSurveys';
import { uploadSiteSurveyMedia, getSignedUrl, type MediaItem } from '../lib/storage';

const SURVEY_TYPE_OPTIONS = [
  'TR19 Grease',
  'Ductwork Inspection',
  'Fire Safety Check',
  'General Quote',
];
const SCOPE_OPTIONS = ['Small', 'Medium', 'Large'];
const PRIORITY_OPTIONS = ['Low', 'Normal', 'Urgent'];

const AdminSiteSurveyForm: React.FC = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!editId;
  const surveyId = useMemo(() => editId ?? crypto.randomUUID(), [editId]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(isEdit);

  const [siteName, setSiteName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [altContactName, setAltContactName] = useState('');
  const [altContactPhone, setAltContactPhone] = useState('');
  const [surveyType, setSurveyType] = useState(SURVEY_TYPE_OPTIONS[0]);
  const [workRequired, setWorkRequired] = useState('');
  const [linearMetres, setLinearMetres] = useState('');
  const [diameterWidthMm, setDiameterWidthMm] = useState('');
  const [heightM, setHeightM] = useState('');
  const [otherMeasurements, setOtherMeasurements] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [estimatedScope, setEstimatedScope] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [internalNotes, setInternalNotes] = useState('');
  const [priority, setPriority] = useState('normal');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!editId) {
      setLoadingForm(false);
      return;
    }
    getSiteSurvey(editId)
      .then((s) => {
        if (!s) {
          setLoadError('Survey not found');
          return;
        }
        setSiteName(s.site_name);
        setAddressLine1(s.address_line1);
        setAddressLine2(s.address_line2 ?? '');
        setCity(s.city);
        setPostcode(s.postcode);
        setContactName(s.contact_name);
        setContactPhone(s.contact_phone);
        setContactEmail(s.contact_email ?? '');
        setAltContactName(s.alt_contact_name ?? '');
        setAltContactPhone(s.alt_contact_phone ?? '');
        setSurveyType(s.survey_type);
        setWorkRequired(s.work_required);
        setLinearMetres(s.linear_metres ?? '');
        setDiameterWidthMm(s.diameter_width_mm ?? '');
        setHeightM(s.height_m ?? '');
        setOtherMeasurements(s.other_measurements ?? '');
        setAccessNotes(s.access_notes ?? '');
        setSpecialRequirements(s.special_requirements ?? '');
        setEstimatedScope(s.estimated_scope ?? '');
        setMedia(s.media ?? []);
        setInternalNotes(s.internal_notes ?? '');
        setPriority(s.priority ?? 'normal');
      })
      .catch(() => setLoadError('Failed to load survey'))
      .finally(() => setLoadingForm(false));
  }, [editId]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setError(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadingIndex(media.length + i);
      try {
        const result = await uploadSiteSurveyMedia(surveyId, file);
        const newItem: MediaItem = { type: 'image', path: result.path, name: result.name };
        setMedia((prev) => [...prev, newItem]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Photo upload failed');
      } finally {
        setUploadingIndex(null);
      }
    }
    e.target.value = '';
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setError(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadingIndex(media.length + i);
      try {
        const result = await uploadSiteSurveyMedia(surveyId, file);
        const newItem: MediaItem = { type: 'video', path: result.path, name: result.name };
        setMedia((prev) => [...prev, newItem]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Video upload failed');
      } finally {
        setUploadingIndex(null);
      }
    }
    e.target.value = '';
  };

  const removeMedia = (idx: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = (): boolean => {
    if (!siteName.trim()) {
      setError('Site name is required');
      return false;
    }
    if (!addressLine1.trim()) {
      setError('Address is required');
      return false;
    }
    if (!city.trim()) {
      setError('City/Town is required');
      return false;
    }
    if (!postcode.trim()) {
      setError('Postcode is required');
      return false;
    }
    if (!contactName.trim()) {
      setError('Contact name is required');
      return false;
    }
    if (!contactPhone.trim()) {
      setError('Contact phone is required');
      return false;
    }
    if (!workRequired.trim()) {
      setError('Description of work required is required');
      return false;
    }
    return true;
  };

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      id: session?.user?.id ?? null,
      name: session?.user?.user_metadata?.name ?? session?.user?.email ?? null,
    };
  };

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    setError(null);
    if (status === 'submitted' && !validate()) return;
    if (status === 'draft' && !siteName.trim()) {
      setError('Site name is required to save');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        site_name: siteName.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        city: city.trim(),
        postcode: postcode.trim(),
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim() || null,
        alt_contact_name: altContactName.trim() || null,
        alt_contact_phone: altContactPhone.trim() || null,
        survey_type: surveyType,
        work_required: workRequired.trim(),
        linear_metres: linearMetres.trim() || null,
        diameter_width_mm: diameterWidthMm.trim() || null,
        height_m: heightM.trim() || null,
        other_measurements: otherMeasurements.trim() || null,
        access_notes: accessNotes.trim() || null,
        special_requirements: specialRequirements.trim() || null,
        estimated_scope: estimatedScope || null,
        media,
        internal_notes: internalNotes.trim() || null,
        priority: priority || null,
        status,
      };

      if (isEdit && editId) {
        await updateSiteSurvey(editId, payload);
      } else {
        const { id, name } = await getCurrentUser();
        await createSiteSurvey(payload, id ?? undefined, name ?? undefined, surveyId);
      }
      navigate('/dashboard/tr19');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save survey');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 bg-black border border-[#333333] rounded-xl text-white text-sm focus:border-[#F2C200] focus:outline-none';
  const labelCls = 'block text-xs font-bold text-gray-400 mb-1';
  const sectionCls = 'space-y-3';
  const sectionTitleCls = 'text-[10px] font-black text-[#F2C200] uppercase tracking-widest';

  if (loadingForm) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-2xl text-[#F2C200]"></i>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-4">
        <p className="text-red-400 font-bold">{loadError}</p>
        <button
          onClick={() => navigate('/dashboard/tr19')}
          className="px-6 py-3 rounded-xl font-bold bg-[#333333] text-white"
        >
          Back to TR19
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F2C200] flex items-center gap-2">
            <i className="fas fa-clipboard-list"></i>
            {isEdit ? 'Edit TR19 Site' : 'Add TR19 Site'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Site details, contact details, requirements and media
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/tr19')}
          className="text-gray-500 hover:text-white text-xl"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {/* SITE DETAILS */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Site Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Site Name *</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Mick's Café"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Address Line 1 *</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className={inputCls}
              placeholder="Street address"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Address Line 2</label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className={inputCls}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className={labelCls}>City/Town *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputCls}
              placeholder="City"
            />
          </div>
          <div>
            <label className={labelCls}>Postcode *</label>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className={inputCls}
              placeholder="Postcode"
            />
          </div>
        </div>
      </div>

      {/* CONTACT DETAILS */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Contact Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Contact Name *</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={inputCls}
              placeholder="Primary contact"
            />
          </div>
          <div>
            <label className={labelCls}>Contact Phone *</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={inputCls}
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className={labelCls}>Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputCls}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className={labelCls}>Alt Contact Name</label>
            <input
              type="text"
              value={altContactName}
              onChange={(e) => setAltContactName(e.target.value)}
              className={inputCls}
              placeholder="Optional"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Alt Contact Phone</label>
            <input
              type="tel"
              value={altContactPhone}
              onChange={(e) => setAltContactPhone(e.target.value)}
              className={inputCls}
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      {/* SURVEY REQUIREMENTS */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Survey Requirements</h2>
        <div>
          <label className={labelCls}>Survey Type *</label>
          <select
            value={surveyType}
            onChange={(e) => setSurveyType(e.target.value)}
            className={inputCls}
          >
            {SURVEY_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Description of Work Required *</label>
          <textarea
            value={workRequired}
            onChange={(e) => setWorkRequired(e.target.value)}
            rows={4}
            className={`${inputCls} resize-none`}
            placeholder="What is required? Describe the scope..."
          />
        </div>
      </div>

      {/* MEASUREMENTS */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Measurements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Linear Metres</label>
            <input
              type="text"
              value={linearMetres}
              onChange={(e) => setLinearMetres(e.target.value)}
              className={inputCls}
              placeholder="e.g. 25"
            />
          </div>
          <div>
            <label className={labelCls}>Diameter/Width (mm)</label>
            <input
              type="text"
              value={diameterWidthMm}
              onChange={(e) => setDiameterWidthMm(e.target.value)}
              className={inputCls}
              placeholder="e.g. 300"
            />
          </div>
          <div>
            <label className={labelCls}>Height (m)</label>
            <input
              type="text"
              value={heightM}
              onChange={(e) => setHeightM(e.target.value)}
              className={inputCls}
              placeholder="e.g. 3.5"
            />
          </div>
          <div>
            <label className={labelCls}>Other Measurements</label>
            <input
              type="text"
              value={otherMeasurements}
              onChange={(e) => setOtherMeasurements(e.target.value)}
              className={inputCls}
              placeholder="Non-standard dimensions"
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Estimated Scope</label>
          <select
            value={estimatedScope}
            onChange={(e) => setEstimatedScope(e.target.value)}
            className={inputCls}
          >
            <option value="">Select...</option>
            {SCOPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ACCESS & SPECIAL */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Access & Special Requirements</h2>
        <div>
          <label className={labelCls}>Access Notes</label>
          <textarea
            value={accessNotes}
            onChange={(e) => setAccessNotes(e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
            placeholder="e.g. Rear entrance, code 1234"
          />
        </div>
        <div>
          <label className={labelCls}>Special Requirements</label>
          <textarea
            value={specialRequirements}
            onChange={(e) => setSpecialRequirements(e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
            placeholder="Out of hours, PPE, scaffolding..."
          />
        </div>
      </div>

      {/* PHOTOS & VIDEOS */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Photos & Videos</h2>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handlePhotoChange}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          multiple
          onChange={handleVideoChange}
          className="hidden"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingIndex !== null}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-[#111111] border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-all disabled:opacity-50"
          >
            <i className="fas fa-camera"></i>
            Upload Photos
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploadingIndex !== null}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-[#111111] border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-all disabled:opacity-50"
          >
            <i className="fas fa-video"></i>
            Upload Videos
          </button>
        </div>
        {uploadingIndex !== null && (
          <p className="text-xs text-amber-500 font-bold">
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Uploading...
          </p>
        )}
        {media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {media.map((m, i) => (
              <MediaPreview key={i} item={m} onRemove={() => removeMedia(i)} />
            ))}
          </div>
        )}
      </div>

      {/* INTERNAL NOTES */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Internal Notes</h2>
        <div>
          <label className={labelCls}>Internal Notes (admin only)</label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
            placeholder="Admin-only notes"
          />
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={inputCls}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt.toLowerCase()}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap gap-3 pt-4">
        <button
          onClick={() => navigate('/dashboard/tr19')}
          disabled={loading}
          className="px-6 py-3 rounded-xl font-bold text-sm bg-[#333333] text-gray-300 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() => handleSubmit('draft')}
          disabled={loading}
          className="px-6 py-3 rounded-xl font-bold text-sm bg-black border border-[#333333] text-white hover:border-[#F2C200] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit('submitted')}
          disabled={loading}
          className="px-6 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-colors flex items-center gap-2 shadow-lg shadow-[#F2C2001A] disabled:opacity-50"
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
          Submit Survey
        </button>
      </div>
    </div>
  );
};

function MediaPreview({ item, onRemove }: { item: MediaItem; onRemove: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(item.type === 'image');

  React.useEffect(() => {
    if (item.type === 'image') {
      getSignedUrl(item.path)
        .then(setImageUrl)
        .finally(() => setLoading(false));
    }
  }, [item.type, item.path]);

  if (item.type === 'video') {
    return (
      <div className="relative group aspect-square rounded-xl border border-[#333333] bg-black flex items-center justify-center overflow-hidden">
        <i className="fas fa-video text-2xl text-gray-600"></i>
        <span className="text-[10px] text-gray-500 absolute bottom-1 left-1 right-1 truncate">{item.name}</span>
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="relative group aspect-square rounded-xl border border-[#333333] overflow-hidden">
      {loading ? (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <i className="fas fa-spinner fa-spin text-[#F2C200]"></i>
        </div>
      ) : imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <i className="fas fa-image text-gray-600"></i>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

export default AdminSiteSurveyForm;
