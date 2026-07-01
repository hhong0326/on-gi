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

  if (variant === 'inline') {
    return (
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs"
        style={{
          background: 'rgba(212, 164, 76, 0.15)',
          border: '1px solid rgba(212, 164, 76, 0.3)',
          color: '#D4A44C',
        }}
      >
        {LOCALE_LABELS[locale]}
        <span className="text-[10px]">›</span>
        {open && (
          <div
            className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
            style={{ background: 'rgba(0, 0, 0, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            {routing.locales.map((loc) => (
              <button
                key={loc}
                onClick={(e) => { e.stopPropagation(); handleSelect(loc); }}
                className={`block w-full px-4 py-2.5 text-left text-xs transition-colors ${
                  loc === locale ? 'text-amber-400' : 'text-white/60 hover:text-white'
                }`}
              >
                {LOCALE_LABELS[loc]}
              </button>
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#D4A44C',
        }}
      >
        🌐 {LOCALE_LABELS[locale]} ▾
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 rounded-xl overflow-hidden"
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {routing.locales.map((loc) => (
              <button
                key={loc}
                onClick={() => handleSelect(loc)}
                className={`block w-full px-5 py-2.5 text-left text-xs whitespace-nowrap transition-colors ${
                  loc === locale ? 'text-amber-400 bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {LOCALE_LABELS[loc]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
