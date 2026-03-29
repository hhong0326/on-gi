'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import { createClient } from '@/lib/supabase/client';
import { getCurrentPosition } from '@/lib/bridge';
import { PrayerOverlay } from '@/components/globe/PrayerOverlay';
import type { PrayerPoint } from '@/components/globe/GlobeView';

const GlobeView = dynamic(
  () => import('@/components/globe/GlobeView').then((m) => m.GlobeView),
  { ssr: false }
);

const SEED_LOCATIONS = [
  { lat: 37.5665, lng: 126.978 },   // Seoul
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

export default function MainPage() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState<PrayerPoint[]>(createSeedPoints);
  const [isPraying, setIsPraying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState<'globe' | 'history' | 'settings'>('globe');
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
      // Stop praying — remove user point
      setIsPraying(false);
      if (userPointIdRef.current) {
        setPoints((prev) => prev.filter((p) => p.id !== userPointIdRef.current));
        userPointIdRef.current = null;
      }
    } else {
      // Start praying — get GPS, add user point
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

  if (!ready) return null;

  if (!nickname) {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center px-6"
        style={{ background: '#08080F' }}
      >
        <p className="text-center text-sm text-white/40">
          초대 링크를 통해 입장해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: '#08080F' }}>
      {/* Globe */}
      <div className="absolute inset-0">
        <GlobeView points={points} />
      </div>

      {/* Overlay */}
      <PrayerOverlay
        prayerCount={points.length}
        isPraying={isPraying}
        elapsedSeconds={elapsedSeconds}
        onTogglePrayer={handleTogglePrayer}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Nickname badge */}
      <div className="absolute right-4 top-14 z-10">
        <span className="text-xs text-white/50">{nickname}님</span>
      </div>
    </div>
  );
}
