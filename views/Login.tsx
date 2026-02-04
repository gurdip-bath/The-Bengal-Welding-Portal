import React from 'react';
import { UserRole } from '../types';
import { COLORS, LOGO, BRAND_NAME } from '../constants';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-[#111111] rounded-3xl shadow-[0_0_50px_rgba(242,194,0,0.1)] border border-[#333333] animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="mb-8 p-4 bg-black rounded-2xl border border-[#333333] shadow-inner">
          {LOGO("w-40 h-auto")}
        </div>
        <h1 className="text-3xl font-black text-[#F2C200] tracking-tight">{BRAND_NAME}</h1>
        <p className="text-gray-400 text-sm mt-3 px-4">
          Professional Kitchen Fabrication & Service Portal. Manage your equipment maintenance and quotes with ease.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => onLogin('CUSTOMER')}
          style={{ backgroundColor: COLORS.primary }}
          className="w-full flex items-center justify-center space-x-3 text-black py-4 rounded-2xl font-bold transition-all shadow-lg shadow-[#F2C20033] hover:brightness-110 active:scale-95"
        >
          <i className="fas fa-user-circle text-xl"></i>
          <span>Login as Customer</span>
        </button>

        <button
          onClick={() => onLogin('ADMIN')}
          className="w-full flex items-center justify-center space-x-3 text-white py-4 rounded-2xl font-bold transition-all border border-[#333333] hover:bg-white/5 active:scale-95"
          style={{ backgroundColor: '#222222' }}
        >
          <i className="fas fa-user-shield text-xl text-[#F2C200]"></i>
          <span>Login as Administrator</span>
        </button>
      </div>

      <div className="mt-12 pt-6 border-t border-[#333333] text-center">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Bengal Welding Services Ltd.<br/>
          Industrial Standards Guaranteed
        </p>
      </div>
    </div>
  );
};

export default Login;