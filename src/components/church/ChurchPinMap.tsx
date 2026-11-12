'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { applyToneOnTone } from '@/lib/map-tone';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface ChurchPinMapProps {
  center: { lat: number; lng: number };
  // 지도 중앙(핀 위치) 좌표를 부모가 제출 시점에 읽는다 — 이동 중 React 상태 갱신 없음
  centerRef: React.RefObject<{ lat: number; lng: number } | null>;
}

// 교회 세우기용 작은 지도. 핀은 화면 중앙에 고정되고 지도를 움직여 위치를 맞춘다
export function ChurchPinMap({ center, centerRef }: ChurchPinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [center.lng, center.lat],
      zoom: 14,
      attributionControl: false,
    });
    centerRef.current = center;

    map.on('style.load', () => applyToneOnTone(map));
    map.on('moveend', () => {
      const c = map.getCenter();
      centerRef.current = { lat: c.lat, lng: c.lng };
    });

    return () => map.remove();
    // 최초 중심만 사용 — 이후 위치는 사용자가 지도를 움직여 정한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-56 overflow-hidden rounded-2xl border border-gold/15">
      {/* mapbox-gl.css가 position: relative를 강제하므로 absolute 대신 크기를 직접 지정 */}
      <div ref={containerRef} className="h-full w-full" />
      {/* 중앙 고정 핀 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="h-5 w-5 -rotate-45 rounded-full rounded-bl-none bg-gold drop-shadow-glow" />
      </div>
    </div>
  );
}
