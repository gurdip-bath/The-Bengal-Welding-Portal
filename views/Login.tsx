
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { signIn } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { COLORS, LOGO, BRAND_NAME } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess(false);
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/#/login`,
      });
      if (error) throw error;
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotClose = () => {
    setForgotOpen(false);
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess(false);
  };

  return (
    <>
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
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="mt-2 text-xs text-gray-500 hover:text-[#F2C200] transition-colors"
          >
            Forgot password?
          </button>
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

    {/* Forgot password modal */}
    {forgotOpen && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={handleForgotClose}>
        <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-[#333333] flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#F2C200]">Reset password</h2>
            <button onClick={handleForgotClose} className="text-gray-500 hover:text-white transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <div className="p-6">
            {forgotSuccess ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-300">
                  If an account exists with that email, you&apos;ll receive a password reset link shortly. Check your inbox and spam folder.
                </p>
                <button
                  onClick={handleForgotClose}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 transition-all"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotError && (
                  <div className="p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F2C200] transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleForgotClose}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#333333] text-white hover:bg-[#444] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                  >
                    {forgotLoading ? 'Sending...' : 'Send reset link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Login;
