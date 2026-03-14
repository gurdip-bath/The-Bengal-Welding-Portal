
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { User } from '../types';
import { LOGO, BRAND_NAME } from '../constants';
import { supabase } from '../lib/supabase';
import { listServiceRequestsForAdmin } from '../lib/serviceRequests';
interface AdminLayoutProps {
  user: User;
  onLogout: () => void;
}

const SIDEBAR_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
  { path: '/dashboard/jobs', label: 'Jobs', icon: 'fa-briefcase' },
  { path: '/dashboard/sites', label: 'Sites', icon: 'fa-building' },
  { path: '/dashboard/service-requests', label: 'Service Requests', icon: 'fa-clipboard-check' },
  { path: '/dashboard/certificates', label: 'TR19 Certificates', icon: 'fa-certificate' },
  { path: '/dashboard/report-log', label: 'TR19 PCVR', icon: 'fa-list' },
  { path: '/dashboard/tr19', label: 'TR19', icon: 'fa-clipboard-list' },
  { path: '/dashboard/complaints', label: 'Complaints', icon: 'fa-triangle-exclamation' },
  { path: '/dashboard/warranty-claims', label: 'Warranty Claims', icon: 'fa-file-contract' },
  { path: '/dashboard/employees', label: 'Employees', icon: 'fa-user-shield' },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingServiceRequestsCount, setPendingServiceRequestsCount] = useState(0);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    listServiceRequestsForAdmin()
      .then((reqs) => setPendingServiceRequestsCount(reqs.filter((r) => r.status === 'pending').length))
      .catch(() => {});
  }, []);

  const handleSendPasswordReset = async () => {
    if (!user.email) {
      setResetError('No email found for this admin account.');
      return;
    }
    setResetError(null);
    setResetMessage(null);
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/#/login`,
      });
      if (error) throw error;
      setResetMessage('Password reset email sent. Please check your inbox.');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const getBreadcrumb = () => {
    const item = SIDEBAR_ITEMS.find((i) => location.pathname === i.path || (i.path !== '/dashboard' && location.pathname.startsWith(i.path)));
    return item?.label || 'Dashboard';
  };

  return (
    <div className="flex min-h-screen bg-black overflow-x-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 min-w-[16rem] bg-[#111111] border-r border-[#333333] flex flex-col h-screen transform transition-transform duration-200 ease-in-out lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-[#333333]">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="p-2 bg-black rounded-xl border border-[#333333]">
              {LOGO('w-10 h-auto')}
            </div>
            <div>
              <span className="font-black text-lg text-[#F2C200] tracking-tight block">{BRAND_NAME}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Admin Portal</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const showPendingBadge = item.path === '/dashboard/service-requests' && pendingServiceRequestsCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-[#F2C200] text-black'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <i className={`fas ${item.icon} w-5 text-center`}></i>
                <span>{item.label}</span>
                {showPendingBadge && (
                  <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center">
                    {pendingServiceRequestsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#333333]">
          <div className="p-4 rounded-xl bg-black/50 border border-[#333333] mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Portal</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Manage sites and warranties.</p>
          </div>
          <button
            onClick={() => { onLogout(); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white text-sm font-bold transition-all"
          >
            <i className="fas fa-sign-out-alt w-5 text-center"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-[#333333] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="lg:hidden flex-shrink-0 p-2 text-gray-400 hover:text-[#F2C200] transition-colors rounded-lg hover:bg-white/5"
              aria-label="Toggle menu"
            >
              <i className="fas fa-bars text-lg"></i>
            </button>
            <p className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest truncate">{getBreadcrumb()}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-3 pl-4 border-l border-[#333333] hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#F2C200]/20 flex items-center justify-center text-[#F2C200] font-black text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-right min-w-0">
                <p className="text-sm font-bold text-white">{user.name}</p>
                <p className="text-[10px] font-bold text-[#F2C200] uppercase tracking-wider">{user.role === 'ENGINEER' ? 'Engineer' : user.role === 'ADMIN' ? 'Admin' : user.role}</p>
              </div>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto w-full max-w-full overflow-x-hidden">
          <Outlet />
        </main>
        {profileOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333] bg-black/60">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Admin Profile</p>
                  <h2 className="text-lg font-bold text-white mt-1">{user.name}</h2>
                </div>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    setResetError(null);
                    setResetMessage(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <i className="fas fa-times text-xl" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Name</p>
                    <p className="text-sm font-bold text-white">{user.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email</p>
                    <p className="text-sm font-bold text-white break-all">{user.email || 'Not set'}</p>
                  </div>
                </div>

                <div className="border border-[#333333] rounded-xl p-4 bg-black/40">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                    Password
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Send a password reset link to this admin email. They can choose a new password from
                    the secure Supabase-hosted page.
                  </p>
                  {resetMessage && (
                    <div className="mb-2 text-xs font-bold text-green-400">
                      <i className="fas fa-check-circle mr-1" />
                      {resetMessage}
                    </div>
                  )}
                  {resetError && (
                    <div className="mb-2 text-xs font-bold text-red-400">
                      <i className="fas fa-exclamation-triangle mr-1" />
                      {resetError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSendPasswordReset}
                    disabled={resetLoading}
                    className="mt-1 inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-60 transition-all"
                  >
                    {resetLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-envelope mr-2" />
                        Send password reset email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLayout;
