'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchChurchMap, type ChurchMarker } from '@/lib/church';
import { createClient } from '@/lib/supabase/client';

// 지구본 교회 아이콘 목록 — 교회는 자주 바뀌지 않아 폴링하지 않고, 앱 로드와 내 교회 변경 때만 다시 읽는다
// 실패하면 이전 목록 유지 — 교회 아이콘은 기도 흐름을 막지 않는다
export function useChurchMap(enabled: boolean) {
  const [churches, setChurches] = useState<ChurchMarker[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchChurchMap(createClient())
      .then((next) => { if (!cancelled) setChurches(next); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [enabled]);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchChurchMap(createClient());
      setChurches(next);
    } catch {
      // 이전 목록 유지
    }
  }, []);

  return { churches, refresh };
}
