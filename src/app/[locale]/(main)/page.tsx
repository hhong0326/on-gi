'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from '@/i18n/navigation';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
import { appConfig } from '@/lib/app-config';
import { getPrayerAudio } from '@/lib/audio';
import { LogoPulse } from '@/components/ui/LogoPulse';
import { PrayerOverlay } from '@/components/ui/PrayerOverlay';
import { HistoryView } from '@/components/ui/HistoryView';
import { PrayerCompleteModal } from '@/components/ui/PrayerCompleteModal';
import { SettingsView } from '@/components/ui/SettingsView';
import { EasterEggModal } from '@/components/ui/EasterEggModal';

const MapboxView = dynamic(
  () => import('@/components/mapbox/MapboxView').then((m) => m.MapboxView),
  { ssr: false }
);

export default function MainPage() {
  const state = usePrayerState('home');
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [completedDuration, setCompletedDuration] = useState<number | null>(null);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [spinAvailable, setSpinAvailable] = useState(true);
  const resumeSpinRef = useRef<(() => void) | null>(null);


  const handleTabChange = (tab: ViewTab) => {
    if (tab === 'settings') {
      setShowSettings((v) => !v);
      setShowHistory(false);
    } else if (tab === 'history') {
      setShowHistory(true);
      setShowSettings(false);
    } else {
      setShowHistory(false);
      setShowSettings(false);
      state.setActiveTab(tab);
    }
  };

  const handleTogglePrayer = async () => {
    if (state.isPraying) {
      getPrayerAudio().stop();
      // Capture elapsed before state resets
      const elapsed = state.elapsedSeconds;
      await state.handleTogglePrayer();
      if (elapsed > 0) setCompletedDuration(elapsed);
      return;
    }
    // 사용자 제스처 콜스택 안에서(await 이전) 재생해야 iOS 자동재생 정책을 통과한다
    // features.audio 플래그(app_config)로 배포 없이 켜고 끌 수 있다
    if (appConfig.features.audio) getPrayerAudio().play();
    await state.handleTogglePrayer();
  };

  // 어떤 경로로든 기도가 끝나면 음악도 반드시 멈춘다 (버튼 핸들러의 stop은 즉시성용, 이건 상태 기반 보장)
  useEffect(() => {
    if (!state.isPraying) getPrayerAudio().stop();
  }, [state.isPraying]);

  useEffect(() => {
    return () => getPrayerAudio().stop();
  }, []);

  useEffect(() => {
    if (state.ready && !state.nickname) {
      router.push('/onboarding');
    }
  }, [state.ready, state.nickname, router]);

  // Render map immediately so the Mapbox chunk/WebGL/tiles load in parallel
  // with Supabase auth + data queries; only overlay UI waits for readiness.
  const uiReady = state.ready && !!state.nickname;

  // Splash cover: 신규 유저(닉네임 없음)는 커버가 유지된 채 온보딩으로 넘어가
  // 지구본 깜빡임을 보지 않는다. uiReady 후 페이드아웃 → DOM 제거.
  const [splashGone, setSplashGone] = useState(false);
  useEffect(() => {
    if (!uiReady) return;
    const timeout = setTimeout(() => setSplashGone(true), 600);
    return () => clearTimeout(timeout);
  }, [uiReady]);

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: '#08080F' }}>
      <div className="absolute inset-0 z-0">
        <MapboxView
          points={state.points}
          isPraying={state.isPraying}
          userPosition={state.userPosition}
          onEasterEggClick={() => setShowEasterEgg(true)}
          onSpinAvailableChange={setSpinAvailable}
          resumeSpinRef={resumeSpinRef}
        />
      </div>

      {showSettings && (
        <SettingsView
          nickname={state.nickname}
          onNicknameSaved={state.setNickname}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHistory && (
        <HistoryView onClose={() => setShowHistory(false)} />
      )}

      {showEasterEgg && (
        <EasterEggModal onClose={() => setShowEasterEgg(false)} />
      )}

      {completedDuration !== null && (
        <PrayerCompleteModal
          durationSeconds={completedDuration}
          onClose={() => setCompletedDuration(null)}
        />
      )}

      {!splashGone && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
            uiReady ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ background: '#08080F' }}
        >
          <LogoPulse />
        </div>
      )}

      {uiReady && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <PrayerOverlay
            prayerCount={state.points.filter((p) => p.isActive).length}
            isPraying={state.isPraying}
            elapsedSeconds={state.elapsedSeconds}
            onTogglePrayer={handleTogglePrayer}
            activeTab={showSettings ? 'settings' : showHistory ? 'history' : state.activeTab}
            onTabChange={handleTabChange}
            nickname={state.nickname}
            showSpinButton={spinAvailable}
            onSpinClick={() => resumeSpinRef.current?.()}
          />
        </div>
      )}
    </div>
  );
}
