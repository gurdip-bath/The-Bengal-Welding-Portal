import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants';

const DISMISS_KEY = 'pwa_install_prompt_dismissed';
const DISMISS_DAYS = 7;
const DELAY_MS = 4000;

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (isNaN(ts)) return false;
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

interface AddToHomeScreenPromptProps {
  /** When true, position above mobile bottom nav (e.g. customer with Navbar) */
  aboveBottomNav?: boolean;
}

const AddToHomeScreenPrompt: React.FC<AddToHomeScreenPromptProps> = ({ aboveBottomNav }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOS() || isStandalone() || wasDismissedRecently()) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-50 px-4 py-3 flex items-center justify-between gap-4 rounded-t-2xl border-t border-[#333333] animate-in slide-in-from-bottom duration-300 md:bottom-0 ${
        aboveBottomNav ? 'bottom-16 md:bottom-0' : 'bottom-0'
      }`}
      style={{
        backgroundColor: '#111111',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Add to Home Screen</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Tap <span className="inline-flex items-center px-1">
            <i className="fas fa-share-from-square text-[#F2C200] text-[10px]"></i>
          </span> Share, then &quot;Add to Home Screen&quot;
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 px-4 py-2 rounded-xl font-bold text-sm text-black transition-opacity hover:opacity-90 active:scale-95"
        style={{ backgroundColor: COLORS.primary }}
      >
        Got it
      </button>
    </div>
  );
};

export default AddToHomeScreenPrompt;
