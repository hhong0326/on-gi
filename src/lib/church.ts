import type { createClient } from '@/lib/supabase/client';

// 우리 교회 세우기 — DB RPC 래퍼와 표시용 헬퍼.
// 단계 기준 시간(app_config.church_levels)과 이웃 나눔 계산은 서버에서만 한다.
// 다른 교회의 누적 시간은 서버가 돌려주지 않는다 (순위/경쟁 방지) — level만 받는다.

type SupabaseClient = ReturnType<typeof createClient>;

export const CHURCH_LEVEL_COUNT = 8;

export interface ChurchSummary {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number | null;
  level: number;
}

export interface MyChurch {
  id: string;
  name: string;
  lat: number;
  lng: number;
  inviteCode: string;
  level: number;
  maxLevel: number;
  totalSeconds: number;
  warmthSeconds: number;
  levelStartSeconds: number;
  nextLevelSeconds: number | null;
  membersThisWeek: number;
}

export interface PrayerContribution {
  neighborCount: number;
  church: MyChurch | null;
}

interface MyChurchRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  invite_code: string;
  level: number;
  max_level: number;
  total_seconds: number;
  warmth_seconds: number;
  level_start_seconds: number;
  next_level_seconds: number | null;
  members_this_week: number;
}

function toMyChurch(row: MyChurchRow | null): MyChurch | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    inviteCode: row.invite_code,
    level: row.level,
    maxLevel: row.max_level,
    totalSeconds: row.total_seconds,
    warmthSeconds: row.warmth_seconds,
    levelStartSeconds: row.level_start_seconds,
    nextLevelSeconds: row.next_level_seconds,
    membersThisWeek: row.members_this_week,
  };
}

// 단계 일러스트 — 디자이너가 public/churches/lv{n}.svg 파일만 교체하면 앱 전체에 반영된다
export function churchArtSrc(level: number): string {
  const clamped = Math.min(Math.max(Math.round(level), 1), CHURCH_LEVEL_COUNT);
  return `/churches/lv${clamped}.svg`;
}

// 현재 단계 안에서의 진행률 (0~1). 마지막 단계면 1
export function levelProgress(church: MyChurch): number {
  if (church.nextLevelSeconds === null) return 1;
  const span = church.nextLevelSeconds - church.levelStartSeconds;
  if (span <= 0) return 1;
  return Math.min(Math.max((church.totalSeconds - church.levelStartSeconds) / span, 0), 1);
}

export async function fetchMyChurch(supabase: SupabaseClient): Promise<MyChurch | null> {
  const { data, error } = await supabase.rpc('get_my_church');
  if (error) throw error;
  return toMyChurch(data as unknown as MyChurchRow | null);
}

export async function searchChurches(
  supabase: SupabaseClient,
  query: string,
  position: { lat: number; lng: number } | null,
): Promise<ChurchSummary[]> {
  const { data, error } = await supabase.rpc('search_churches', {
    p_query: query,
    p_lat: position?.lat,
    p_lng: position?.lng,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    distanceKm: row.distance_km,
    level: row.level,
  }));
}

export async function findSimilarChurches(
  supabase: SupabaseClient,
  name: string,
  position: { lat: number; lng: number },
): Promise<{ id: string; name: string; distanceKm: number }[]> {
  const { data, error } = await supabase.rpc('find_similar_churches', {
    p_name: name,
    p_lat: position.lat,
    p_lng: position.lng,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, distanceKm: row.distance_km }));
}

export type CreateChurchError = 'daily_limit' | 'failed';

export async function createChurch(
  supabase: SupabaseClient,
  name: string,
  position: { lat: number; lng: number },
): Promise<{ id: string } | { error: CreateChurchError }> {
  const { data, error } = await supabase.rpc('create_church', {
    p_name: name,
    p_lat: position.lat,
    p_lng: position.lng,
  });
  if (error) {
    return { error: error.message.includes('daily church limit') ? 'daily_limit' : 'failed' };
  }
  return { id: data };
}

export async function setMyChurch(supabase: SupabaseClient, churchId: string): Promise<void> {
  const { error } = await supabase.rpc('set_my_church', { p_church_id: churchId });
  if (error) throw error;
}

export async function fetchPrayerContribution(
  supabase: SupabaseClient,
  prayerId: string,
): Promise<PrayerContribution | null> {
  const { data, error } = await supabase.rpc('get_prayer_contribution', { p_prayer_id: prayerId });
  if (error || !data) return null;
  const row = data as unknown as { neighbor_count: number; church: MyChurchRow | null };
  return { neighborCount: row.neighbor_count, church: toMyChurch(row.church) };
}

// 1km 미만은 10m 단위 m, 10km 미만은 소수 1자리 km — 문구는 church.km / church.m 메시지로 감싼다
export function distanceParts(km: number): { unit: 'km' | 'm'; n: string } {
  if (km < 1) return { unit: 'm', n: String(Math.max(Math.round((km * 1000) / 10) * 10, 10)) };
  return { unit: 'km', n: km < 10 ? km.toFixed(1) : String(Math.round(km)) };
}
