
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MOCK_JOBS } from '../mockData';
import { UserRole, FileMeta, JobStatus, Job, JobNote } from '../types';
import WarrantyCard from '../components/WarrantyCard';
import { COLORS } from '../constants';

interface JobDetailsProps {
  role: UserRole;
}

const JobDetails: React.FC<JobDetailsProps> = ({ role }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'NOTES' | 'FILES' | 'PAYMENT'>('DETAILS');
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  
  // Note form state
  const [noteText, setNoteText] = useState('');
  const [noteImage, setNoteImage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const localJobs = JSON.parse(localStorage.getItem('bengal_jobs') || '[]');
    const source = localJobs.length > 0 ? localJobs : MOCK_JOBS;
    const found = source.find((j: Job) => j.id === id);
    if (found) {
      setJob(found);
      setEditForm(found);
    }
  }, [id]);

  const saveJob = (updatedJob: Job) => {
    setJob(updatedJob);
    const localJobs = JSON.parse(localStorage.getItem('bengal_jobs') || '[]');
    const existingIndex = localJobs.findIndex((j: Job) => j.id === updatedJob.id);
    
    let newLocal;
    if (existingIndex > -1) {
      newLocal = localJobs.map((j: Job) => j.id === updatedJob.id ? updatedJob : j);
    } else {
      newLocal = [...localJobs, updatedJob];
    }
    
    localStorage.setItem('bengal_jobs', JSON.stringify(newLocal));
  };

  const handleUpdateJobRecord = () => {
    if (job && editForm.title) {
      const updatedJob = { ...job, ...editForm } as Job;
      saveJob(updatedJob);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  if (!job) return <div className="p-10 text-center text-white">Job not found.</div>;

  const handleAddNote = () => {
    if (!noteText.trim() && !noteImage) return;
    
    const newNote: JobNote = {
      id: `N-${Date.now()}`,
      text: noteText,
      timestamp: new Date().toISOString(),
      author: role === 'ADMIN' ? 'Engineer/Staff' : 'Customer',
      images: noteImage ? [noteImage] : []
    };
    
    saveJob({ ...job, notes: [newNote, ...(job.notes || [])] });
    
    // Reset form and show feedback
    setNoteText('');
    setNoteImage(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNoteImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative pb-10">
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-500 text-black px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 animate-bounce z-[100]">
          <i className="fas fa-check-circle"></i>
          <span className="text-sm font-bold uppercase tracking-tight">Operation Successful!</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
          <Link to="/dashboard" className="hover:text-[#F2C200] transition-colors">Dashboard</Link>
          <i className="fas fa-chevron-right text-[10px]"></i>
          <span className="font-bold text-white uppercase tracking-tighter">Job {job.id}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {role === 'ADMIN' && (
            <button 
              onClick={() => setIsEditing(true)} 
              className="text-xs font-bold text-black px-4 py-2 rounded-lg bg-[#F2C200] hover:brightness-110 active:scale-95 transition-all"
            >
              <i className="fas fa-edit mr-2"></i> Manage Record
            </button>
          )}
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-[#333333] text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Close and return to Dashboard"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
      </div>

      <div className="bg-[#111111] rounded-2xl border border-[#333333] shadow-2xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-black p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#333333] gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F2C200]/10 border border-[#F2C200]/20 flex items-center justify-center text-[#F2C200]">
              <i className="fas fa-screwdriver-wrench text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">{job.title}</h1>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Service Reference: {job.id}</p>
            </div>
          </div>
          <div className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border shadow-inner ${
            job.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-[#F2C200]/10 text-[#F2C200] border-[#F2C200]/30'
          }`}>
            {job.status.replace('_', ' ')}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#333333] bg-black/50 overflow-x-auto scrollbar-hide">
          {(['DETAILS', 'NOTES', 'FILES', 'PAYMENT'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[120px] py-5 text-xs font-black transition-all border-b-2 uppercase tracking-[0.2em] ${
                activeTab === tab ? 'border-[#F2C200] text-[#F2C200] bg-[#F2C200]/5' : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'DETAILS' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-[10px] font-black text-[#F2C200] uppercase tracking-[0.3em] mb-4">Contract Scope</h3>
                <p className="text-gray-300 leading-relaxed text-sm bg-black/30 p-4 rounded-xl border border-white/5">{job.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WarrantyCard endDate={job.warrantyEndDate} />
                <div className="bg-black/40 p-5 rounded-2xl border border-[#333333] flex flex-col justify-center">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Service Commencement</h4>
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-calendar-check text-[#F2C200]"></i>
                    <p className="text-xl font-bold text-white">{new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'NOTES' && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              {/* Note/Photo Upload Section */}
              <div className="bg-black p-6 rounded-3xl border border-[#333333] shadow-inner space-y-5">
                <div className="flex items-center space-x-2 text-[#F2C200] mb-2">
                  <i className="fas fa-pen-nib"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Post Professional Update</span>
                </div>
                <textarea 
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter details about the service visit, parts used, or site findings..."
                  className="w-full bg-transparent border-none focus:ring-0 text-white text-sm resize-none min-h-[100px] placeholder:text-gray-600"
                />
                
                {noteImage && (
                  <div className="relative group w-48 h-48 rounded-2xl overflow-hidden border-2 border-[#F2C200]/20 shadow-xl">
                    <img src={noteImage} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setNoteImage(null)} 
                      className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                    <div className="absolute inset-0 bg-[#F2C200]/10 pointer-events-none group-hover:bg-transparent transition-colors"></div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-[#333333] pt-5">
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => fileRef.current?.click()} 
                      className="text-gray-500 hover:text-[#F2C200] flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                      <i className="fas fa-camera text-base"></i>
                      <span>Capture Photo</span>
                    </button>
                    <button 
                       className="text-gray-500 hover:text-[#F2C200] flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                       onClick={() => alert("Video upload coming soon.")}
                    >
                      <i className="fas fa-video text-base"></i>
                      <span>Video Log</span>
                    </button>
                  </div>
                  <input type="file" hidden ref={fileRef} onChange={handleImageUpload} accept="image/*" />
                  <button 
                    onClick={handleAddNote} 
                    className="bg-[#F2C200] text-black px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all"
                  >
                    Post Log Entry
                  </button>
                </div>
              </div>

              {/* Log History */}
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-grow h-px bg-[#333333]"></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Audit History</span>
                  <div className="flex-grow h-px bg-[#333333]"></div>
                </div>
                
                {!job.notes?.length && (
                  <div className="text-center py-16 opacity-30">
                    <i className="fas fa-clipboard-list text-4xl mb-4"></i>
                    <p className="text-xs font-bold uppercase tracking-widest">No activity logs recorded.</p>
                  </div>
                )}
                
                {job.notes?.map(note => (
                  <div key={note.id} className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#333333] hover:border-white/10 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-black border border-[#333333] flex items-center justify-center text-[#F2C200]">
                          <i className={`fas ${note.author.includes('Engineer') ? 'fa-user-gear' : 'fa-user'}`}></i>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-[#F2C200] uppercase tracking-widest">{note.author}</span>
                          <p className="text-[9px] text-gray-500 uppercase font-bold">{new Date(note.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed font-medium">{note.text}</p>
                    {note.images?.length && (
                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {note.images.map((img, i) => (
                          <div 
                            key={i} 
                            className="relative aspect-square rounded-xl overflow-hidden border border-[#333333] group/img cursor-pointer"
                            onClick={() => window.open(img, '_blank')}
                          >
                            <img src={img} alt="Evidence" className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                              <i className="fas fa-expand text-white"></i>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'FILES' && (
            <div className="space-y-6 animate-in fade-in">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Engineering Documents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'Fabrication_Drawing_V1.pdf', size: '2.4 MB', type: 'PDF' },
                  { name: 'Site_Safety_Certificate.pdf', size: '1.1 MB', type: 'PDF' }
                ].map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-[#333333] bg-black group hover:border-[#F2C200] transition-colors cursor-pointer">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 group-hover:text-[#F2C200] transition-colors">
                        <i className="fas fa-file-pdf text-xl"></i>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-[#F2C200] transition-colors">{file.name}</p>
                        <p className="text-[10px] text-gray-600 font-bold uppercase">{file.size} • {file.type}</p>
                      </div>
                    </div>
                    <button className="text-gray-500 hover:text-[#F2C200] p-2 transition-colors">
                      <i className="fas fa-download"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'PAYMENT' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-[#0070ba]/10 border border-[#0070ba]/30 p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black text-[#0070ba] uppercase tracking-[0.3em]">Account Status</h3>
                  <p className="text-2xl font-black text-white">{job.paymentStatus === 'PAID' ? 'Fully Settled' : 'Payment Outstanding'}</p>
                  <p className="text-sm text-gray-400 font-bold">Total Contract Value: <span className="text-white">£{job.amount.toLocaleString()}</span></p>
                </div>
                {job.paymentStatus !== 'PAID' ? (
                  role !== 'ADMIN' && (
                    <button 
                      onClick={() => window.open('https://paypal.com', '_blank')} 
                      className="bg-[#0070ba] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center space-x-3 hover:brightness-110 shadow-xl shadow-[#0070ba33] transition-all active:scale-95"
                    >
                      <i className="fab fa-paypal text-xl"></i>
                      <span>Settle via PayPal</span>
                    </button>
                  )
                ) : (
                  <div className="flex items-center space-x-2 text-green-500 bg-green-500/10 px-6 py-3 rounded-full border border-green-500/20">
                    <i className="fas fa-circle-check"></i>
                    <span className="text-xs font-black uppercase tracking-widest">Transaction Completed</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Job Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Service Record</h2>
              <button onClick={() => setIsEditing(false)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Job Title</label>
                  <input 
                    type="text" 
                    value={editForm.title || ''} 
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})} 
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                  <textarea 
                    rows={3} 
                    value={editForm.description || ''} 
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})} 
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl outline-none resize-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fee (£)</label>
                  <input 
                    type="number" 
                    value={editForm.amount || 0} 
                    onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value)})} 
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                  <select 
                    value={editForm.status || 'PENDING'} 
                    onChange={(e) => setEditForm({...editForm, status: e.target.value as JobStatus})} 
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Start Date</label>
                  <input 
                    type="date" 
                    value={editForm.startDate || ''} 
                    onChange={(e) => setEditForm({...editForm, startDate: e.target.value})} 
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warranty Expiry</label>
                  <input 
                    type="date" 
                    value={editForm.warrantyEndDate || ''} 
                    onChange={(e) => setEditForm({...editForm, warrantyEndDate: e.target.value})} 
                    className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl" 
                  />
                </div>
              </div>
              <div className="pt-6 border-t border-[#333333]">
                <button 
                  onClick={handleUpdateJobRecord} 
                  className="w-full bg-[#F2C200] text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all"
                >
                  Update Service Record
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
