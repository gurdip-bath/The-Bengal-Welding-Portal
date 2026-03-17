import React, { useState } from 'react';
import AdminTR19 from './AdminTR19';
import AdminReportLog from './AdminReportLog';
import AdminCertificates from './AdminCertificates';
import type { Job } from '../types';
import type { TR19Report } from './TR19ReportForm';

const AdminTR19Hub: React.FC = () => {
  const [certificateFromReport, setCertificateFromReport] = useState<{ job: Job; report: TR19Report } | null>(null);
  const [showTR19, setShowTR19] = useState(true);
  const [showPCVR, setShowPCVR] = useState(true);
  const [showCertificates, setShowCertificates] = useState(true);

  const visibleSectionsCount = (showTR19 ? 1 : 0) + (showPCVR ? 1 : 0) + (showCertificates ? 1 : 0);

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#111111] border border-[#333333] rounded-2xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-black text-white">TR19</h1>
            <p className="text-[11px] font-bold text-gray-400">
              Toggle sections to keep this page tidy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTR19((v) => !v)}
              aria-pressed={showTR19}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-colors ${
                showTR19
                  ? 'bg-[#F2C200] text-black border-[#F2C200]'
                  : 'bg-black text-gray-300 border-[#333333] hover:border-[#F2C200]/60 hover:text-white'
              }`}
              title="Show/hide TR19 section"
            >
              TR19
            </button>
            <button
              type="button"
              onClick={() => setShowPCVR((v) => !v)}
              aria-pressed={showPCVR}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-colors ${
                showPCVR
                  ? 'bg-[#F2C200] text-black border-[#F2C200]'
                  : 'bg-black text-gray-300 border-[#333333] hover:border-[#F2C200]/60 hover:text-white'
              }`}
              title="Show/hide TR19 PCVR section"
            >
              TR19 PCVR
            </button>
            <button
              type="button"
              onClick={() => setShowCertificates((v) => !v)}
              aria-pressed={showCertificates}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-colors ${
                showCertificates
                  ? 'bg-[#F2C200] text-black border-[#F2C200]'
                  : 'bg-black text-gray-300 border-[#333333] hover:border-[#F2C200]/60 hover:text-white'
              }`}
              title="Show/hide TR19 certificates section"
            >
              TR19 Certificates
            </button>
          </div>
        </div>

        {visibleSectionsCount === 0 && (
          <div className="mt-4 rounded-xl border border-[#333333] bg-black p-3">
            <p className="text-xs font-bold text-gray-400">
              All sections are hidden. Use the toggles above to show what you need.
            </p>
          </div>
        )}
      </div>

      {showTR19 && <AdminTR19 onOpenCertificate={setCertificateFromReport} />}

      {showTR19 && (showPCVR || showCertificates) && <div className="h-px bg-[#333333] w-full" />}

      {showPCVR && <AdminReportLog />}

      {showPCVR && showCertificates && <div className="h-px bg-[#333333] w-full" />}

      {showCertificates && (
        <AdminCertificates
          externalCertificateFromReport={certificateFromReport}
          onCloseExternalCertificate={() => setCertificateFromReport(null)}
        />
      )}
    </div>
  );
};

export default AdminTR19Hub;

