import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { mapSessionToUserWithProfile } from '../lib/auth';
import { LOGO, BRAND_NAME } from '../constants';

/**
 * Page for invited customers to set their password.
 * Reached via invite email link; Supabase puts tokens in the URL hash.
 */
const SetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | null = null;

    const init = async () => {
      try {
        const hash = window.location.hash;
        // Format A: "#/set-password#access_token=...&refresh_token=...&type=invite"
        // Format B: "#access_token=...&refresh_token=...&type=invite"
        // Only App.tsx calls setSession for invite tokens to avoid "Lock broken" race. We just wait for session.
        let params: URLSearchParams;
        if (hash.includes('access_token=')) {
          const afterHash = hash.slice(1);
          const fragment = afterHash.includes('#') ? afterHash.split('#').pop()! : afterHash;
          params = new URLSearchParams(fragment);
        } else {
          const parts = hash.split('#');
          const fragment = parts[parts.length - 1] || '';
          params = new URLSearchParams(fragment.startsWith('/') ? '' : fragment);
        }
        const type = params.get('type');

        if (type === 'invite') {
          // Do not call setSession here — App.tsx does it. Wait for session via listener or getSession.
          const applyReady = () => {
            setReady(true);
            const base = `${window.location.origin}${window.location.pathname || '/'}`;
            window.history.replaceState(null, '', `${base}#/set-password`);
          };
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) applyReady();
          });
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) applyReady();
          });
          unsub = () => subscription.unsubscribe();
          timeoutId = setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) applyReady();
              else setError('Invalid or expired link. Please request a new invite.');
            });
          }, 5000);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setReady(true);
        } else {
          setError('Invalid or expired link. Please request a new invite.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    };

    init();

    return () => {
      if (timeoutId != null) clearTimeout(timeoutId);
      unsub?.();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const user = await mapSessionToUserWithProfile((await supabase.auth.getSession()).data.session?.user ?? null);
      if (user) {
        window.location.hash = '#/dashboard';
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready && !error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="text-gray-400">
          <i className="fas fa-spinner fa-spin text-2xl mb-4 block" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full p-8 bg-[#111111] rounded-3xl border border-[#333333] shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6 p-4 bg-black rounded-2xl border border-[#333333]">
            {LOGO('w-32 h-auto')}
          </div>
          <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">{BRAND_NAME}</h1>
          <p className="text-gray-400 text-sm mt-2 text-center">
            Set your password to access your account.
          </p>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirm password *</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm your password"
              className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none"
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-black uppercase tracking-widest bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-70 transition-all"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" />
                Setting password...
              </>
            ) : (
              'Set Password & Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
