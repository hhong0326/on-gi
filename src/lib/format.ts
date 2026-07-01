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
