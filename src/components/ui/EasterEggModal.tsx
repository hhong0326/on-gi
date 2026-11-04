'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface EasterEggModalProps {
  onClose: () => void;
}

export function EasterEggModal({ onClose }: EasterEggModalProps) {
  const t = useTranslations('easter');
  const ts = useTranslations('settings');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col px-8 py-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto text-center">
          {/* Bulb icon */}
          <div className="mb-8 flex justify-center drop-shadow-glow">
            <Image src="/icon-bulb-sm.svg" alt="" width={26} height={40} />
          </div>

          {/* Opening verse */}
          <p className="whitespace-pre-line text-sm font-medium text-gold-light">
            {t('verse1')}
          </p>
          <p className="mt-2 text-xs text-ivory/30">{t('verse1Ref')}</p>

          {/* Title */}
          <p className="mb-8 mt-12 text-base font-semibold text-ivory">{t('title')}</p>

          {/* Story */}
          <div className="space-y-6 text-left">
            {(['story1', 'story2', 'story3', 'story4', 'story5', 'story6', 'story7'] as const).map((key) => (
              <p key={key} className="whitespace-pre-line text-sm text-ivory/70">
                {t(key)}
              </p>
            ))}
          </div>

          {/* Closing verse */}
          <p className="mt-12 whitespace-pre-line text-sm font-medium text-gold-light">
            {t('verse2')}
          </p>
          <p className="mb-4 mt-2 text-xs text-ivory/30">{t('verse2Ref')}</p>
        </div>

        {/* Close button */}
        <div className="pt-6">
          <button
            onClick={onClose}
            className="h-12 w-full rounded-full border border-gold/30 bg-gold/10 text-base font-semibold text-gold-light transition-[background-color,transform] duration-300 ease-weighted hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 active:scale-[0.98]"
          >
            {ts('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
