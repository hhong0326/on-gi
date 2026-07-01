'use client';

import { useEffect } from 'react';
import {useTranslations} from 'next-intl';

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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-8 w-full max-w-sm rounded-2xl bg-[#12121F] p-8 text-center shadow-2xl">
        <p className="text-4xl">🙏</p>
        <p className="mt-4 text-lg font-medium text-white">
          {t('complete', {duration})}
        </p>
        <p className="mt-2 text-sm text-white/40">
          {t('completeMessage')}
        </p>
        <div className="mt-6">
          <button
            onClick={onClose}
            className="rounded-full bg-amber-500/20 px-6 py-2 text-sm text-amber-300"
          >
            {t('amen')}
          </button>
        </div>
      </div>
    </div>
  );
}
