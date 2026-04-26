export interface PrayerPoint {
  id: string;
  lat: number;
  lng: number;
  intensity: number;
  isUser: boolean;
  isActive: boolean; // true: 기도 중, false: 잔상 (7일 후 사라짐)
}

export interface PrayerRow {
  id: string;
  user_id: string;
  church_id: string | null;
  lat: number;
  lng: number;
  prayed_at: string;
  duration_seconds: number | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function calculateIntensity(prayedAt: string): number {
  const elapsed = Date.now() - new Date(prayedAt).getTime();
  return Math.max(0.1, 1 - elapsed / SEVEN_DAYS_MS);
}

export function prayerRowToPoint(row: PrayerRow, currentUserId: string | null): PrayerPoint {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    intensity: calculateIntensity(row.prayed_at),
    isUser: row.user_id === currentUserId,
    isActive: row.duration_seconds === null, // null = 아직 기도 중
  };
}
