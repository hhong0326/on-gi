'use client';

import { useEffect } from 'react';

interface PrayerCompleteModalProps {
  durationSeconds: number;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}시간 ${rm}분` : `${h}시간`;
}

export function PrayerCompleteModal({ durationSeconds, onClose }: PrayerCompleteModalProps) {
  // Auto-close after 3 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-8 w-full max-w-sm rounded-2xl bg-[#12121F] p-8 text-center shadow-2xl">
        <p className="text-4xl">🙏</p>
        <p className="mt-4 text-lg font-medium text-white">
          {formatDuration(durationSeconds)}간 기도했습니다
        </p>
        <p className="mt-2 text-sm text-white/40">
          당신의 기도가 세상을 밝힙니다
        </p>
        <div className="mt-6">
          <button
            onClick={onClose}
            className="rounded-full bg-amber-500/20 px-6 py-2 text-sm text-amber-300"
          >
            아멘
          </button>
        </div>
      </div>
    </div>
  );
}
