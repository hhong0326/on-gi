'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { getCurrentPosition } from '@/lib/bridge';
import type { PrayerPoint } from '@/types/prayer';

const SEED_LOCATIONS = [
  // Global
  { lat: 31.7683, lng: 35.2137 },   // Jerusalem
  { lat: 40.7128, lng: -74.006 },   // NYC
  { lat: 51.5074, lng: -0.1278 },   // London
  { lat: 35.6762, lng: 139.6503 },  // Tokyo
  { lat: -33.8688, lng: 151.2093 }, // Sydney
  { lat: 48.8566, lng: 2.3522 },    // Paris
  { lat: 55.7558, lng: 37.6173 },   // Moscow
  { lat: -22.9068, lng: -43.1729 }, // Rio
  { lat: 1.3521, lng: 103.8198 },   // Singapore
  { lat: 34.0522, lng: -118.2437 }, // LA
  { lat: 13.7563, lng: 100.5018 },  // Bangkok
  { lat: 30.0444, lng: 31.2357 },   // Cairo
  { lat: -1.2921, lng: 36.8219 },   // Nairobi
  { lat: 19.4326, lng: -99.1332 },  // Mexico City
  // Seoul / Gyeonggi cluster test
  { lat: 37.5665, lng: 126.978 },   // Seoul City Hall
  { lat: 37.5512, lng: 126.988 },   // Myeongdong
  { lat: 37.5172, lng: 127.0473 },  // Gangnam
  { lat: 37.4979, lng: 127.0276 },  // Seocho
  { lat: 37.6584, lng: 127.0497 },  // Nowon
  { lat: 37.4563, lng: 126.7052 },  // Incheon
  { lat: 37.3897, lng: 127.0997 },  // Bundang
  { lat: 37.2911, lng: 127.0089 },  // Suwon
  { lat: 37.7413, lng: 127.0477 },  // Uijeongbu
  { lat: 37.6519, lng: 127.0480 },  // Dobong
  { lat: 37.5407, lng: 127.0700 },  // Seongdong
  { lat: 37.5800, lng: 126.9770 },  // Jongno
];

function createSeedPoints(): PrayerPoint[] {
  return SEED_LOCATIONS.map((loc, i) => ({
    id: `seed-${i}`,
    lat: loc.lat + (Math.random() - 0.5) * 2,
    lng: loc.lng + (Math.random() - 0.5) * 2,
    intensity: 0.3 + Math.random() * 0.7,
    isUser: false,
  }));
}

export type ViewTab = 'globe' | 'map' | 'history' | 'settings';

export function usePrayerState(defaultTab: ViewTab = 'globe') {
  const [nickname, setNickname] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState<PrayerPoint[]>(createSeedPoints);
  const [isPraying, setIsPraying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState<ViewTab>(defaultTab);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userPointIdRef = useRef<string | null>(null);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReady(true);
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', user.id)
        .single();
      if (data && data.nickname !== '기도자') {
        setNickname(data.nickname);
      }
      setReady(true);
    }
    loadUser();
  }, []);

  // Simulate new prayer points every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setPoints((prev) => {
        const loc = SEED_LOCATIONS[Math.floor(Math.random() * SEED_LOCATIONS.length)];
        const newPoint: PrayerPoint = {
          id: `sim-${Date.now()}`,
          lat: loc.lat + (Math.random() - 0.5) * 10,
          lng: loc.lng + (Math.random() - 0.5) * 10,
          intensity: 0.4 + Math.random() * 0.6,
          isUser: false,
        };
        return [...prev, newPoint];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
      setIsPraying(false);
      if (userPointIdRef.current) {
        setPoints((prev) => prev.filter((p) => p.id !== userPointIdRef.current));
        userPointIdRef.current = null;
      }
    } else {
      setIsPraying(true);
      const pos = await getCurrentPosition();
      const userPoint: PrayerPoint = {
        id: `user-${Date.now()}`,
        lat: pos.lat,
        lng: pos.lng,
        intensity: 1,
        isUser: true,
      };
      userPointIdRef.current = userPoint.id;
      setPoints((prev) => [...prev, userPoint]);
    }
  }, [isPraying]);

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
