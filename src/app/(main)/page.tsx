'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
import { PrayerOverlay } from '@/components/ui/PrayerOverlay';
import { HistoryView } from '@/components/ui/HistoryView';
import { PrayerCompleteModal } from '@/components/ui/PrayerCompleteModal';
import type { MapboxStyle, FogPreset } from '@/components/mapbox/MapboxView';

const MapboxView = dynamic(
  () => import('@/components/mapbox/MapboxView').then((m) => m.MapboxView),
  { ssr: false }
);

const MAP_STYLES: { key: MapboxStyle; label: string }[] = [
  { key: 'dark', label: '다크' },
  { key: 'light', label: '라이트' },
  { key: 'satellite', label: '위성' },
  { key: 'satellite-streets', label: '위성+도로' },
  { key: 'streets', label: '스트릿' },
  { key: 'outdoors', label: '아웃도어' },
];

const FOG_PRESETS: { key: FogPreset; label: string }[] = [
  { key: 'dark', label: '다크' },
  { key: 'warm', label: '웜' },
  { key: 'blue', label: '블루' },
];

export default function MainPage() {
  const state = usePrayerState('home');
  const [mapStyle, setMapStyle] = useState<MapboxStyle>('dark');
  const [fogPreset, setFogPreset] = useState<FogPreset>('dark');
  const [hideLabels, setHideLabels] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [completedDuration, setCompletedDuration] = useState<number | null>(null);

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
      // Capture elapsed before state resets
      const elapsed = state.elapsedSeconds;
      await state.handleTogglePrayer();
      if (elapsed > 0) setCompletedDuration(elapsed);
      return;
    }
    await state.handleTogglePrayer();
  };

  if (!state.ready) return null;

  if (!state.nickname) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6" style={{ background: '#08080F' }}>
        <p className="text-center text-sm text-white/40">초대 링크를 통해 입장해주세요</p>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: '#08080F' }}>
      <div className="absolute inset-0">
        <MapboxView
          points={state.points}
          mapStyle={mapStyle}
          fogPreset={fogPreset}
          hideLabels={hideLabels}
        />
      </div>

      {showSettings && (
        <div className="absolute bottom-28 left-1/2 z-30 w-80 -translate-x-1/2 rounded-2xl bg-black/80 p-4 backdrop-blur-md">
          <p className="mb-3 text-xs font-medium text-white/70">🗺️ 맵 스타일</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {MAP_STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setMapStyle(s.key)}
                className={`rounded-full px-3 py-1 text-xs ${
                  mapStyle === s.key ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <p className="mb-3 text-xs font-medium text-white/70">🌌 대기 효과</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {FOG_PRESETS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFogPreset(f.key)}
                className={`rounded-full px-3 py-1 text-xs ${
                  fogPreset === f.key ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-white/70">🏷️ 라벨 숨기기</span>
            <button
              onClick={() => setHideLabels((v) => !v)}
              className={`rounded-full px-3 py-1 text-xs ${
                hideLabels ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              {hideLabels ? 'ON' : 'OFF'}
            </button>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="w-full rounded-lg bg-white/10 py-2 text-xs text-white/60"
          >
            닫기
          </button>
        </div>
      )}

      {showHistory && (
        <HistoryView onClose={() => setShowHistory(false)} />
      )}

      {completedDuration !== null && (
        <PrayerCompleteModal
          durationSeconds={completedDuration}
          onClose={() => setCompletedDuration(null)}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <PrayerOverlay
          prayerCount={state.points.filter((p) => p.isActive).length}
          isPraying={state.isPraying}
          elapsedSeconds={state.elapsedSeconds}
          onTogglePrayer={handleTogglePrayer}
          activeTab={showHistory ? 'history' : state.activeTab}
          onTabChange={handleTabChange}
        />
      </div>
      <div className="absolute right-4 top-14 z-20">
        <span className="text-xs text-white/50">{state.nickname}님</span>
      </div>
    </div>
  );
}
