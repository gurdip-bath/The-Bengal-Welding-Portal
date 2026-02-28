
import React from 'react';

const AdminSurveys: React.FC = () => {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Surveys</h1>
      <div className="bg-[#111111] rounded-2xl border border-[#333333] p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#F2C200]/10 flex items-center justify-center text-[#F2C200] mx-auto mb-4">
          <i className="fas fa-clipboard-list text-3xl"></i>
        </div>
        <p className="text-gray-400 font-bold">Survey management coming soon.</p>
        <p className="text-gray-600 text-sm mt-1">Create and manage site surveys.</p>
      </div>
    </div>
  );
};

export default AdminSurveys;
