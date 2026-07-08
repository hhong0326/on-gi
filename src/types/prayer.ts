export interface PrayerPoint {
  id: string;
  lat: number;
  lng: number;
  intensity: number;
  isUser: boolean;
  isActive: boolean; // true: 기도 중, false: 잔상 (7일 후 사라짐)
  prayedAt: string;
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
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export function calculateIntensity(prayedAt: string): number {
  const elapsed = Date.now() - new Date(prayedAt).getTime();
  return Math.max(0.1, 1 - elapsed / SEVEN_DAYS_MS);
}

// 격자 스냅 패턴 완화: id 기반 결정적 오프셋 (±0.04도 ≈ ±4km)
// DB 좌표는 10km 격자 그대로 — 렌더링 위치만 흩뿌림 (프라이버시 동일)
export function hashJitter(id: string): { dLat: number; dLng: number } {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < id.length; i++) {
    h1 = (h1 * 31 + id.charCodeAt(i)) >>> 0;
    h2 = (h2 * 37 + id.charCodeAt(i)) >>> 0;
  }
  return {
    dLat: ((h1 % 1000) / 1000 - 0.5) * 0.08,
    dLng: ((h2 % 1000) / 1000 - 0.5) * 0.08,
  };
}

export function prayerRowToPoint(row: PrayerRow, currentUserId: string | null): PrayerPoint {
  const { dLat, dLng } = hashJitter(row.id);
  return {
    id: row.id,
    lat: row.lat + dLat,
    lng: row.lng + dLng,
    intensity: calculateIntensity(row.prayed_at),
    isUser: row.user_id === currentUserId,
    // null = 기도 중이지만, 30분 초과하면 자동 비활성 (미종료 방치 방지)
    isActive: row.duration_seconds === null &&
      (Date.now() - new Date(row.prayed_at).getTime()) < THIRTY_MINUTES_MS,
    prayedAt: row.prayed_at,
  };
}
