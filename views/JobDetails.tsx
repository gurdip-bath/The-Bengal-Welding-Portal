import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_JOBS } from '../mockData';
import { UserRole, FileMeta, JobStatus } from '../types';
import WarrantyCard from '../components/WarrantyCard';
import { COLORS } from '../constants';

interface JobDetailsProps {
  role: UserRole;
}

const JobDetails: React.FC<JobDetailsProps> = ({ role }) => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState(MOCK_JOBS.find(j => j.id === id));
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'FILES' | 'PAYMENT'>('DETAILS');
  const [isEditing, setIsEditing] = useState(false);

  if (!job) return <div className="p-10 text-center text-white">Job not found.</div>;

  const mockFiles: FileMeta[] = [
    { id: 'f1', name: 'Design_Blueprint.pdf', type: 'application/pdf', url: '#', uploadedBy: 'Admin', uploadDate: '2024-01-20' },
    { id: 'f2', name: 'Site_Photo_1.jpg', type: 'image/jpeg', url: 'https://picsum.photos/seed/site1/800/600', uploadedBy: 'Customer', uploadDate: '2024-01-21' },
  ];

  const handlePayPalRedirect = () => {
    window.open('https://www.paypal.com/checkoutnow', '_blank');
  };

  const handleAdminUpdate = (updates: Partial<typeof job>) => {
    const updated = { ...job, ...updates };
    setJob(updated);
    setIsEditing(false);
    // Logic to save back to persistent storage would go here
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
          <Link to="/dashboard" className="hover:text-[#F2C200] transition-colors">Dashboard</Link>
          <i className="fas fa-chevron-right text-[10px]"></i>
          <span className="font-bold text-white uppercase tracking-tighter">Job {job.id}</span>
        </div>
        {role === 'ADMIN' && (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-xs font-bold text-black px-3 py-1.5 rounded-lg bg-[#F2C200] hover:brightness-110 transition-all"
          >
            <i className="fas fa-edit mr-1"></i> Manage Contract
          </button>
        )}
      </div>

      <div className="bg-[#111111] rounded-2xl border border-[#333333] shadow-xl overflow-hidden">
        <div className="bg-black p-6 text-white flex justify-between items-center border-b border-[#333333]">
          <div>
            <h1 className="text-2xl font-bold text-[#F2C200]">{job.title}</h1>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Contract Reference: {job.id}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${
            job.status === 'COMPLETED' ? 'bg-green-500 text-black' : 'bg-[#F2C200] text-black'
          }`}>
            {job.status.replace('_', ' ')}
          </div>
        </div>

        <div className="flex border-b border-[#333333] bg-black/30">
          {(['DETAILS', 'FILES', 'PAYMENT'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-black transition-all border-b-2 uppercase tracking-widest ${
                activeTab === tab 
                  ? 'border-[#F2C200] text-[#F2C200]' 
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'DETAILS' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Service Description</h3>
                <p className="text-gray-300 leading-relaxed font-medium">{job.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WarrantyCard endDate={job.warrantyEndDate} />
                <div className="bg-black p-4 rounded-xl border border-[#333333]">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Project Start</h4>
                  <p className="text-lg font-bold text-white">{new Date(job.startDate).toLocaleDateString()}</p>
                  <p className="text-xs text-[#F2C200] font-bold mt-1 uppercase tracking-tighter">Contract officially commenced</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FILES' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Shared Documents</h3>
                <label className="bg-[#F2C200] text-black px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer hover:brightness-110 transition-all uppercase tracking-tight">
                  <i className="fas fa-upload mr-1"></i> Upload File
                  <input type="file" className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {mockFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded-xl border border-[#333333] bg-black hover:border-[#F2C200] transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-gray-500 group-hover:text-[#F2C200] transition-colors">
                        <i className={`fas ${file.type.includes('image') ? 'fa-image' : 'fa-file-pdf'}`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{file.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">By {file.uploadedBy} • {file.uploadDate}</p>
                      </div>
                    </div>
                    <button className="text-gray-500 hover:text-[#F2C200] p-2">
                      <i className="fas fa-download"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'PAYMENT' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-[#0070ba]/10 border border-[#0070ba]/30 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#F2C200] uppercase tracking-tight">Current Status: {job.paymentStatus}</h3>
                  <p className="text-sm text-gray-300 font-medium">Contract Value: £{job.amount.toLocaleString()}</p>
                </div>
                
                {job.paymentStatus !== 'PAID' && (
                  <button 
                    onClick={handlePayPalRedirect}
                    className="bg-[#0070ba] hover:bg-[#005ea6] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg"
                  >
                    <i className="fab fa-paypal text-xl"></i>
                    <span>PayPal Checkout</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Management Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Service Contract</h2>
              <button onClick={() => setIsEditing(false)} className="text-black hover:opacity-70">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Job Status</label>
                <select 
                  value={job.status} 
                  onChange={(e) => handleAdminUpdate({ status: e.target.value as JobStatus })}
                  className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl font-bold focus:ring-1 focus:ring-[#F2C200] outline-none"
                >
                  <option className="bg-[#111111]" value="PENDING">Pending</option>
                  <option className="bg-[#111111]" value="IN_PROGRESS">In Progress</option>
                  <option className="bg-[#111111]" value="COMPLETED">Completed</option>
                  <option className="bg-[#111111]" value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warranty End Date</label>
                <input 
                  type="date" 
                  value={job.warrantyEndDate}
                  onChange={(e) => handleAdminUpdate({ warrantyEndDate: e.target.value })}
                  className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl font-bold focus:ring-1 focus:ring-[#F2C200] outline-none"
                />
              </div>
              <div className="pt-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="w-full bg-[#F2C200] text-black py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-[#F2C2001A]"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;