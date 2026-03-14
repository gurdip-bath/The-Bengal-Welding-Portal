import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listSiteSurveys, deleteSiteSurvey } from '../lib/siteSurveys';
import type { SiteSurvey } from '../lib/siteSurveys';

const AdminTR19: React.FC = () => {
  const [siteSurveys, setSiteSurveys] = useState<SiteSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSurveys = () => {
    setLoading(true);
    listSiteSurveys()
      .then(setSiteSurveys)
      .catch(() => setSiteSurveys([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  const filtered = siteSurveys.filter(
    (s) =>
      !searchQuery ||
      s.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.postcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address_line1.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (s: SiteSurvey) => {
    if (!window.confirm(`Delete TR19 site "${s.site_name}"?`)) return;
    try {
      await deleteSiteSurvey(s.id);
      setSiteSurveys((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">TR19</h1>
          <p className="text-gray-500 text-sm font-bold mt-0.5">
            Add and manage TR19 sites with access info and survey details
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/jobs"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-[#111111] border border-[#333333] text-gray-300 hover:border-[#F2C200] hover:text-white transition-all"
          >
            <i className="fas fa-briefcase"></i>
            TR19 from Job
          </Link>
          <Link
            to="/dashboard/tr19/add"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-all shadow-lg shadow-[#F2C2001A]"
          >
            <i className="fas fa-plus"></i>
            Add TR19 Site
          </Link>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
        <input
          type="text"
          placeholder="Search by site, contact, postcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-[#111111] rounded-2xl border border-[#333333] p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200] mx-auto mb-4">
              <i className="fas fa-certificate text-3xl"></i>
            </div>
            <p className="text-gray-400 font-bold">
              {siteSurveys.length === 0 ? 'No TR19 sites yet.' : 'No TR19 sites match your search.'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {siteSurveys.length === 0
                ? 'Click "Add TR19 Site" to add a site with access info and survey details.'
                : 'Try a different search.'}
            </p>
            {siteSurveys.length === 0 && (
              <Link
                to="/dashboard/tr19/add"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl font-bold text-xs bg-[#F2C200] text-black hover:brightness-110"
              >
                Add TR19 Site
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="bg-[#111111] rounded-2xl border border-[#333333] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-black text-white truncate">{s.site_name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${
                        s.status === 'submitted'
                          ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                          : 'bg-amber-900/30 text-amber-400 border border-amber-800/50'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">
                    {s.contact_name} — {s.contact_phone}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.address_line1}, {s.city} {s.postcode}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {s.survey_type} — {s.work_required.slice(0, 80)}
                    {s.work_required.length > 80 ? '...' : ''}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <Link
                      to={`/dashboard/tr19/edit/${s.id}`}
                      className="text-[#F2C200] hover:underline text-xs font-bold flex items-center gap-1"
                    >
                      <i className="fas fa-pencil-alt"></i> Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(s)}
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
    </div>
  );
};

export default AdminTR19;
