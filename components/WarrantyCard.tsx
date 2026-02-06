import React from 'react';
import { COLORS } from '../constants';

interface WarrantyCardProps {
  endDate: string;
}

const WarrantyCard: React.FC<WarrantyCardProps> = ({ endDate }) => {
  const calculateRemaining = () => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return { days: 0, status: 'Expired', color: 'bg-red-100 text-red-700' };
    
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days <= 30) return { days, status: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-700' };
    return { days, status: 'Active', color: 'bg-green-100 text-green-700' };
  };

  const { days, status, color } = calculateRemaining();

  return (
    <div className="bg-[#111111] p-4 rounded-xl border border-[#333333] shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Warranty Status</h4>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>
          {status}
        </span>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold text-white">{days}</span>
        <span className="text-sm text-gray-400 font-medium">Days remaining</span>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        <i className="fas fa-info-circle mr-1 text-[#F2C200]"></i>
        Valid until {new Date(endDate).toLocaleDateString()}
      </p>
    </div>
  );
};

export default WarrantyCard;