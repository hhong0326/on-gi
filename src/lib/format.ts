const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface TimeLabels {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
}

export function formatRelativeTime(isoString: string, labels?: TimeLabels): string {
  const elapsed = Date.now() - new Date(isoString).getTime();

  if (!labels) {
    // Fallback to Korean (backwards compatible)
    if (elapsed < MINUTE) return '방금 전';
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
    return `${Math.floor(elapsed / DAY)}일 전`;
  }

  if (elapsed < MINUTE) return labels.justNow;
  if (elapsed < HOUR) return labels.minutesAgo.replace('{n}', String(Math.floor(elapsed / MINUTE)));
  if (elapsed < DAY) return labels.hoursAgo.replace('{n}', String(Math.floor(elapsed / HOUR)));
  return labels.daysAgo.replace('{n}', String(Math.floor(elapsed / DAY)));
}

export interface DurationUnits {
  seconds: string;
  minutes: string;
  hours: string;
}

// 기도 시간 표시 — "45초", "12분 30초", "3시간 5분" (단위 문자열은 history 네임스페이스에서 주입)
export function formatDuration(seconds: number, units: DurationUnits): string {
  if (seconds < 60) return `${seconds}${units.seconds}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}${units.minutes} ${s}${units.seconds}` : `${m}${units.minutes}`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}${units.hours} ${rm}${units.minutes}` : `${h}${units.hours}`;
}

// 한글 마지막 글자에 받침이 있으면 true — "민준은/은혜는", "2분이/9초가" 조사 선택용
export function hasBatchim(text: string): boolean {
  const code = text.trim().slice(-1).charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}
