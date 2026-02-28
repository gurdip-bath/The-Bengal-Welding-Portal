
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { validateCredentials } from '../lib/auth';
import { COLORS, LOGO, BRAND_NAME } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const user = validateCredentials(email.trim(), password);
    setLoading(false);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-[#111111] rounded-3xl shadow-[0_0_50px_rgba(242,194,0,0.1)] border border-[#333333] animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="mb-8 p-4 bg-black rounded-2xl border border-[#333333] shadow-inner">
          {LOGO("w-40 h-auto")}
        </div>
        <h1 className="text-3xl font-black text-[#F2C200] tracking-tight">
          Sign In
        </h1>
        <p className="text-gray-400 text-sm mt-3 px-4">
          Access your account to manage quotes, warranties, and equipment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm font-medium">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F2C200] transition-colors"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F2C200] transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ backgroundColor: COLORS.primary }}
          className="w-full flex items-center justify-center space-x-3 text-black py-4 rounded-2xl font-bold transition-all shadow-lg shadow-[#F2C20033] hover:brightness-110 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <i className="fas fa-sign-in-alt text-xl"></i>
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#333333] text-center">
        <p className="text-gray-500 text-sm">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="text-[#F2C200] font-bold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-[#333333] text-center">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Bengal Welding Services Ltd.<br/>
          Secure Portal Access
        </p>
      </div>
    </div>
  );
};

export default Login;
