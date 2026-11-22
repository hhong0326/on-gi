import mapboxgl from 'mapbox-gl';

import type { ChurchMarker } from '@/lib/church';

// 지구본 교회 아이콘 — 기도 불빛(둥근 빛)과 구분되는 교회 선화 아이콘을 GeoJSON 심볼 레이어로 그린다.
// DOM 마커가 아니라 레이어라 교회 수가 늘어도 가볍다. 다른 교회는 모두 같은 모양, 내 교회만 밝게 (0010).

const SOURCE_ID = 'ongi-churches';
const LAYER_ID = 'ongi-church-icons';
const ICON = 'ongi-church';
const ICON_MINE = 'ongi-church-mine';
const ICON_PX = 24;
const PIXEL_RATIO = 2;

const GOLD = '#D4A44C';
const GOLD_LIGHT = '#F5D98A';
const NIGHT = 'rgba(19, 18, 9, 0.75)';

// 24×24 선화: 십자가 · 지붕 · 몸체 · 문
const GLYPH = 'M12 2.5v4M10.25 4.25h3.5M5.5 12l6.5-5 6.5 5M7.5 10.5V20h9v-9.5M10.75 20v-3.25h2.5V20';

function drawIcon(mine: boolean): ImageData | null {
  const size = ICON_PX * PIXEL_RATIO;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  // 바다·대륙 위에서 선이 묻히지 않게 어두운 원판을 깐다
  ctx.beginPath();
  ctx.arc(12, 12, 11, 0, Math.PI * 2);
  ctx.fillStyle = NIGHT;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = mine ? GOLD_LIGHT : 'rgba(212, 164, 76, 0.45)';
  ctx.stroke();

  const path = new Path2D(GLYPH);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = mine ? 1.75 : 1.5;
  ctx.strokeStyle = mine ? GOLD_LIGHT : GOLD;
  ctx.shadowColor = mine ? GOLD_LIGHT : 'transparent';
  ctx.shadowBlur = mine ? 4 : 0;
  ctx.stroke(path);

  return ctx.getImageData(0, 0, size, size);
}

function toGeoJSON(churches: ChurchMarker[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: churches.map((c) => ({
      type: 'Feature',
      id: c.id,
      geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
      properties: { name: c.name, description: c.description ?? '', mine: c.isMine },
    })),
  };
}

// 스타일 로드(style.load) 이후에만 호출한다 — 이미지·소스·레이어가 없으면 만들고, 있으면 데이터만 바꾼다.
// isStyleLoaded()는 타일을 받는 동안 false라 가드로 쓰지 않는다
export function syncChurchLayer(map: mapboxgl.Map, churches: ChurchMarker[]) {
  for (const [id, mine] of [[ICON, false], [ICON_MINE, true]] as const) {
    if (map.hasImage(id)) continue;
    const image = drawIcon(mine);
    if (image) map.addImage(id, image, { pixelRatio: PIXEL_RATIO });
  }

  const data = toGeoJSON(churches);
  const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource(SOURCE_ID, { type: 'geojson', data });
  }

  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'icon-image': ['case', ['get', 'mine'], ICON_MINE, ICON],
        'icon-size': [
          'interpolate', ['linear'], ['zoom'],
          1, ['case', ['get', 'mine'], 0.85, 0.55],
          6, ['case', ['get', 'mine'], 1.25, 0.9],
          12, ['case', ['get', 'mine'], 1.5, 1.1],
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        // 내 교회가 겹친 교회들 위로
        'symbol-sort-key': ['case', ['get', 'mine'], 1, 0],
      },
      paint: {
        'icon-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.75, 4, 1],
      },
    });
  }
}

function buildPopup(name: string, description: string, mineLabel: string | null): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ongi-church-popup-body';
  // 팝업 안에서 스크롤할 때 지도가 같이 움직이지 않게
  for (const type of ['wheel', 'touchstart', 'touchmove'] as const) {
    root.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
  }
  // 사용자 입력이므로 textContent로만 넣는다 (innerHTML 금지)
  if (mineLabel) {
    const tag = document.createElement('p');
    tag.className = 'ongi-church-popup-tag';
    tag.textContent = mineLabel;
    root.appendChild(tag);
  }
  const title = document.createElement('p');
  title.className = 'ongi-church-popup-name';
  title.textContent = name;
  root.appendChild(title);
  if (description) {
    const desc = document.createElement('p');
    desc.className = 'ongi-church-popup-desc';
    desc.textContent = description;
    root.appendChild(desc);
  }
  return root;
}

// 탭하면 이름·설명 팝업. 레이어 id에 묶인 핸들러라 스타일이 바뀌어도 한 번만 등록하면 된다
export function bindChurchPopup(map: mapboxgl.Map, getMineLabel: () => string) {
  const popup = new mapboxgl.Popup({
    className: 'ongi-church-popup',
    closeButton: false,
    offset: 14,
    maxWidth: 'none',
  });

  const onClick = (e: mapboxgl.MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature || feature.geometry.type !== 'Point') return;
    const { name, description, mine } = feature.properties as { name: string; description: string; mine: boolean };
    popup
      .setLngLat(feature.geometry.coordinates as [number, number])
      .setDOMContent(buildPopup(name, description, mine ? getMineLabel() : null))
      .addTo(map);
  };
  const onEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
  const onLeave = () => { map.getCanvas().style.cursor = ''; };

  map.on('click', LAYER_ID, onClick);
  map.on('mouseenter', LAYER_ID, onEnter);
  map.on('mouseleave', LAYER_ID, onLeave);

  return () => {
    map.off('click', LAYER_ID, onClick);
    map.off('mouseenter', LAYER_ID, onEnter);
    map.off('mouseleave', LAYER_ID, onLeave);
    popup.remove();
  };
}
