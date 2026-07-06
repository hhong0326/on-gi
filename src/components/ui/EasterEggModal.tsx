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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col px-8 py-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto text-center">
          {/* Bulb icon */}
          <div className="mb-8 flex justify-center" style={{ filter: 'drop-shadow(0 0 12px rgba(212, 164, 76, 0.5))' }}>
            <Image src="/icon-bulb-sm.svg" alt="" width={26} height={40} />
          </div>

          {/* Opening verse */}
          <p className="whitespace-pre-line text-sm font-medium leading-relaxed" style={{ color: '#F5D98A' }}>
            {t('verse1')}
          </p>
          <p className="mt-2 text-xs text-white/35">{t('verse1Ref')}</p>

          {/* Title */}
          <p className="mb-8 mt-12 text-base font-semibold text-white/90">{t('title')}</p>

          {/* Story */}
          <div className="space-y-6 text-left">
            {(['story1', 'story2', 'story3', 'story4', 'story5', 'story6', 'story7'] as const).map((key) => (
              <p key={key} className="whitespace-pre-line text-sm leading-relaxed text-white/60">
                {t(key)}
              </p>
            ))}
          </div>

          {/* Closing verse */}
          <p className="mt-12 whitespace-pre-line text-sm italic leading-relaxed" style={{ color: '#F5D98A' }}>
            {t('verse2')}
          </p>
          <p className="mb-4 mt-2 text-xs text-white/35">{t('verse2Ref')}</p>
        </div>

        {/* Close button */}
        <div className="pt-6">
          <button
            onClick={onClose}
            className="w-full rounded-full py-3 text-sm text-amber-300"
            style={{
              background: 'rgba(212, 164, 76, 0.12)',
              border: '1px solid rgba(212, 164, 76, 0.3)',
            }}
          >
            {ts('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
