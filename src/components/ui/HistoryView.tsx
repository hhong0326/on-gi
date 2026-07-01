'use client';

import { useEffect, useState } from 'react';
import {useTranslations} from 'next-intl';
import { createClient } from '@/lib/supabase/client';
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

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#08080F]">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-14 pb-4">
        <h2 className="text-lg font-bold text-white">{t('title')}</h2>
        <button onClick={onClose} className="text-sm text-white/50">{ts('close')}</button>
      </header>

      {/* Period toggle */}
      <div className="flex gap-2 px-5 pb-4">
        {([
          { key: 'week' as const, label: t('thisWeek') },
          { key: 'prev_week' as const, label: t('lastWeek') },
          { key: 'month' as const, label: t('thisMonth') },
          { key: 'all' as const, label: t('all') },
        ]).map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              period === p.key ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats card */}
      <div className="mx-5 mb-4 rounded-xl bg-white/5 p-4">
        {statsLoading ? (
          <p className="text-center text-xs text-white/30">{t('loading')}</p>
        ) : (
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-amber-400">{stats.total_count}</p>
              <p className="text-xs text-white/40">{t('count')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{formatDuration(stats.total_seconds, timeUnits)}</p>
              <p className="text-xs text-white/40">{t('totalTime')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">
                {stats.total_count > 0 ? formatDuration(stats.avg_seconds, timeUnits) : '-'}
              </p>
              <p className="text-xs text-white/40">{t('average')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Prayer list */}
      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {loading ? (
          <p className="text-center text-xs text-white/30 pt-10">{t('loading')}</p>
        ) : prayers.length === 0 ? (
          <p className="text-center text-xs text-white/30 pt-10">{t('empty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {prayers.map((p) => (
              <div key={p.id} className="rounded-xl bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">{formatDate(p.prayed_at, weekdays)}</span>
                  <span className="text-xs text-white/40">{formatTime(p.prayed_at, t('am'), t('pm'))}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-amber-400">🕯️</span>
                  <span className="text-sm font-medium text-amber-300">
                    {p.duration_seconds ? formatDuration(p.duration_seconds, timeUnits) : tp('praying')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
