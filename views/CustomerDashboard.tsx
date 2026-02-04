import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Job, QuoteRequest } from '../types';
import { MOCK_JOBS } from '../mockData';
import WarrantyCard from '../components/WarrantyCard';
import { COLORS } from '../constants';

interface CustomerDashboardProps {
  user: User;
  quotes?: QuoteRequest[];
  onPayQuote?: (id: string) => void;
}

type TabType = 'ACTIVE' | 'HISTORY';

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, quotes = [], onPayQuote }) => {
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');
  const myJobs = MOCK_JOBS.filter(j => j.customerId === user.id);
  const myQuotes = quotes.filter(q => q.customerId === user.id);

  const historyItems = [
    ...myJobs.map(j => ({
      id: j.id,
      title: j.title,
      type: 'Job',
      status: j.status,
      date: j.startDate,
      amount: j.amount,
      isJob: true
    })),
    ...myQuotes.map(q => ({
      id: q.id,
      title: q.productName,
      type: 'Quote',
      status: q.status,
      date: q.date,
      amount: q.price || 0,
      isJob: false
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'NEW':
      case 'QUOTED':
      case 'PENDING':
      case 'IN_PROGRESS':
        return 'bg-[#FFF9E6] text-[#B28900]';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F2C200]">Welcome, {user.name}</h1>
          <p className="text-white opacity-80">Manage your kitchen equipment service and maintenance jobs.</p>
        </div>
        
        <div className="flex bg-[#111111] border border-[#333333] p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'ACTIVE' 
                ? 'bg-[#F2C200] text-black shadow-sm' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            Active
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'HISTORY' 
                ? 'bg-[#F2C200] text-black shadow-sm' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            Order History
          </button>
        </div>
      </header>

      {activeTab === 'ACTIVE' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111111] p-5 rounded-xl border border-[#333333] shadow-sm">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#1A1A1A', border: '1px solid #F2C20033' }}>
                <i className="fas fa-hammer" style={{ color: COLORS.primary }}></i>
              </div>
              <p className="text-gray-400 text-sm font-medium">Active Maintenance</p>
              <p className="text-2xl font-bold text-white">{myJobs.filter(j => j.status !== 'COMPLETED').length}</p>
            </div>
            
            {myJobs.length > 0 && <WarrantyCard endDate={myJobs[0].warrantyEndDate} />}

            <div className="bg-[#111111] p-5 rounded-xl border border-[#333333] shadow-sm">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#1A1A1A' }}>
                <i className="fas fa-file-invoice-dollar text-[#F2C200]"></i>
              </div>
              <p className="text-gray-400 text-sm font-medium">Pending Payments</p>
              <p className="text-2xl font-bold text-white">
                £{(myJobs.filter(j => j.paymentStatus !== 'PAID').reduce((acc, curr) => acc + curr.amount, 0) + 
                   myQuotes.filter(q => q.status === 'QUOTED').reduce((acc, curr) => acc + (curr.price || 0), 0)).toLocaleString()}
              </p>
            </div>
          </div>

          {myQuotes.some(q => q.status === 'QUOTED') && (
            <section className="animate-in slide-in-from-left-4">
              <h2 className="text-lg font-bold text-[#F2C200] mb-4">Pending Quotes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myQuotes.filter(q => q.status === 'QUOTED').map(quote => (
                  <div key={quote.id} className="bg-[#111111] p-5 rounded-2xl border border-[#333333] shadow-lg flex flex-col">
                    <div className="flex items-start space-x-4 mb-4">
                      <img src={quote.productImage} alt="" className="w-16 h-16 rounded-xl object-contain bg-black border border-[#333333] p-2" />
                      <div>
                        <h3 className="font-bold text-white">{quote.productName}</h3>
                        <p className="text-2xl font-black mt-1 text-[#F2C200]">£{quote.price?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-black/50 border border-[#333333] p-3 rounded-xl mb-4">
                      <p className="text-xs font-bold text-[#F2C200] uppercase mb-1">Service Notes:</p>
                      <p className="text-sm text-gray-300 italic">{quote.adminNotes || "No notes provided."}</p>
                    </div>
                    <button 
                      onClick={() => onPayQuote?.(quote.id)}
                      className="w-full bg-[#F2C200] text-black py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-md"
                    >
                      <i className="fab fa-paypal"></i>
                      <span>Accept & Pay £{quote.price?.toLocaleString()}</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#F2C200]">My Service Orders</h2>
              <Link to="/products" className="text-sm font-semibold hover:text-white transition-colors" style={{ color: COLORS.primary }}>
                View Equipment
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {myJobs.length === 0 && myQuotes.filter(q => q.status === 'PAID').length === 0 ? (
                <div className="p-8 bg-[#111111] rounded-xl border border-dashed border-[#333333] text-center text-gray-500">
                  No active service orders found.
                </div>
              ) : (
                <>
                  {myJobs.map(job => (
                    <Link 
                      key={job.id} 
                      to={`/jobs/${job.id}`}
                      className="group bg-[#111111] p-5 rounded-xl border border-[#333333] shadow-sm hover:border-[#F2C200] transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          job.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-[#FFF9E6] text-[#B28900]'
                        }`}>
                          <i className={`fas ${job.status === 'COMPLETED' ? 'fa-check' : 'fa-spinner fa-spin'}`}></i>
                        </div>
                        <div>
                          <h3 className="font-bold text-white group-hover:text-[#F2C200] transition-colors">{job.title}</h3>
                          <p className="text-sm text-gray-400 line-clamp-1">{job.description}</p>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          job.paymentStatus === 'PAID' ? 'bg-white/10 text-gray-300' : 'bg-red-900/20 text-red-400'
                        }`}>
                          {job.paymentStatus}
                        </span>
                        <p className="text-xs text-gray-500 mt-2">Placed {new Date(job.startDate).toLocaleDateString()}</p>
                      </div>
                      <i className="fas fa-chevron-right text-gray-600 group-hover:translate-x-1 transition-transform"></i>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </section>

          <section className="bg-[#111111] border border-[#333333] p-6 rounded-2xl text-white">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div>
                <h3 className="text-xl font-bold text-[#F2C200]">Equipment Issues?</h3>
                <p className="text-gray-400 text-sm">Upload photos of your cooker or extraction hood for remote diagnostic.</p>
              </div>
              <button 
                className="px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all bg-[#F2C200] text-black hover:brightness-110"
              >
                <i className="fas fa-camera"></i>
                <span>Upload Photo/Video</span>
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="animate-in slide-in-from-right-4">
          <div className="bg-[#111111] rounded-2xl border border-[#333333] shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1A1A1A] border-b border-[#333333]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Item / Service</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {historyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{item.title}</span>
                          <span className="text-[10px] text-gray-500">ID: {item.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded-md bg-[#333333] text-gray-300 text-[10px] font-bold uppercase">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-[#F2C200]">
                          {item.amount > 0 ? `£${item.amount.toLocaleString()}` : '--'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default CustomerDashboard;