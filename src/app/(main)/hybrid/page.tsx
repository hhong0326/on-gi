'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
import { PrayerOverlay } from '@/components/globe/PrayerOverlay';
import type { GlobeTheme } from '@/components/globe/GlobeView';
import type { MapTheme } from '@/components/map/MapView';

const GlobeView = dynamic(
  () => import('@/components/globe/GlobeView').then((m) => m.GlobeView),
  { ssr: false }
);

const MapView = dynamic(
  () => import('@/components/map/MapView').then((m) => m.MapView),
  { ssr: false }
);

const TRANSITION_TO_MAP_THRESHOLD = 0.85;
const TRANSITION_TO_GLOBE_THRESHOLD = 4;

const GLOBE_THEMES: { key: GlobeTheme; label: string }[] = [
  { key: 'aubergine', label: '오버진' },
  { key: 'dark', label: '다크' },
  { key: 'night', label: '나이트' },
  { key: 'blue-marble', label: '블루마블' },
  { key: 'topology', label: '토폴로지' },
];

const MAP_THEMES: { key: MapTheme; label: string }[] = [
  { key: 'retro', label: '레트로' },
  { key: 'dark', label: '다크' },
  { key: 'night', label: '나이트' },
  { key: 'aubergine', label: '오버진' },
  { key: 'silver', label: '실버' },
];

export default function HybridPage() {
  const router = useRouter();
  const state = usePrayerState('hybrid');
  const [viewMode, setViewMode] = useState<'globe' | 'map'>('globe');
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.978 });
  const [mapZoom, setMapZoom] = useState(8);
  const [showMap, setShowMap] = useState(false);
  const [globeTheme, setGlobeTheme] = useState<GlobeTheme>('aubergine');
  const [mapTheme, setMapTheme] = useState<MapTheme>('retro');
  const [showThemePanel, setShowThemePanel] = useState(false);

  const handleGlobeZoom = useCallback((zoomLevel: number, center: { lat: number; lng: number }, visibleDegrees: number) => {
    if (zoomLevel >= TRANSITION_TO_MAP_THRESHOLD && viewModeRef.current === 'globe') {
      setMapCenter(center);
      const mapZ = Math.round(Math.log2(360 / Math.max(visibleDegrees, 1)));
      setMapZoom(Math.max(3, Math.min(mapZ, 18)));
      setShowMap(true);
      setViewMode('map');
    }
  }, []);

  const handleMapZoom = useCallback((zoom: number) => {
    if (zoom <= TRANSITION_TO_GLOBE_THRESHOLD && viewModeRef.current === 'map') {
      setViewMode('globe');
    }
  }, []);

  const handleTabChange = (tab: ViewTab) => {
    if (tab === 'globe') {
      router.push('/');
    } else if (tab === 'map') {
      router.push('/map');
    } else if (tab === 'settings') {
      setShowThemePanel((v) => !v);
    } else {
      state.setActiveTab(tab);
    }
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
      {/* Crossfade transition */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: viewMode === 'globe' ? 1 : 0,
          pointerEvents: viewMode === 'globe' ? 'auto' : 'none',
          zIndex: 1,
        }}
      >
        <GlobeView points={state.points} theme={globeTheme} onZoomChange={handleGlobeZoom} />
      </div>
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: viewMode === 'map' ? 1 : 0,
          pointerEvents: viewMode === 'map' ? 'auto' : 'none',
          zIndex: 0,
        }}
      >
        {showMap && (
          <MapView
            points={state.points}
            theme={mapTheme}
            center={mapCenter}
            zoom={mapZoom}
            onZoomChange={handleMapZoom}
          />
        )}
      </div>

      {/* View mode indicator */}
      <div className="absolute left-1/2 top-24 z-10 -translate-x-1/2">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60 backdrop-blur-sm">
          {viewMode === 'globe' ? '🌍 3D 지구본' : '🗺️ 위성 지도'}
        </span>
      </div>

      {/* Theme selector panel */}
      {showThemePanel && (
        <div className="absolute bottom-28 left-1/2 z-30 w-72 -translate-x-1/2 rounded-2xl bg-black/80 p-4 backdrop-blur-md">
          <p className="mb-3 text-xs font-medium text-white/70">🌍 지구본 테마</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {GLOBE_THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setGlobeTheme(t.key)}
                className={`rounded-full px-3 py-1 text-xs ${
                  globeTheme === t.key ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mb-3 text-xs font-medium text-white/70">🗺️ 지도 테마</p>
          <div className="flex flex-wrap gap-2">
            {MAP_THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setMapTheme(t.key)}
                className={`rounded-full px-3 py-1 text-xs ${
                  mapTheme === t.key ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowThemePanel(false)}
            className="mt-3 w-full rounded-lg bg-white/10 py-2 text-xs text-white/60"
          >
            닫기
          </button>
        </div>
      )}

      <div className="absolute inset-0 z-10">
        <PrayerOverlay
          prayerCount={state.points.length}
          isPraying={state.isPraying}
          elapsedSeconds={state.elapsedSeconds}
          onTogglePrayer={state.handleTogglePrayer}
          activeTab={state.activeTab}
          onTabChange={handleTabChange}
        />
      </div>
      <div className="absolute right-4 top-14 z-20">
        <span className="text-xs text-white/50">{state.nickname}님</span>
      </div>
    </div>
  );
}
