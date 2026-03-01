import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, QuoteRequest, Product } from './types';
import { supabase } from './lib/supabase';
import { mapSessionToUserWithProfile, signOut as authSignOut } from './lib/auth';
import Navbar from './components/Navbar';
import CustomerDashboard from './views/CustomerDashboard';
import AdminWrapper from './views/AdminWrapper';
import AdminDashboardHome from './views/AdminDashboardHome';
import AdminJobs from './views/AdminJobs';
import AdminSites from './views/AdminSites';
import AdminCertificates from './views/AdminCertificates';
import AdminSurveys from './views/AdminSurveys';
import AdminSurveyForm from './views/AdminSurveyForm';
import AdminTR19ReportForm from './views/TR19ReportForm';
import AdminReportLog from './views/AdminReportLog';
import AdminQuotes from './views/AdminQuotes';
import AdminEmployees from './views/AdminEmployees';
import ProductsCatalog from './views/ProductsCatalog';
import Login from './views/Login';
import SignUp from './views/SignUp';
import JobDetails from './views/JobDetails';
import AIAssistant from './components/AIAssistant';
import AddToHomeScreenPrompt from './components/AddToHomeScreenPrompt';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);

  useEffect(() => {
    const savedQuotes = localStorage.getItem('bengal_quotes');
    if (savedQuotes) {
      setQuotes(JSON.parse(savedQuotes));
    }
  }, []);

  // Supabase auth state
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = await mapSessionToUserWithProfile(session?.user ?? null);
      setUser(user);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = await mapSessionToUserWithProfile(session?.user ?? null);
      setUser(user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    try {
      await authSignOut();
    } finally {
      setUser(null);
      window.location.hash = '#/login';
    }
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
      q.id === quoteId ? { ...q, status: 'PENDING_PAYMENT' as const } : q
    );
    setQuotes(updatedQuotes);
    localStorage.setItem('bengal_quotes', JSON.stringify(updatedQuotes));
  };

  return (
    <Router>
      <div className="min-h-screen bg-black flex flex-col pb-20 md:pb-0 overflow-x-hidden w-full max-w-[100vw]">
        {user && user.role !== 'ADMIN' && <Navbar user={user} onLogout={handleLogout} />}
        
        <main className={`flex-grow w-full max-w-full overflow-x-hidden ${user?.role === 'ADMIN' ? '' : 'container mx-auto px-4 py-6'}`}>
          <Routes>
            {!user ? (
              <>
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/signup" element={<SignUp onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            ) : (
              <>
                {user.role === 'ADMIN' ? (
                  <Route path="/dashboard" element={<AdminWrapper user={user} quotes={quotes} onUpdateQuote={handleAdminUpdateQuote} onLogout={handleLogout} />}>
                    <Route index element={<AdminDashboardHome />} />
                    <Route path="jobs" element={<AdminJobs />} />
                    <Route path="sites" element={<AdminSites />} />
                    <Route path="certificates" element={<AdminCertificates />} />
                    <Route path="surveys" element={<AdminSurveys />} />
                    <Route path="surveys/start/:jobId" element={<AdminSurveyForm />} />
                    <Route path="jobs/:jobId/tr19-report" element={<AdminTR19ReportForm />} />
                    <Route path="report-log" element={<AdminReportLog />} />
                    <Route path="quotes" element={<AdminQuotes />} />
                    <Route path="employees" element={<AdminEmployees />} />
                  </Route>
                ) : (
                  <Route path="/dashboard" element={<CustomerDashboard user={user} quotes={quotes} onPayQuote={handleCustomerPayQuote} />} />
                )}
                <Route path="/products" element={<ProductsCatalog onRequestQuote={handleRequestQuote} user={user} />} />
                <Route path="/jobs/:id" element={<JobDetails role={user.role} />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </>
            )}
          </Routes>
        </main>

        {user && <AIAssistant />}
        <AddToHomeScreenPrompt aboveBottomNav={!!user && user.role !== 'ADMIN'} />
      </div>
    </Router>
  );
};

export default App;
