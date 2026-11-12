'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchMyChurch, type MyChurch } from '@/lib/church';
import { createClient } from '@/lib/supabase/client';

// 내 교회 현황 — 설정 카드, 기도 시작 안내, 교회 화면이 함께 쓴다
export function useMyChurch(enabled: boolean) {
  const [church, setChurch] = useState<MyChurch | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchMyChurch(createClient());
      setChurch(next);
    } catch {
      // 실패 시 이전 값 유지 — 교회 기능은 기도 흐름을 막지 않는다
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { church, loaded, refresh };
}
