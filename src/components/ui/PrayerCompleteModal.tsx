'use client';

import { useEffect } from 'react';
import {useTranslations} from 'next-intl';
import { HandsPraying } from '@phosphor-icons/react';

interface PrayerCompleteModalProps {
  durationSeconds: number;
  onClose: () => void;
}

function formatDuration(seconds: number, units: { seconds: string; minutes: string; hours: string }): string {
  if (seconds < 60) return `${seconds}${units.seconds}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}${units.minutes} ${s}${units.seconds}` : `${m}${units.minutes}`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}${units.hours} ${rm}${units.minutes}` : `${h}${units.hours}`;
}

export function PrayerCompleteModal({ durationSeconds, onClose }: PrayerCompleteModalProps) {
  const t = useTranslations('prayer');
  const th = useTranslations('history');

  // Auto-close after 3 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const duration = formatDuration(durationSeconds, {
    seconds: th('seconds'),
    minutes: th('minutes'),
    hours: th('hours'),
  });

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-night/90">
      <div className="mx-8 flex w-full max-w-sm flex-col items-center rounded-3xl border border-gold/15 bg-night p-8 text-center">
        <HandsPraying size={48} weight="light" className="text-gold drop-shadow-glow" />
        <p className="mt-4 text-lg font-semibold text-ivory">
          {t('complete', {duration})}
        </p>
        <p className="mt-2 text-sm text-ivory/45">
          {t('completeMessage')}
        </p>
        <div className="mt-6">
          <button
            onClick={onClose}
            className="h-12 rounded-full border border-gold/30 bg-gold/10 px-8 text-base font-semibold text-gold-light transition-[background-color,transform] duration-300 ease-weighted hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 active:scale-[0.98]"
          >
            {t('amen')}
          </button>
        </div>
      </div>
    </div>
  );
}
