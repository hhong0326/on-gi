'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
import { PrayerOverlay } from '@/components/globe/PrayerOverlay';

const MapboxView = dynamic(
  () => import('@/components/mapbox/MapboxView').then((m) => m.MapboxView),
  { ssr: false }
);

export default function MapboxPage() {
  const router = useRouter();
  const state = usePrayerState('mapbox');

  const handleTabChange = (tab: ViewTab) => {
    if (tab === 'globe') {
      router.push('/');
    } else if (tab === 'map') {
      router.push('/map');
    } else if (tab === 'hybrid') {
      router.push('/hybrid');
    } else if (tab === 'mapbox') {
      // already here
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
      <div className="absolute inset-0">
        <MapboxView points={state.points} />
      </div>
      <div className="pointer-events-none absolute inset-0 z-10">
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
