'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
import { PrayerOverlay } from '@/components/globe/PrayerOverlay';

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

export default function HybridPage() {
  const router = useRouter();
  const state = usePrayerState('hybrid');
  const [viewMode, setViewMode] = useState<'globe' | 'map'>('globe');
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.978 });
  const [mapZoom, setMapZoom] = useState(8);
  const [showMap, setShowMap] = useState(false);

  const handleGlobeZoom = useCallback((zoomLevel: number, center: { lat: number; lng: number }, visibleDegrees: number) => {
    if (zoomLevel >= TRANSITION_TO_MAP_THRESHOLD && viewMode === 'globe') {
      setMapCenter(center);
      // Match visible area: zoom = log2(360 / visibleDegrees)
      const mapZ = Math.round(Math.log2(360 / Math.max(visibleDegrees, 1)));
      setMapZoom(Math.max(3, Math.min(mapZ, 18)));
      setShowMap(true);
      setViewMode('map');
    }
  }, [viewMode]);

  const handleMapZoom = useCallback((zoom: number) => {
    if (zoom <= TRANSITION_TO_GLOBE_THRESHOLD && viewMode === 'map') {
      setViewMode('globe');
    }
  }, [viewMode]);

  const handleTabChange = (tab: ViewTab) => {
    if (tab === 'globe') {
      router.push('/');
    } else if (tab === 'map') {
      router.push('/map');
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
      {/* Both mounted, visibility toggle — preserves WebGL context */}
      <div
        className="absolute inset-0"
        style={{
          visibility: viewMode === 'globe' ? 'visible' : 'hidden',
          zIndex: viewMode === 'globe' ? 1 : 0,
        }}
      >
        <GlobeView points={state.points} onZoomChange={handleGlobeZoom} />
      </div>
      <div
        className="absolute inset-0"
        style={{
          visibility: viewMode === 'map' ? 'visible' : 'hidden',
          zIndex: viewMode === 'map' ? 1 : 0,
        }}
      >
        {showMap && (
          <MapView
            points={state.points}
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

      <PrayerOverlay
        prayerCount={state.points.length}
        isPraying={state.isPraying}
        elapsedSeconds={state.elapsedSeconds}
        onTogglePrayer={state.handleTogglePrayer}
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
      />
      <div className="absolute right-4 top-14 z-10">
        <span className="text-xs text-white/50">{state.nickname}님</span>
      </div>
    </div>
  );
}
