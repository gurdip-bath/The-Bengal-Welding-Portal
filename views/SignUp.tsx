
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { signUpCustomer } from '../lib/auth';
import { COLORS, LOGO, BRAND_NAME } from '../constants';

interface SignUpProps {
  onLogin: (user: User) => void;
}

type Step = 1 | 2;

const SignUp: React.FC<SignUpProps> = ({ onLogin }) => {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Please enter your name or business name.');
      return;
    }
    if (!form.email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!form.password) {
      setError('Please create a password.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signUpCustomer({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
    });
    setLoading(false);
    if (result.success && result.user) {
      onLogin(result.user);
      navigate('/dashboard');
    } else {
      setError(result.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 mb-12 p-8 bg-[#111111] rounded-3xl shadow-[0_0_50px_rgba(242,194,0,0.1)] border border-[#333333] animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="mb-6 p-4 bg-black rounded-2xl border border-[#333333] shadow-inner">
          {LOGO("w-32 h-auto")}
        </div>
        <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">
          Create Account
        </h1>
        <p className="text-gray-400 text-sm mt-2 px-4">
          {step === 1
            ? 'Create a customer account to request quotes and manage your equipment.'
            : 'Add optional contact details (you can skip this step).'}
        </p>
        {step === 2 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="w-8 h-1 rounded-full bg-[#F2C200]" />
            <span className="w-8 h-1 rounded-full bg-[#F2C200]" />
          </div>
        )}
      </div>

      {step === 1 ? (
        <form onSubmit={handleStep1} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Name / Business Name *
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Doe or Acme Ltd"
              className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F2C200] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Email *
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F2C200] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Password *
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F2C200] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F2C200] transition-colors"
            />
          </div>
          <button
            type="submit"
            style={{ backgroundColor: COLORS.primary }}
            className="w-full flex items-center justify-center space-x-3 text-black py-4 rounded-2xl font-bold transition-all shadow-lg shadow-[#F2C20033] hover:brightness-110 active:scale-95"
          >
            <span>Continue</span>
            <i className="fas fa-arrow-right text-xl"></i>
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="phone" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Phone (optional)
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="07123 456 789"
              className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F2C200] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Address (optional)
            </label>
            <textarea
              id="address"
              rows={2}
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Business Lane, City, Postcode"
              className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F2C200] transition-colors resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-4 rounded-2xl font-bold border border-[#333333] text-gray-400 hover:bg-white/5 transition-all"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: COLORS.primary }}
              className="flex-1 flex items-center justify-center space-x-3 text-black py-4 rounded-2xl font-bold transition-all shadow-lg shadow-[#F2C20033] hover:brightness-110 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <i className="fas fa-user-plus text-xl"></i>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 pt-6 border-t border-[#333333] text-center">
        <p className="text-gray-500 text-sm">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[#F2C200] font-bold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>

      <div className="mt-6 pt-6 border-t border-[#333333] text-center">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Bengal Welding Services Ltd.
        </p>
      </div>
    </div>
  );
};

export default SignUp;
