'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { CaretDown, CaretRight, Check, Globe } from '@phosphor-icons/react';
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
      className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold transition-colors duration-300 ease-weighted hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      {LOCALE_LABELS[locale]}
      <CaretRight size={12} />
    </button>
  ) : (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 rounded-full border border-gold/15 bg-gold/5 px-3 py-2 text-xs text-gold transition-colors duration-300 ease-weighted hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      <Globe size={16} />
      {LOCALE_LABELS[locale]}
      <CaretDown size={12} />
    </button>
  );

  return (
    <>
      {triggerButton}

      {/* body로 portal: 부모 패널의 stacking context(z-30)에 갇혀 플로팅 탭바(z-40) 아래로 깔리지 않게 */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-night/80" />
          <div
            className="relative mx-4 mb-4 w-full max-w-sm rounded-3xl border border-gold/15 bg-night pb-4 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gold/20" />
            <p className="flex items-center gap-2 px-6 pb-2 text-xs text-ivory/45"><Globe size={14} /> Language</p>
            {routing.locales.map((loc) => (
              <button
                key={loc}
                onClick={() => handleSelect(loc)}
                className={`flex w-full items-center justify-between px-6 py-3 text-sm transition-colors duration-300 ease-weighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                  loc === locale
                    ? 'text-gold'
                    : 'text-ivory/70 hover:bg-gold/5 active:bg-gold/10'
                }`}
              >
                {LOCALE_LABELS[loc]}
                {loc === locale && <Check size={16} weight="bold" />}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
