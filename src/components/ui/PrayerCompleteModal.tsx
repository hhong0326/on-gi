'use client';

import { useEffect, useState } from 'react';
import {useTranslations} from 'next-intl';
import { HandsPraying } from '@phosphor-icons/react';
import { fetchPrayerContribution, levelProgress, type PrayerContribution } from '@/lib/church';
import { formatDuration, hasBatchim } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

interface PrayerCompleteModalProps {
  durationSeconds: number;
  prayerId: string | null;
  onClose: () => void;
  onFindChurch: () => void;
}

// 교회 기여 정보가 있으면 읽을 시간이 더 필요해 자동 닫힘을 늘린다
const AUTO_CLOSE_MS = 3000;
const AUTO_CLOSE_WITH_CHURCH_MS = 5000;

export function PrayerCompleteModal({ durationSeconds, prayerId, onClose, onFindChurch }: PrayerCompleteModalProps) {
  const t = useTranslations('prayer');
  const th = useTranslations('history');
  const tch = useTranslations('church');
  const [contribution, setContribution] = useState<PrayerContribution | null>(null);

  useEffect(() => {
    if (!prayerId) return;
    let cancelled = false;
    fetchPrayerContribution(createClient(), prayerId).then((c) => {
      if (!cancelled) setContribution(c);
    });
    return () => { cancelled = true; };
  }, [prayerId]);

  const hasChurchInfo = !!contribution && (!!contribution.church || contribution.neighborCount > 0);

  useEffect(() => {
    const timer = setTimeout(onClose, hasChurchInfo ? AUTO_CLOSE_WITH_CHURCH_MS : AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [onClose, hasChurchInfo]);

  const duration = formatDuration(durationSeconds, {
    seconds: th('seconds'),
    minutes: th('minutes'),
    hours: th('hours'),
  });
  const church = contribution?.church ?? null;
  const neighbors = contribution?.neighborCount ?? 0;

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

        {church && (
          <div className="mt-6 flex w-full flex-col gap-2">
            <p className="text-sm font-semibold text-gold-light">{tch(hasBatchim(duration) ? 'added' : 'addedNoBatchim', { church: church.name, duration })}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-gold/15">
              <div className="h-full origin-left rounded-full bg-gold" style={{ transform: `scaleX(${levelProgress(church)})` }} />
            </div>
            {neighbors > 0 && <p className="text-xs text-ivory/45">{tch('neighbors', { count: neighbors })}</p>}
          </div>
        )}

        {!church && contribution && (
          <div className="mt-6 flex w-full flex-col items-center gap-3">
            {neighbors > 0 && <p className="text-sm text-gold-light">{tch('noChurchNeighbors', { count: neighbors })}</p>}
            <button
              onClick={onFindChurch}
              className="rounded-full px-3 py-2 text-xs text-gold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              {tch('noChurchCta')}
            </button>
          </div>
        )}

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
