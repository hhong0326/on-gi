import type mapboxgl from 'mapbox-gl';

// Tone-on-tone: dark-v11의 무채색 레이어를 웜 톤으로 덮어쓴다.
// 육지는 "따뜻한 기운만 도는 어두운 색"까지만 — 골드 기도 불빛과의 대비를 지키기 위함.
// Mapbox가 레이어 id를 바꾸면 해당 레이어만 원래 회색으로 남고 깨지지는 않는다 (getLayer 가드).
const TONE_LAND = 'hsl(40, 14%, 13%)';
const TONE_WATER = 'hsl(50, 30%, 6%)';

const TONE_ON_TONE_PAINT: { layer: string; property: 'background-color' | 'fill-color' | 'line-color'; value: string }[] = [
  { layer: 'land', property: 'background-color', value: TONE_LAND },
  { layer: 'land-structure-polygon', property: 'fill-color', value: TONE_LAND },
  { layer: 'land-structure-line', property: 'line-color', value: TONE_LAND },
  { layer: 'landuse', property: 'fill-color', value: 'hsl(40, 14%, 12%)' },
  { layer: 'national-park', property: 'fill-color', value: 'hsl(40, 14%, 12%)' },
  { layer: 'water', property: 'fill-color', value: TONE_WATER },
  { layer: 'waterway', property: 'line-color', value: TONE_WATER },
  { layer: 'admin-0-boundary-bg', property: 'line-color', value: TONE_WATER },
  { layer: 'admin-1-boundary-bg', property: 'line-color', value: TONE_WATER },
  { layer: 'admin-0-boundary', property: 'line-color', value: 'hsla(40, 45%, 55%, 0.35)' },
  { layer: 'admin-0-boundary-disputed', property: 'line-color', value: 'hsla(40, 45%, 55%, 0.35)' },
  { layer: 'admin-1-boundary', property: 'line-color', value: 'hsla(40, 35%, 50%, 0.18)' },
];

export function applyToneOnTone(map: mapboxgl.Map) {
  for (const { layer, property, value } of TONE_ON_TONE_PAINT) {
    if (map.getLayer(layer)) map.setPaintProperty(layer, property, value);
  }
  map.getStyle().layers?.forEach((layer) => {
    // 기도 시작 시 줌 8에서 보이는 도로/다리/터널/건물도 같은 웜 톤으로
    if (layer.type === 'line' && /^(road|bridge|tunnel|aeroway)-/.test(layer.id)) {
      map.setPaintProperty(layer.id, 'line-color', 'hsl(40, 10%, 21%)');
    }
    if (layer.type === 'fill' && (layer.id === 'building' || layer.id === 'aeroway-polygon')) {
      map.setPaintProperty(layer.id, 'fill-color', 'hsl(40, 12%, 11%)');
    }
    if (layer.type === 'symbol') {
      map.setPaintProperty(layer.id, 'text-color', 'hsla(40, 30%, 75%, 0.6)');
      map.setPaintProperty(layer.id, 'text-halo-color', TONE_WATER);
    }
  });
}
