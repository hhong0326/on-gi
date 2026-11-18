'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { loadAppConfig } from '@/lib/app-config';
import { createClient } from '@/lib/supabase/client';
import { getCurrentPosition } from '@/lib/bridge';
import type { PrayerFeedRow, PrayerPoint } from '@/types/prayer';
import { feedRowToPoint, hashJitter, isWithinActiveWindow } from '@/types/prayer';

export type ViewTab = 'home' | 'history' | 'settings';

const POLL_INTERVAL_MS = 3000;
const FEED_EPOCH = new Date(0).toISOString();
// 저장 실패한 기도 마치기 — 이번 기도 시간(초)만 기록한다. 서버가 경과 시간으로 상한을 건다
const PENDING_END_KEY = 'ongi-pending-prayer-end';
// 이전 버전 키 (누적 시간을 저장했음) — 형식이 달라 버린다
const LEGACY_PENDING_KEY = 'ongi-pending-duration';

interface PendingEnd {
  id: string;
  seconds: number;
}

function readPendingEnd(): PendingEnd | null {
  try {
    localStorage.removeItem(LEGACY_PENDING_KEY);
    const raw = localStorage.getItem(PENDING_END_KEY);
    return raw ? (JSON.parse(raw) as PendingEnd) : null;
  } catch {
    return null;
  }
}

function writePendingEnd(value: PendingEnd | null) {
  try {
    if (value) localStorage.setItem(PENDING_END_KEY, JSON.stringify(value));
    else localStorage.removeItem(PENDING_END_KEY);
  } catch {
    // storage unavailable
  }
}

// 바뀐 기도는 지우고 뒤에 다시 넣는다 — 마커는 배열 뒤쪽(최신)부터 그려진다
function mergeFeed(prev: PrayerPoint[], rows: PrayerFeedRow[]): PrayerPoint[] {
  const byId = new Map(prev.map((p) => [p.id, p]));
  for (const row of rows) {
    byId.delete(row.id);
    byId.set(row.id, feedRowToPoint(row));
  }
  return [...byId.values()];
}

function latestUpdatedAt(rows: PrayerFeedRow[], fallback: string): string {
  return rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), fallback);
}

/// Privacy: round GPS to ~10km grid to protect exact location
/// (서버도 같은 격자로 반올림하지만, 정확한 좌표는 기기 밖으로 보내지 않는다)
function fuzzyPosition(pos: { lat: number; lng: number }) {
  return {
    lat: Math.round(pos.lat * 10) / 10,
    lng: Math.round(pos.lng * 10) / 10,
  };
}

