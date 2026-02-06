
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, QuoteRequest, Product, Job } from './types';
import { MOCK_USER_CUSTOMER, MOCK_USER_ADMIN, MOCK_JOBS } from './mockData';
import Navbar from './components/Navbar';
import CustomerDashboard from './views/CustomerDashboard';
import AdminDashboard from './views/AdminDashboard';
import ProductsCatalog from './views/ProductsCatalog';
import Login from './views/Login';
import JobDetails from './views/JobDetails';
import AIAssistant from './components/AIAssistant';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('bengal_user');
    const savedQuotes = localStorage.getItem('bengal_quotes');
    
    // Check for magic link auto-login
    const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    const inviteCode = urlParams.get('code');

    if (inviteCode) {
      const localJobs = JSON.parse(localStorage.getItem('bengal_jobs') || '[]');
      const allJobs = localJobs.length > 0 ? localJobs : MOCK_JOBS;
      const matchingJob = allJobs.find((j: Job) => j.id === inviteCode);
      
      if (matchingJob) {
        // PERSONALIZED LOGIN: Use the name assigned by the admin to this specific job
        const customerUser: User = { 
          id: matchingJob.customerId || `u-${inviteCode}`,
          name: matchingJob.customerName || 'Valued Customer',
          email: 'client@bengalwelding.co.uk',
          role: 'CUSTOMER'
        };
        setUser(customerUser);
        localStorage.setItem('bengal_user', JSON.stringify(customerUser));
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
      }
    } else if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    if (savedQuotes) {
      setQuotes(JSON.parse(savedQuotes));
    }
  }, []);

  const handleLogin = (role: UserRole) => {
    const selectedUser = role === 'ADMIN' ? MOCK_USER_ADMIN : MOCK_USER_CUSTOMER;
    setUser(selectedUser);
    localStorage.setItem('bengal_user', JSON.stringify(selectedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('bengal_user');
  };

  const handleRequestQuote = (product: Product, notes?: string, image?: string) => {
    if (!user) return;
    const newQuote: QuoteRequest = {
      id: `Q-${Math.floor(Math.random() * 10000)}`,
      productName: product.name,
      productImage: product.image,
      customerId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      date: new Date().toISOString(),
      status: 'NEW',
      customerNotes: notes,
      applianceImage: image,
    };
    const updatedQuotes = [newQuote, ...quotes];
    setQuotes(updatedQuotes);
    localStorage.setItem('bengal_quotes', JSON.stringify(updatedQuotes));
  };

  const handleAdminUpdateQuote = (quoteId: string, price: number, notes: string) => {
    const updatedQuotes = quotes.map(q => 
      q.id === quoteId ? { ...q, price, adminNotes: notes, status: 'QUOTED' as const } : q
    );
    setQuotes(updatedQuotes);
    localStorage.setItem('bengal_quotes', JSON.stringify(updatedQuotes));
  };

  const handleCustomerPayQuote = (quoteId: string) => {
    window.open('https://www.paypal.com/checkoutnow', '_blank');
    const updatedQuotes = quotes.map(q => 
      q.id === quoteId ? { ...q, status: 'PAID' as const } : q
    );
    setQuotes(updatedQuotes);
    localStorage.setItem('bengal_quotes', JSON.stringify(updatedQuotes));
  };

  return (
    <Router>
      <div className="min-h-screen bg-black flex flex-col pb-20 md:pb-0">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        
        <main className="flex-grow container mx-auto px-4 py-6">
          <Routes>
            {!user ? (
              <>
                <Route path="/login/customer" element={<Login mode="CUSTOMER" onLogin={handleLogin} />} />
                <Route path="/login/admin" element={<Login mode="ADMIN" onLogin={handleLogin} />} />
                <Route path="/login" element={<Login mode="BOTH" onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            ) : (
              <>
                <Route 
                  path="/dashboard" 
                  element={
                    user.role === 'ADMIN' 
                      ? <AdminDashboard quotes={quotes} onUpdateQuote={handleAdminUpdateQuote} /> 
                      : <CustomerDashboard user={user} quotes={quotes} onPayQuote={handleCustomerPayQuote} />
                  } 
                />
                <Route path="/products" element={<ProductsCatalog onRequestQuote={handleRequestQuote} />} />
                <Route path="/jobs/:id" element={<JobDetails role={user.role} />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </>
            )}
          </Routes>
        </main>

        {user && <AIAssistant />}
      </div>
    </Router>
  );
};

export default App;
