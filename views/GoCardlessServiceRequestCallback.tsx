import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { finalizeServiceRequestPayment } from '../lib/api';

const GoCardlessServiceRequestCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const brq = searchParams.get('brq');
    if (!brq) {
      setError('Missing billing request id.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await finalizeServiceRequestPayment(brq);
        if (cancelled) return;
        window.location.href = `${window.location.origin}${window.location.pathname}#/dashboard?openRequestForm=1&payment_success=1`;
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to complete payment setup.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="max-w-xl mx-auto py-12 text-center">
      <h1 className="text-2xl font-bold text-[#F2C200]">Setting up Direct Debit</h1>
      <p className="mt-3 text-white opacity-80">
        Please wait while we confirm your payment and Direct Debit setup.
      </p>

      {error && (
        <div className="mt-6 bg-red-500/20 border border-red-500/40 text-white px-4 py-3 rounded-xl">
          <div className="font-bold">We couldn’t finish setup.</div>
          <div className="text-sm opacity-90 mt-1">{error}</div>
          <button
            className="mt-4 bg-[#F2C200] text-black px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all"
            onClick={() => (window.location.hash = '#/dashboard')}
          >
            Back to dashboard
          </button>
        </div>
      )}

      {!error && (
        <div className="mt-8 text-white opacity-80 text-sm">
          If this takes more than a few seconds, you can return to the dashboard and try again.
        </div>
      )}
    </div>
  );
};

export default GoCardlessServiceRequestCallback;