export function usePrayerState(defaultTab: ViewTab = 'home') {
  const [nickname, setNickname] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState<PrayerPoint[]>([]);
  const [isPraying, setIsPraying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState<ViewTab>(defaultTab);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePrayerIdRef = useRef<string | null>(null);
  const prayerStartRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const lastFetchTimeRef = useRef<string>(FEED_EPOCH);
  const pollInFlightRef = useRef(false);

  const supabase = createClient();

  // 백그라운드 장기 체류 후 만료 토큰으로 호출이 401 거부될 수 있다 —
  // 실패 시 세션 갱신 후 1회 재시도, 그래도 실패하면 다음 실행 때 반영(pending).
  // 누적·상한 계산은 서버(end_prayer)가 하고, 이미 마친 기도면 저장된 값을 돌려준다
  async function endPrayer(id: string, seconds: number) {
    const attempt = () =>
      supabase.rpc('end_prayer', { p_prayer_id: id, p_client_seconds: seconds });
    let { error } = await attempt();
    if (error) {
      await supabase.auth.refreshSession();
      ({ error } = await attempt());
    }
    if (error) {
      writePendingEnd({ id, seconds });
    } else if (readPendingEnd()?.id === id) {
      writePendingEnd(null);
    }
  }

  // Load user + initial prayers
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReady(true);
        return;
      }
      userIdRef.current = user.id;

      // 이전 세션에서 저장 실패한 기도 마치기 반영 (이미 마친 기도면 서버가 무시)
      const pending = readPendingEnd();
      if (pending) {
        const { error } = await supabase.rpc('end_prayer', {
          p_prayer_id: pending.id,
          p_client_seconds: pending.seconds,
        });
        if (!error) writePendingEnd(null);
      }

      // Load app config + nickname + recent prayers (감쇠 기간) in parallel
      const [, { data: profile }, { data: feed }] = await Promise.all([
        loadAppConfig(supabase),
        supabase
          .from('users')
          .select('nickname')
          .eq('id', user.id)
          .single(),
        supabase.rpc('get_prayer_feed'),
      ]);

      if (profile && profile.nickname !== '기도자') {
        setNickname(profile.nickname);
      }

      if (feed && feed.length > 0) {
        // 피드는 최신순 — 뒤집어서 최신이 배열 뒤에 오게 한다
        setPoints([...feed].reverse().map(feedRowToPoint));
        lastFetchTimeRef.current = latestUpdatedAt(feed, FEED_EPOCH);
      }

      setReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 3s — 시작·마치기·재시작 모두 updated_at으로 잡힌다.
  // 화면이 가려져 있으면 쉬고(요청 절약), 돌아오면 그동안 바뀐 것을 한 번에 받는다
  useEffect(() => {
    if (!ready || !userIdRef.current) return;

    const interval = setInterval(async () => {
      if (document.visibilityState === 'hidden' || pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        const { data: changed } = await supabase.rpc('get_prayer_feed', {
          p_since: lastFetchTimeRef.current,
        });
        const rows = changed ?? [];
        if (rows.length > 0) {
          lastFetchTimeRef.current = latestUpdatedAt(rows, lastFetchTimeRef.current);
        }

        setPoints((prev) => {
          const merged = rows.length > 0 ? mergeFeed(prev, rows) : prev;
          // 마치지 않고 30분이 지난 기도는 잔광으로 (내가 지금 하는 기도는 제외)
          const stale = merged.some(
            (p) => p.isActive && p.id !== activePrayerIdRef.current && !isWithinActiveWindow(p.prayedAt)
          );
          if (!stale) return merged;
          return merged.map((p) =>
            p.isActive && p.id !== activePrayerIdRef.current && !isWithinActiveWindow(p.prayedAt)
              ? { ...p, isActive: false }
              : p
          );
        });
      } finally {
        pollInFlightRef.current = false;
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Prayer timer — Date.now() 기준 계산 (백그라운드 복귀 시 정확한 시간)
  useEffect(() => {
    if (isPraying) {
      prayerStartRef.current = Date.now();
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - prayerStartRef.current) / 1000));
      }, 1000);

      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible' && prayerStartRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - prayerStartRef.current) / 1000));
          // 백그라운드 중 토큰이 만료됐을 수 있어 선제 갱신 —
          // 사용자가 "기도 마치기"를 누를 때 유효 토큰을 보장
          supabase.auth.getSession();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPraying]);

  // 기도를 마치면 그 기도의 id를 돌려준다 (기도 완료 모달에서 교회 기여 조회용)
  const handleTogglePrayer = useCallback(async (): Promise<string | null> => {
    if (isPraying) {
      // Stop praying — 이번 기도 시간만 보내고 같은 날 누적은 서버가 더한다
      setIsPraying(false);
      setUserPosition(null);
      if (activePrayerIdRef.current) {
        const sessionSeconds = Math.floor((Date.now() - prayerStartRef.current) / 1000);
        await endPrayer(activePrayerIdRef.current, sessionSeconds);

        // Update local point to residual
        const prayerId = activePrayerIdRef.current;
        setPoints((prev) =>
          prev.map((p) =>
            p.id === prayerId ? { ...p, isActive: false } : p
          )
        );
        activePrayerIdRef.current = null;
        return prayerId;
      }
      return null;
    } else {
      // Start praying — upsert today's row
      setIsPraying(true);
      const rawPos = await getCurrentPosition();
      setUserPosition(rawPos);
      const pos = fuzzyPosition(rawPos);
      if (!userIdRef.current) return null;

      // 오늘 기도 행 만들기/다시 시작은 서버가 한다 (사용자 시간대 기준 하루 1행)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error } = await supabase.rpc('start_prayer', {
        p_lat: pos.lat,
        p_lng: pos.lng,
        p_timezone: timezone,
      });
      if (error || !data) {
        console.warn('prayer start failed:', error?.message);
        return null;
      }

      const started = data as { id: string; lat: number; lng: number; prayed_at: string };
      activePrayerIdRef.current = started.id;
      const j = hashJitter(started.id);
      setPoints((prev) => [
        ...prev.filter((p) => p.id !== started.id),
        {
          id: started.id,
          lat: started.lat + j.dLat,
          lng: started.lng + j.dLng,
          intensity: 1,
          isUser: true,
          isActive: true,
          prayedAt: started.prayed_at,
        },
      ]);
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPraying]);

  return {
    nickname,
    setNickname,
    ready,
    points,
    isPraying,
    elapsedSeconds,
    activeTab,
    setActiveTab,
    handleTogglePrayer,
    userPosition,
  };
}
