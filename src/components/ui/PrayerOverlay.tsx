'use client';

import Image from 'next/image';
import type { ViewTab } from '@/hooks/usePrayerState';

interface PrayerOverlayProps {
  prayerCount: number;
  isPraying: boolean;
  elapsedSeconds: number;
  onTogglePrayer: () => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const TABS: { key: ViewTab; icon: string; label: string }[] = [
  { key: 'home', icon: '🌍', label: '기도 지구본' },
  { key: 'history', icon: '📖', label: '기도 기록' },
  { key: 'settings', icon: '⚙️', label: '설정' },
];

export function PrayerOverlay({
  prayerCount,
  isPraying,
  elapsedSeconds,
  onTogglePrayer,
  activeTab,
  onTabChange,
}: PrayerOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col">
      {/* Header */}
      <header className="pointer-events-auto flex items-center justify-between px-5 pt-14 pb-4">
        <div style={{ filter: 'drop-shadow(0 0 8px rgba(212, 164, 76, 0.3))' }}>
          <Image src="/logo-en-sm.svg" alt="ON-GI" width={57} height={20} />
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <span className="text-sm text-gray-400">{prayerCount}</span>
        </div>
      </header>

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA Button */}
      <div className="pointer-events-auto flex justify-center px-5 pb-6">
        <button
          onClick={onTogglePrayer}
          className={`rounded-full px-8 py-3.5 text-base font-medium transition-all ${
            isPraying
              ? 'bg-amber-500/90 text-white shadow-lg shadow-amber-500/30'
              : 'border border-gray-500/50 bg-white/5 text-gray-300 backdrop-blur-sm hover:border-gray-400 hover:text-white'
          }`}
        >
          {isPraying ? `기도 마치기 ${formatTime(elapsedSeconds)}` : '지금 함께 기도하기'}
        </button>
      </div>

      {/* Tab Bar */}
      <nav className="pointer-events-auto flex justify-evenly border-t border-white/10 bg-[#08080F]/90 px-4 pb-8 pt-3 backdrop-blur-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center justify-center w-12 h-12 rounded-full text-xl transition-all ${
              activeTab === tab.key
                ? 'text-white bg-white/10'
                : 'text-gray-500'
            }`}
            aria-label={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </nav>
    </div>
  );
}
