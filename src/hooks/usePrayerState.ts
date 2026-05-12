'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { getCurrentPosition } from '@/lib/bridge';
import type { PrayerPoint, PrayerRow } from '@/types/prayer';
import { prayerRowToPoint } from '@/types/prayer';

export type ViewTab = 'home' | 'history' | 'settings';

const POLL_INTERVAL_MS = 3000;
const SEVEN_DAYS_ISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

// Privacy: round GPS to ~50km grid to protect exact location
function fuzzyPosition(pos: { lat: number; lng: number }) {
  return {
    lat: Math.round(pos.lat * 2) / 2,
    lng: Math.round(pos.lng * 2) / 2,
  };
}

export function usePrayerState(defaultTab: ViewTab = 'home') {
  const [nickname, setNickname] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState<PrayerPoint[]>([]);
  const [isPraying, setIsPraying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState<ViewTab>(defaultTab);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePrayerIdRef = useRef<string | null>(null);
  const prevDurationRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const lastFetchTimeRef = useRef<string>(SEVEN_DAYS_ISO);

  const supabase = createClient();

  // Load user + initial prayers
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReady(true);
        return;
      }
      userIdRef.current = user.id;

      // Load nickname
      const { data: profile } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', user.id)
        .single();
      if (profile && profile.nickname !== '기도자') {
        setNickname(profile.nickname);
      }

      // Load recent prayers (last 7 days)
      const { data: prayers } = await supabase
        .from('prayers')
        .select('*')
        .gte('prayed_at', SEVEN_DAYS_ISO)
        .order('prayed_at', { ascending: false })
        .limit(200);

      if (prayers && prayers.length > 0) {
        const mapped = (prayers as PrayerRow[]).map((r) =>
          prayerRowToPoint(r, user.id)
        );
        setPoints(mapped);
        lastFetchTimeRef.current = (prayers[0] as PrayerRow).prayed_at;
      }

      setReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for new prayers every 3s
  useEffect(() => {
    if (!ready || !userIdRef.current) return;

    const interval = setInterval(async () => {
      const { data: newPrayers } = await supabase
        .from('prayers')
        .select('*')
        .gt('prayed_at', lastFetchTimeRef.current)
        .order('prayed_at', { ascending: true })
        .limit(50);

      if (newPrayers && newPrayers.length > 0) {
        const mapped = (newPrayers as PrayerRow[]).map((r) =>
          prayerRowToPoint(r, userIdRef.current)
        );
        setPoints((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = mapped.filter((p) => !existingIds.has(p.id));
          return [...prev, ...fresh];
        });
        lastFetchTimeRef.current = (newPrayers[newPrayers.length - 1] as PrayerRow).prayed_at;
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Prayer timer
  useEffect(() => {
    if (isPraying) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPraying]);

  const handleTogglePrayer = useCallback(async () => {
    if (isPraying) {
      // Stop praying — accumulate duration (previous + this session)
      setIsPraying(false);
      if (activePrayerIdRef.current) {
        const totalDuration = prevDurationRef.current + elapsedSeconds;
        await supabase
          .from('prayers')
          .update({ duration_seconds: totalDuration })
          .eq('id', activePrayerIdRef.current);

        // Update local point to residual
        const prayerId = activePrayerIdRef.current;
        setPoints((prev) =>
          prev.map((p) =>
            p.id === prayerId ? { ...p, isActive: false } : p
          )
        );
        activePrayerIdRef.current = null;
      }
    } else {
      // Start praying — upsert today's row
      setIsPraying(true);
      const rawPos = await getCurrentPosition();
      const pos = fuzzyPosition(rawPos);
      const userId = userIdRef.current;
      if (!userId) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Check if today's prayer already exists
      const { data: existing } = await supabase
        .from('prayers')
        .select('id, duration_seconds')
        .eq('user_id', userId)
        .gte('prayed_at', todayStart.toISOString())
        .order('prayed_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        // Update existing: new location, reset to active
        await supabase
          .from('prayers')
          .update({ lat: pos.lat, lng: pos.lng, prayed_at: new Date().toISOString(), duration_seconds: null })
          .eq('id', existing.id);

        activePrayerIdRef.current = existing.id;

        // Remove old local point, add updated one
        setPoints((prev) => {
          const filtered = prev.filter((p) => p.id !== existing.id);
          return [...filtered, {
            id: existing.id,
            lat: pos.lat,
            lng: pos.lng,
            intensity: 1,
            isUser: true,
            isActive: true,
          }];
        });

        // Store previous duration for accumulation on end
        prevDurationRef.current = existing.duration_seconds ?? 0;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('prayers')
          .insert({ user_id: userId, lat: pos.lat, lng: pos.lng })
          .select('id, prayed_at')
          .single();

        if (!error && data) {
          activePrayerIdRef.current = data.id;
          setPoints((prev) => [...prev, {
            id: data.id,
            lat: pos.lat,
            lng: pos.lng,
            intensity: 1,
            isUser: true,
            isActive: true,
          }]);
          prevDurationRef.current = 0;
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPraying, elapsedSeconds]);

  return {
    nickname,
    ready,
    points,
    isPraying,
    elapsedSeconds,
    activeTab,
    setActiveTab,
    handleTogglePrayer,
  };
}
