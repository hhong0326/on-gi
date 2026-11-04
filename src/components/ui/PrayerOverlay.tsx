'use client';

import { useState } from 'react';
import Image from 'next/image';
import {useTranslations} from 'next-intl';
import { ArrowsClockwise, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { appConfig } from '@/lib/app-config';
import { getPrayerAudio } from '@/lib/audio';

interface PrayerOverlayProps {
  prayerCount: number;
  isPraying: boolean;
  elapsedSeconds: number;
  onTogglePrayer: () => void;
  nickname?: string | null;
  showSpinButton?: boolean;
  onSpinClick?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const ICON_BUTTON =
  'absolute right-6 flex h-12 w-12 items-center justify-center rounded-full text-ivory/70 transition-[color,transform] duration-300 ease-weighted hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 active:scale-95';

export function PrayerOverlay({
  prayerCount,
  isPraying,
  elapsedSeconds,
  onTogglePrayer,
  nickname,
  showSpinButton = false,
  onSpinClick,
}: PrayerOverlayProps) {
  const t = useTranslations('prayer');
  const tc = useTranslations('common');
  const [audioMuted, setAudioMuted] = useState(() =>
    typeof window === 'undefined' ? false : getPrayerAudio().isMuted()
  );

  const handleToggleMute = () => {
    const next = !audioMuted;
    getPrayerAudio().setMuted(next);
    setAudioMuted(next);
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col">
      {/* Header */}
      <header className="pointer-events-auto flex items-center justify-between px-6 pt-16 pb-4">
        <div className="drop-shadow-glow-sm">
          <Image src="/logo-en-sm.svg" alt="ON-GI" width={57} height={20} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
            </span>
            <span className="font-mono text-xs text-ivory/70">{prayerCount}</span>
          </div>
          {nickname && (
            <span className="text-xs text-ivory/45">{nickname}{tc('nicknameSuffix')}</span>
          )}
        </div>
      </header>

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA Button — pb-24: 하단 플로팅 탭바(bottom-4 + 높이 64px) 위로 16px 간격 */}
      <div className="pointer-events-auto relative mb-[env(safe-area-inset-bottom)] flex items-center justify-center px-6 pb-24">
        <button
          onClick={onTogglePrayer}
          className={`h-12 rounded-full px-8 text-base font-semibold transition-[background-color,border-color,color,transform] duration-300 ease-weighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 active:scale-[0.98] ${
            isPraying
              ? 'bg-gold text-night'
              : 'border border-gold/30 bg-night/60 text-gold-light backdrop-blur-md hover:border-gold/60 hover:bg-gold/10'
          }`}
        >
          {isPraying ? t('stop', {time: formatTime(elapsedSeconds)}) : t('start')}
        </button>

        {/* Audio mute toggle (praying only, audio feature enabled) */}
        {isPraying && appConfig.features.audio && (
          <button
            onClick={handleToggleMute}
            className={ICON_BUTTON}
            aria-label={audioMuted ? t('soundOn') : t('soundOff')}
          >
            {audioMuted ? <SpeakerSlash size={24} /> : <SpeakerHigh size={24} />}
          </button>
        )}

        {/* Spin resume button */}
        {showSpinButton && !isPraying && (
          <button
            onClick={onSpinClick}
            className={ICON_BUTTON}
            aria-label="resume globe spin"
          >
            <ArrowsClockwise size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
