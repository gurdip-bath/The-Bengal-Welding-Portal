
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { User } from '../types';
import { LOGO, BRAND_NAME } from '../constants';

interface AdminLayoutProps {
  user: User;
  onLogout: () => void;
}

const SIDEBAR_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
  { path: '/dashboard/sites', label: 'Sites', icon: 'fa-building' },
  { path: '/dashboard/certificates', label: 'Certificates', icon: 'fa-certificate' },
  { path: '/dashboard/surveys', label: 'Surveys', icon: 'fa-clipboard-list' },
  { path: '/dashboard/quotes', label: 'Quotes', icon: 'fa-file-invoice-dollar' },
  { path: '/dashboard/employees', label: 'Employees', icon: 'fa-user-shield' },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#333333]">
          <div className="p-4 rounded-xl bg-black/50 border border-[#333333] mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Portal</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Manage sites, warranties & quotes.</p>
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
            <button className="relative p-2 text-gray-500 hover:text-[#F2C200] transition-colors rounded-lg hover:bg-white/5">
              <i className="fas fa-bell text-lg"></i>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-[#333333]">
              <div className="w-10 h-10 rounded-full bg-[#F2C200]/20 flex items-center justify-center text-[#F2C200] font-black text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-right min-w-0">
                <p className="text-sm font-bold text-white">{user.name}</p>
                <p className="text-[10px] font-bold text-[#F2C200] uppercase tracking-wider">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto w-full max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
