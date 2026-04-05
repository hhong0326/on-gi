'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
import { PrayerOverlay } from '@/components/globe/PrayerOverlay';

const GlobeView = dynamic(
  () => import('@/components/globe/GlobeView').then((m) => m.GlobeView),
  { ssr: false }
);

export default function GlobePage() {
  const router = useRouter();
  const state = usePrayerState('globe');

  const handleTabChange = (tab: ViewTab) => {
    if (tab === 'map') router.push('/map');
    else if (tab === 'hybrid') router.push('/hybrid');
    else if (tab === 'mapbox') router.push('/mapbox');
    else state.setActiveTab(tab);
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
        <GlobeView points={state.points} />
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
