'use client';

import type { ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpenText, GearSix, GlobeHemisphereEast, type IconProps } from '@phosphor-icons/react';
import type { ViewTab } from '@/hooks/usePrayerState';

const TABS: { key: ViewTab; Icon: ComponentType<IconProps> }[] = [
  { key: 'home', Icon: GlobeHemisphereEast },
  { key: 'history', Icon: BookOpenText },
  { key: 'settings', Icon: GearSix },
];

interface TabBarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}

// 화면 하단에서 떠 있는 pill 탭바. 기록/설정 패널(z-30) 위에 렌더되도록 부모가 z-40으로 배치한다.
export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tt = useTranslations('tab');

  return (
    <nav className="pointer-events-auto flex gap-2 rounded-full border border-gold/15 bg-night/70 p-2 backdrop-blur-xl">
      {TABS.map(({ key, Icon }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            aria-label={tt(key)}
            aria-current={active ? 'page' : undefined}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300 ease-weighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 active:scale-95 ${
              active ? 'bg-gold/15 text-gold' : 'text-ivory/45 hover:text-ivory/70'
            }`}
          >
            <Icon size={24} weight={active ? 'fill' : 'regular'} />
          </button>
        );
      })}
    </nav>
  );
}
