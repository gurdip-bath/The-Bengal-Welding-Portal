import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';
import { COLORS, BRAND_NAME, LOGO } from '../constants';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'fa-gauge' },
    { label: 'Products', path: '/products', icon: 'fa-box-open' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex bg-black shadow-lg border-b border-[#333333] sticky top-0 z-50 px-6 py-3 items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/dashboard" className="flex items-center space-x-2">
            {LOGO("h-10 w-auto")}
            <span className="font-bold text-xl tracking-tight text-[#F2C200]">{BRAND_NAME}</span>
          </Link>
          
          <div className="flex space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? `text-black`
                    : 'text-gray-300 hover:text-[#F2C200] hover:bg-white/5'
                }`}
                style={isActive(item.path) ? { backgroundColor: COLORS.primary } : {}}
              >
                <i className={`fas ${item.icon}`}></i>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-[#F2C200] capitalize font-bold">{user.role.toLowerCase()}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <i className="fas fa-sign-out-alt text-lg"></i>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-[#333333] flex justify-around items-center h-16 z-50 shadow-[0_-2px_20px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              isActive(item.path) ? `text-[#F2C200]` : 'text-gray-500'
            }`}
            // Fix: Corrected isActive usage to pass a string and receive a boolean for style mapping.
            style={isActive(item.path) ? { color: COLORS.primary } : {}}
          >
            <i className={`fas ${item.icon} text-xl`}></i>
            <span className="text-[10px] mt-1 font-bold">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center w-full h-full text-gray-500"
        >
          <i className="fas fa-sign-out-alt text-xl"></i>
          <span className="text-[10px] mt-1 font-bold">Logout</span>
        </button>
      </nav>
    </>
  );
};

export default Navbar;