'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from '@/i18n/navigation';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
import { useMyChurch } from '@/hooks/useMyChurch';
import { appConfig } from '@/lib/app-config';
import { getPrayerAudio } from '@/lib/audio';
import { LogoPulse } from '@/components/ui/LogoPulse';
import { PrayerOverlay } from '@/components/ui/PrayerOverlay';
import { TabBar } from '@/components/ui/TabBar';
import { HistoryView } from '@/components/ui/HistoryView';
import { PrayerCompleteModal } from '@/components/ui/PrayerCompleteModal';
import { SettingsView } from '@/components/ui/SettingsView';
import { EasterEggModal } from '@/components/ui/EasterEggModal';
import { ChurchView } from '@/components/church/ChurchView';

// 내 교회가 없는 사람에게 기도 시작 시 안내는 하루 한 번만 (기기 로컬 기록)
const CHURCH_NUDGE_KEY = 'ongi-church-nudge-date';
const CHURCH_NUDGE_MS = 6000;

function takeDailyChurchNudge(): boolean {
  try {
    const today = new Date().toDateString();
    if (localStorage.getItem(CHURCH_NUDGE_KEY) === today) return false;
    localStorage.setItem(CHURCH_NUDGE_KEY, today);
    return true;
  } catch {
    return false;
  }
}

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
  const [completedPrayerId, setCompletedPrayerId] = useState<string | null>(null);
  const [showChurch, setShowChurch] = useState(false);
  const [showChurchNudge, setShowChurchNudge] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [spinAvailable, setSpinAvailable] = useState(true);
  const resumeSpinRef = useRef<(() => void) | null>(null);


  const handleTabChange = (tab: ViewTab) => {
    setShowChurch(false);
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
      setShowChurchNudge(false);
      const endedPrayerId = await state.handleTogglePrayer();
      if (elapsed > 0) {
        setCompletedPrayerId(endedPrayerId);
        setCompletedDuration(elapsed);
      }
      refreshChurch();
      return;
    }
    // 사용자 제스처 콜스택 안에서(await 이전) 재생해야 iOS 자동재생 정책을 통과한다
    // features.audio 플래그(app_config)로 배포 없이 켜고 끌 수 있다
    if (appConfig.features.audio) getPrayerAudio().play();
    if (churchLoaded && !myChurch && takeDailyChurchNudge()) setShowChurchNudge(true);
    await state.handleTogglePrayer();
  };

  const closeCompleteModal = useCallback(() => {
    setCompletedDuration(null);
    setCompletedPrayerId(null);
  }, []);

  const openChurch = () => {
    setShowChurchNudge(false);
    setShowHistory(false);
    setShowSettings(true);
    setShowChurch(true);
  };

  useEffect(() => {
    if (!showChurchNudge) return;
    const timer = setTimeout(() => setShowChurchNudge(false), CHURCH_NUDGE_MS);
    return () => clearTimeout(timer);
  }, [showChurchNudge]);

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
  const { church: myChurch, loaded: churchLoaded, refresh: refreshChurch } = useMyChurch(uiReady);

  // Splash cover: 신규 유저(닉네임 없음)는 커버가 유지된 채 온보딩으로 넘어가
  // 지구본 깜빡임을 보지 않는다. uiReady 후 페이드아웃 → DOM 제거.
  const [splashGone, setSplashGone] = useState(false);
  useEffect(() => {
    if (!uiReady) return;
    const timeout = setTimeout(() => setSplashGone(true), 600);
    return () => clearTimeout(timeout);
  }, [uiReady]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-night">
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
          church={myChurch}
          onOpenChurch={() => setShowChurch(true)}
          onNicknameSaved={state.setNickname}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showChurch && (
        <ChurchView
          church={myChurch}
          onChurchChanged={refreshChurch}
          onClose={() => setShowChurch(false)}
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
          prayerId={completedPrayerId}
          onClose={closeCompleteModal}
          onFindChurch={() => {
            closeCompleteModal();
            openChurch();
          }}
        />
      )}

      {!splashGone && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center bg-night transition-opacity duration-500 ease-weighted ${
            uiReady ? 'opacity-0' : 'opacity-100'
          }`}
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
            nickname={state.nickname}
            showSpinButton={spinAvailable}
            onSpinClick={() => resumeSpinRef.current?.()}
            showChurchNudge={showChurchNudge}
            onChurchNudgeFind={openChurch}
            onChurchNudgeDismiss={() => setShowChurchNudge(false)}
          />
        </div>
      )}

      {/* 플로팅 탭바 — 기록/설정 패널(z-30) 위, 모달(z-50) 아래 */}
      {uiReady && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 mb-[env(safe-area-inset-bottom)] flex justify-center">
          <TabBar
            activeTab={showSettings ? 'settings' : showHistory ? 'history' : state.activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      )}
    </div>
  );
}
