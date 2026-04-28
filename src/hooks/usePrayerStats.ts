'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type StatsPeriod = 'week' | 'prev_week' | 'month' | 'all';

export interface PrayerStats {
  total_count: number;
  total_seconds: number;
  avg_seconds: number;
  period: string;
  period_start: string;
  period_end: string;
}

const EMPTY_STATS: PrayerStats = {
  total_count: 0,
  total_seconds: 0,
  avg_seconds: 0,
  period: 'week',
  period_start: '',
  period_end: '',
};

export function usePrayerStats(period: StatsPeriod = 'week') {
  const [stats, setStats] = useState<PrayerStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data, error } = await supabase.rpc('get_prayer_stats', {
      p_user_id: user.id,
      p_period: period,
      p_timezone: timezone,
    });

    if (!error && data) {
      setStats(data as unknown as PrayerStats);
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
