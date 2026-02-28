
import React from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { QuoteRequest } from '../types';

const AdminQuotes: React.FC = () => {
  const { quotes, searchQuery, setSearchQuery, setSelectedQuote } = useAdmin();

  const pendingQuotes = quotes.filter((q) => q.status === 'NEW' || q.status === 'QUOTED');
  const paidQuotes = quotes.filter((q) => q.status === 'PAID');

  const matchesSearch = (text?: string) =>
    !searchQuery || (text || '').toLowerCase().includes(searchQuery.toLowerCase());

  const filteredPending = pendingQuotes.filter(
    (q) => matchesSearch(q.productName) || matchesSearch(q.customerName) || matchesSearch(q.date)
  );
  const filteredPaid = paidQuotes.filter(
    (q) => matchesSearch(q.productName) || matchesSearch(q.customerName) || matchesSearch(q.date)
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Quotes</h1>
        <div className="relative min-w-[240px] max-w-md">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
          <input
            type="text"
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Pending ({pendingQuotes.length})</h2>
          <div className="space-y-3">
            {filteredPending.map((quote) => (
              <div
                key={quote.id}
                onClick={() => setSelectedQuote(quote)}
                className="bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center gap-4 cursor-pointer hover:border-[#F2C200] transition-colors"
              >
                <img src={quote.productImage} alt="" className="w-12 h-12 rounded object-contain bg-black p-1" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{quote.productName}</h3>
                  <p className="text-[10px] text-gray-500">{quote.customerName} • {new Date(quote.date).toLocaleDateString()}</p>
                </div>
                <i className="fas fa-chevron-right text-gray-600"></i>
              </div>
            ))}
            {filteredPending.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm font-bold rounded-xl border border-dashed border-[#333333]">
                No pending quotes.
              </div>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Paid ({paidQuotes.length})</h2>
          <div className="space-y-3">
            {filteredPaid.map((quote) => (
              <div
                key={quote.id}
                onClick={() => setSelectedQuote(quote)}
                className="bg-[#111111] p-4 rounded-xl border border-[#333333] flex items-center gap-4 cursor-pointer hover:border-[#F2C200] transition-colors"
              >
                <img src={quote.productImage} alt="" className="w-12 h-12 rounded object-contain bg-black p-1" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{quote.productName}</h3>
                  <p className="text-[10px] text-gray-500">{quote.customerName} • {new Date(quote.date).toLocaleDateString()}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-[10px] font-black uppercase shrink-0">Paid</span>
              </div>
            ))}
            {filteredPaid.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm font-bold rounded-xl border border-dashed border-[#333333]">
                No paid quotes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQuotes;
