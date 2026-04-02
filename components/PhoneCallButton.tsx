import React from 'react';

/** Build a dialable `tel:` href, or null if the value is not plausibly a phone number. */
export function phoneToTelHref(phone: string | null | undefined): string | null {
  const raw = (phone ?? '').trim();
  if (!raw) return null;
  const normalized = raw.startsWith('+')
    ? `+${raw.slice(1).replace(/\D/g, '')}`
    : raw.replace(/\D/g, '');
  if (normalized.replace(/^\+/, '').length < 3) return null;
  return `tel:${normalized}`;
}

type PhoneCallButtonProps = {
  phone: string | null | undefined;
  /** Smaller control for dense tables */
  size?: 'sm' | 'md';
  className?: string;
  /** Use on table rows so clicking call does not select the row */
  stopPropagation?: boolean;
};

/**
 * Quick-call control: uses the device’s default handler for `tel:` (mobile dialer, desktop app, etc.).
 */
export default function PhoneCallButton({
  phone,
  size = 'md',
  className = '',
  stopPropagation,
}: PhoneCallButtonProps) {
  const href = phoneToTelHref(phone);
  if (!href) return null;

  const sizeCls = size === 'sm' ? 'w-7 h-7 min-w-[1.75rem]' : 'w-8 h-8 min-w-[2rem]';
  const iconCls = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <a
      href={href}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={`inline-flex items-center justify-center rounded-lg border border-[#333333] bg-[#111111] text-[#F2C200] hover:bg-[#F2C200] hover:text-black hover:border-[#F2C200] transition-colors shrink-0 ${sizeCls} ${className}`}
      title={`Call ${(phone ?? '').trim()}`}
      aria-label={`Call ${(phone ?? '').trim()}`}
    >
      <i className={`fas fa-phone ${iconCls}`} />
    </a>
  );
}
