'use client';

import { useEffect, useState } from 'react';
import {useTranslations} from 'next-intl';
import { BookOpenText, FireSimple } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { LogoPulse } from '@/components/ui/LogoPulse';
import { usePrayerStats, type StatsPeriod } from '@/hooks/usePrayerStats';
import type { PrayerRow } from '@/types/prayer';

interface TimeUnits {
  seconds: string;
  minutes: string;
  hours: string;
}

function formatDuration(seconds: number, units: TimeUnits): string {
  if (seconds < 60) return `${seconds}${units.seconds}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}${units.minutes} ${s}${units.seconds}` : `${m}${units.minutes}`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}${units.hours} ${rm}${units.minutes}` : `${h}${units.hours}`;
}

function formatDate(dateStr: string, weekdays: string[]): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = weekdays[d.getDay()];
  return `${month}/${day} (${weekday})`;
}

function formatTime(dateStr: string, amLabel: string, pmLabel: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? amLabel : pmLabel;
  const hour = h % 12 || 12;
  return `${ampm} ${hour}:${m}`;
}

interface HistoryViewProps {
  onClose: () => void;
}

export function HistoryView({ onClose }: HistoryViewProps) {
  const t = useTranslations('history');
  const tp = useTranslations('prayer');
  const ts = useTranslations('settings');
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const { stats, loading: statsLoading } = usePrayerStats(period);
  const [prayers, setPrayers] = useState<PrayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const timeUnits: TimeUnits = {
    seconds: t('seconds'),
    minutes: t('minutes'),
    hours: t('hours'),
  };
  const weekdays = t.raw('weekdays') as string[];

  useEffect(() => {
    async function fetchPrayers() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const now = new Date();
      let since: Date;
      if (period === 'week') {
        since = new Date(now);
        since.setDate(since.getDate() - 7);
      } else if (period === 'prev_week') {
        since = new Date(now);
        since.setDate(since.getDate() - 14);
      } else if (period === 'month') {
        since = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        since = new Date(0);
      }

      const { data } = await supabase
        .from('prayers')
        .select('*')
        .eq('user_id', user.id)
        .gte('prayed_at', since.toISOString())
        .not('duration_seconds', 'is', null)
        .order('prayed_at', { ascending: false })
        .limit(50);

      setPrayers((data as PrayerRow[]) ?? []);
      setLoading(false);
    }
    fetchPrayers();
  }, [period]);

  const isLoading = statsLoading || loading;

  return (
    // 전체 화면 패널. 플로팅 탭바(z-40)가 위에 떠 있으므로 스크롤 영역은 pb-24로 탭바 높이만큼 비운다
    <div className="absolute inset-0 z-30 flex flex-col bg-night">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-16 pb-4">
        <h2 className="text-lg font-semibold text-ivory">{t('title')}</h2>
        <button onClick={onClose} className="rounded-full px-3 py-2 text-sm text-ivory/45 transition-colors duration-300 ease-weighted hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60">{ts('close')}</button>
      </header>

      {/* Period toggle */}
      <div className="flex gap-2 px-6 pb-4">
        {([
          { key: 'week' as const, label: t('thisWeek') },
          { key: 'prev_week' as const, label: t('lastWeek') },
          { key: 'month' as const, label: t('thisMonth') },
          { key: 'all' as const, label: t('all') },
        ]).map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            aria-pressed={period === p.key}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition-[background-color,color] duration-300 ease-weighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
              period === p.key ? 'bg-gold text-night' : 'bg-gold/10 text-ivory/45 hover:text-ivory/70'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        // 통계+목록 로딩을 묶어 화면에 로딩 표시는 하나만
        <div className="flex justify-center pt-16">
          <LogoPulse />
        </div>
      ) : (
        <>
          {/* Stats card */}
          <div className="mx-6 mb-4 rounded-2xl border border-gold/10 bg-gold/5 p-4">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-2xl font-semibold text-gold-light">{stats.total_count}</p>
                <p className="text-xs text-ivory/45">{t('count')}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gold-light">{formatDuration(stats.total_seconds, timeUnits)}</p>
                <p className="text-xs text-ivory/45">{t('totalTime')}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gold-light">
                  {stats.total_count > 0 ? formatDuration(stats.avg_seconds, timeUnits) : '-'}
                </p>
                <p className="text-xs text-ivory/45">{t('average')}</p>
              </div>
            </div>
          </div>

          {/* Prayer list */}
          <div className="flex-1 overflow-y-auto px-6 pb-24">
            {prayers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-12 text-ivory/30">
                <BookOpenText size={32} weight="light" />
                <p className="text-sm">{t('empty')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {prayers.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-gold/10 bg-gold/5 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ivory/70">{formatDate(p.prayed_at, weekdays)}</span>
                      <span className="font-mono text-xs text-ivory/45">{formatTime(p.prayed_at, t('am'), t('pm'))}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-gold-light">
                      <FireSimple size={16} weight="fill" className="text-gold" />
                      <span className="text-sm font-semibold">
                        {p.duration_seconds ? formatDuration(p.duration_seconds, timeUnits) : tp('praying')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
