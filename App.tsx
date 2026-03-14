import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import { supabase } from './lib/supabase';
import { mapSessionToUserWithProfile, signOut as authSignOut } from './lib/auth';
import Navbar from './components/Navbar';
import CustomerDashboard from './views/CustomerDashboard';
import AdminWrapper from './views/AdminWrapper';
import AdminDashboardHome from './views/AdminDashboardHome';
import AdminJobs from './views/AdminJobs';
import AdminSites from './views/AdminSites';
import AdminCertificates from './views/AdminCertificates';
import AdminTR19 from './views/AdminTR19';
import AdminSurveyForm from './views/AdminSurveyForm';
import AdminSiteSurveyForm from './views/AdminSiteSurveyForm';
import AdminTR19ReportForm from './views/TR19ReportForm';
import AdminReportLog from './views/AdminReportLog';
import AdminServiceRequests from './views/AdminServiceRequests';
import AdminComplaints from './views/AdminComplaints';
import AdminWarrantyClaims from './views/AdminWarrantyClaims';
import AdminEmployees from './views/AdminEmployees';
import ProductsCatalog from './views/ProductsCatalog';
import GoCardlessCallback from './views/GoCardlessCallback';
import GoCardlessServiceRequestCallback from './views/GoCardlessServiceRequestCallback';
import Login from './views/Login';
import SignUp from './views/SignUp';
import JobDetails from './views/JobDetails';
import AIAssistant from './components/AIAssistant';
import AddToHomeScreenPrompt from './components/AddToHomeScreenPrompt';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

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

  return (
    <Router>
      <div className="min-h-screen bg-black flex flex-col pb-20 md:pb-0 overflow-x-hidden w-full max-w-[100vw]">
        {user && user.role !== 'ADMIN' && user.role !== 'ENGINEER' && <Navbar user={user} onLogout={handleLogout} />}
        
        <main className={`flex-grow w-full max-w-full overflow-x-hidden ${user?.role === 'ADMIN' || user?.role === 'ENGINEER' ? '' : 'container mx-auto px-4 py-6'}`}>
          <Routes>
            {!user ? (
              <>
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/signup" element={<SignUp onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            ) : (
              <>
                {(user.role === 'ADMIN' || user.role === 'ENGINEER') ? (
                  <Route path="/dashboard" element={<AdminWrapper user={user} onLogout={handleLogout} />}>
                    <Route index element={<AdminDashboardHome />} />
                    <Route path="service-requests" element={<AdminServiceRequests />} />
                    <Route path="jobs" element={<AdminJobs />} />
                    <Route path="sites" element={<AdminSites />} />
                    <Route path="certificates" element={<AdminCertificates />} />
                    <Route path="tr19" element={<AdminTR19 />} />
                    <Route path="tr19/add" element={<AdminSiteSurveyForm />} />
                    <Route path="tr19/edit/:id" element={<AdminSiteSurveyForm />} />
                    <Route path="surveys" element={<Navigate to="/dashboard/tr19" replace />} />
                    <Route path="surveys/start/:jobId" element={<AdminSurveyForm />} />
                    <Route path="jobs/:jobId/tr19-report" element={<AdminTR19ReportForm />} />
                    <Route path="report-log" element={<AdminReportLog />} />
                    <Route path="complaints" element={<AdminComplaints />} />
                    <Route path="warranty-claims" element={<AdminWarrantyClaims />} />
                    <Route path="quotes" element={<Navigate to="/dashboard" replace />} />
                    <Route path="employees" element={<AdminEmployees />} />
                  </Route>
                ) : (
                  <Route path="/dashboard" element={<CustomerDashboard user={user} />} />
                )}
                <Route path="/products" element={<ProductsCatalog user={user} />} />
                <Route path="/gocardless/callback" element={<GoCardlessCallback />} />
                <Route path="/gocardless/service-request/callback" element={<GoCardlessServiceRequestCallback />} />
                <Route path="/jobs/:id" element={<JobDetails role={user.role} />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </>
            )}
          </Routes>
        </main>

        {user && <AIAssistant />}
        <AddToHomeScreenPrompt aboveBottomNav={!!user && user.role !== 'ADMIN' && user.role !== 'ENGINEER'} />
      </div>
    </Router>
  );
};

export default App;
