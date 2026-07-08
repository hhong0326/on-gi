'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'inline';
}

export function LanguageSelector({ variant = 'dropdown' }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setOpen(false);
  };

  const triggerButton = variant === 'inline' ? (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs"
      style={{
        background: 'rgba(212, 164, 76, 0.15)',
        border: '1px solid rgba(212, 164, 76, 0.3)',
        color: '#D4A44C',
      }}
    >
      {LOCALE_LABELS[locale]}
      <span className="text-[10px]">›</span>
    </button>
  ) : (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all"
      style={{
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#D4A44C',
      }}
    >
      🌐 {LOCALE_LABELS[locale]} ▾
    </button>
  );

  return (
    <>
      {triggerButton}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/80" />
          <div
            className="relative w-full max-w-sm rounded-t-2xl pb-8 pt-3"
            style={{
              background: '#1a1a2e',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderBottom: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <p className="px-5 pb-2 text-xs text-white/40">🌐 Language</p>
            {routing.locales.map((loc) => (
              <button
                key={loc}
                onClick={() => handleSelect(loc)}
                className={`flex w-full items-center justify-between px-5 py-3 text-sm transition-colors ${
                  loc === locale
                    ? 'text-amber-400'
                    : 'text-white/60 active:bg-white/5'
                }`}
              >
                {LOCALE_LABELS[loc]}
                {loc === locale && <span className="text-amber-400">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
