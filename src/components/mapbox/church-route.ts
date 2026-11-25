import type mapboxgl from 'mapbox-gl';

// 기도 중 내 불빛 → 교회로 가는 빛 (교회에 빛 보내기 2·3단계).
// 대권(지구 위 최단) 곡선을 희미한 길 + 그 위를 흘러가는 빛 한 줄기로 그린다.
// 'church'는 내 교회로 가는 또렷한 빛 한 줄(0016), 'neighbors'는 온기를 나누는 이웃 교회로 가는 희미한 빛(0017).
// 출발점은 화면 위 내 불빛(0.1도 격자 + 지터)이라 실제 GPS가 드러나지 않는다 (0004).

const SEGMENTS = 96;
const GOLD_LIGHT = 'rgba(245, 217, 138, 1)';
const CLEAR = 'rgba(245, 217, 138, 0)';

export type RouteKind = 'church' | 'neighbors';

const STYLE = {
  church: {
    prefix: 'ongi-church-route',
    base: 'rgba(212, 164, 76, 0.35)',
    baseWidth: [1, 2],
    glowWidth: [2.5, 4],
    glowOpacity: 0.9,
    pulseMs: 2800, // 빛 한 줄기가 교회까지 가는 시간
    tail: 0.18, // 빛 꼬리 길이 (경로 비율)
  },
  neighbors: {
    prefix: 'ongi-neighbor-route',
    base: 'rgba(212, 164, 76, 0.28)',
    baseWidth: [1, 1.5],
    glowWidth: [2, 3],
    glowOpacity: 0.6,
    pulseMs: 3600,
    tail: 0.25,
  },
} as const;

type LngLat = { lat: number; lng: number };

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

// 두 점 사이 대권을 구면 선형 보간으로 나눈다. 경도는 이어지게 펴서(unwrap) 날짜변경선에서 끊기지 않게
export function greatCircle(from: LngLat, to: LngLat, segments = SEGMENTS): [number, number][] {
  const φ1 = toRad(from.lat), λ1 = toRad(from.lng);
  const φ2 = toRad(to.lat), λ2 = toRad(to.lng);
  const a = [Math.cos(φ1) * Math.cos(λ1), Math.cos(φ1) * Math.sin(λ1), Math.sin(φ1)];
  const b = [Math.cos(φ2) * Math.cos(λ2), Math.cos(φ2) * Math.sin(λ2), Math.sin(φ2)];
  const dot = Math.min(Math.max(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1), 1);
  const ω = Math.acos(dot);
  if (ω < 1e-9) return [[from.lng, from.lat], [to.lng, to.lat]];

  const coords: [number, number][] = [];
  let prevLng = from.lng;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const s1 = Math.sin((1 - t) * ω) / Math.sin(ω);
    const s2 = Math.sin(t * ω) / Math.sin(ω);
    const x = s1 * a[0] + s2 * b[0];
    const y = s1 * a[1] + s2 * b[1];
    const z = s1 * a[2] + s2 * b[2];
    let lng = toDeg(Math.atan2(y, x));
    const lat = toDeg(Math.atan2(z, Math.hypot(x, y)));
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    prevLng = lng;
    coords.push([lng, lat]);
  }
  return coords;
}

// 진행률 p(0~1)에 머리가 있는 빛 줄기 그라디언트. 정지 값은 항상 오름차순이어야 한다
function pulseGradient(p: number, tailLength: number): mapboxgl.ExpressionSpecification {
  const head = Math.min(Math.max(p, 0.001), 0.999);
  const tail = Math.max(head - tailLength, 0);
  const stops: (number | string)[] = [];
  if (tail > 0) stops.push(0, CLEAR);
  stops.push(tail, CLEAR, head, GOLD_LIGHT, Math.min(head + 0.0005, 1), CLEAR);
  if (head + 0.0005 < 1) stops.push(1, CLEAR);
  return ['interpolate', ['linear'], ['line-progress'], ...stops] as mapboxgl.ExpressionSpecification;
}

export interface ChurchRoute {
  /** 출발점에서 각 목적지로 가는 경로를 보여준다 (이미 있으면 좌표만 바꾼다) */
  show: (from: LngLat, to: LngLat[]) => void;
  hide: () => void;
  /** 스타일이 바뀌면 레이어가 사라지므로 style.load 뒤에 현재 경로를 다시 그린다 */
  restore: () => void;
}

export function createChurchRoute(map: mapboxgl.Map, kind: RouteKind = 'church'): ChurchRoute {
  const style = STYLE[kind];
  const SOURCE_ID = style.prefix;
  const BASE_LAYER_ID = `${style.prefix}-base`;
  const GLOW_LAYER_ID = `${style.prefix}-glow`;
  let frame: number | null = null;
  let current: { from: LngLat; to: LngLat[] } | null = null;
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stopAnim = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };

  const removeLayers = () => {
    for (const id of [GLOW_LAYER_ID, BASE_LAYER_ID]) if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  };

  const animate = (t0: number) => {
    const tick = (now: number) => {
      if (!map.getLayer(GLOW_LAYER_ID)) { frame = null; return; }
      const p = ((now - t0) % style.pulseMs) / style.pulseMs;
      map.setPaintProperty(GLOW_LAYER_ID, 'line-gradient', pulseGradient(p, style.tail));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };

  const show = (from: LngLat, to: LngLat[]) => {
    if (to.length === 0) { hide(); return; }
    current = { from, to };
    // line-progress는 피처마다 0→1이라 한 그라디언트로 모든 경로에 빛이 함께 흐른다
    const data: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: to.map((t) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: greatCircle(from, t) },
      })),
    };
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }
    map.addSource(SOURCE_ID, { type: 'geojson', data, lineMetrics: true });
    // 교회 아이콘 아래에 깐다. 이웃 빛은 내 교회 빛보다도 아래
    const below = kind === 'neighbors'
      ? ['ongi-church-route-base', 'ongi-church-icons']
      : ['ongi-church-icons'];
    const before = below.find((id) => map.getLayer(id));
    map.addLayer({
      id: BASE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': style.base,
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, style.baseWidth[0], 8, style.baseWidth[1]],
        'line-blur': 1,
        'line-opacity': 0,
        'line-opacity-transition': { duration: 500 },
      },
    }, before);
    map.addLayer({
      id: GLOW_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, style.glowWidth[0], 8, style.glowWidth[1]],
        'line-blur': 2,
        'line-gradient': reducedMotion
          ? (['interpolate', ['linear'], ['line-progress'], 0, CLEAR, 1, GOLD_LIGHT] as mapboxgl.ExpressionSpecification)
          : pulseGradient(0, style.tail),
        'line-opacity': 0,
        'line-opacity-transition': { duration: 500 },
      },
    }, before);
    // 다음 프레임에 불투명도를 올려 전환이 걸리게
    requestAnimationFrame(() => {
      if (!map.getLayer(BASE_LAYER_ID)) return;
      map.setPaintProperty(BASE_LAYER_ID, 'line-opacity', 1);
      map.setPaintProperty(GLOW_LAYER_ID, 'line-opacity', style.glowOpacity);
    });
    stopAnim();
    if (!reducedMotion) animate(performance.now());
  };

  const hide = () => {
    current = null;
    stopAnim();
    removeLayers();
  };

  const restore = () => {
    if (!current) return;
    const { from, to } = current;
    stopAnim();
    removeLayers();
    show(from, to);
  };

  return { show, hide, restore };
}
