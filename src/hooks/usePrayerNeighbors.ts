'use client';

import { useEffect, useState } from 'react';

import { fetchPrayerNeighbors } from '@/lib/church';
import { createClient } from '@/lib/supabase/client';

type Neighbor = { id: string; lat: number; lng: number };
const NONE: Neighbor[] = [];

// 지금 켜진 내 기도가 온기를 나눌 이웃 교회 (0017). 기도가 바뀔 때만 한 번 읽는다.
// 실패하면 빛만 생략 — 기도 흐름을 막지 않는다
export function usePrayerNeighbors(prayerId: string | null) {
  const [result, setResult] = useState<{ prayerId: string; neighbors: Neighbor[] } | null>(null);

  useEffect(() => {
    if (!prayerId) return;
    let cancelled = false;
    fetchPrayerNeighbors(createClient(), prayerId)
      .then((neighbors) => { if (!cancelled) setResult({ prayerId, neighbors }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [prayerId]);

  // 다른(이전) 기도의 결과는 쓰지 않는다
  return prayerId && result?.prayerId === prayerId ? result.neighbors : NONE;
}
