import type { createClient } from '@/lib/supabase/client';

// 배포 없이 튜닝 가능한 앱 시스템 값 (DB app_config 테이블이 override, 코드 기본값이 fallback).
// 잘못된 DB 값이 들어와도 앱이 깨지지 않도록 필드 단위로 검증 후 병합한다.
export interface ResidualPalette {
  bloom: string;
  glow: string;
  shadow: string;
}

export interface AppConfig {
  residualColors: {
    mine: ResidualPalette;
    others: ResidualPalette;
  };
  decay: {
    days: number;
    minIntensity: number;
  };
  features: {
    audio: boolean;
  };
}

const DEFAULTS: AppConfig = {
  residualColors: {
    mine: { bloom: '#E8632F', glow: '#FFA274', shadow: '#F0703E' },
    others: { bloom: '#AA8833', glow: '#BB9944', shadow: '#AA8833' },
  },
  decay: { days: 7, minIntensity: 0.1 },
  features: { audio: false },
};

// 모듈 싱글턴 — prayer-light 등 렌더러가 동기적으로 읽는다.
// loadAppConfig 완료 전에는 기본값(현재 프로덕션 값과 동일)으로 동작.
export const appConfig: AppConfig = {
  residualColors: {
    mine: { ...DEFAULTS.residualColors.mine },
    others: { ...DEFAULTS.residualColors.others },
  },
  decay: { ...DEFAULTS.decay },
  features: { ...DEFAULTS.features },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function asPalette(v: unknown): ResidualPalette | null {
  if (typeof v !== 'object' || v === null) return null;
  const p = v as Record<string, unknown>;
  if ([p.bloom, p.glow, p.shadow].every((c) => typeof c === 'string' && HEX.test(c))) {
    return { bloom: p.bloom as string, glow: p.glow as string, shadow: p.shadow as string };
  }
  return null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export async function loadAppConfig(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { data, error } = await supabase.from('app_config').select('key, value');
  if (error || !data) return; // 실패 시 기본값 유지

  for (const row of data) {
    const v = row.value as Record<string, unknown> | null;
    if (!v || typeof v !== 'object') continue;

    if (row.key === 'residual_colors') {
      const mine = asPalette(v.mine);
      const others = asPalette(v.others);
      if (mine) appConfig.residualColors.mine = mine;
      if (others) appConfig.residualColors.others = others;
    } else if (row.key === 'decay') {
      if (isFiniteNumber(v.days) && v.days > 0) appConfig.decay.days = v.days;
      if (isFiniteNumber(v.minIntensity) && v.minIntensity >= 0 && v.minIntensity <= 1) {
        appConfig.decay.minIntensity = v.minIntensity;
      }
    } else if (row.key === 'features') {
      if (typeof v.audio === 'boolean') appConfig.features.audio = v.audio;
    }
  }
}
