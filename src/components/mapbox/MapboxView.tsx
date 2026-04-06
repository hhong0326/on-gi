'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import '@/components/shared/prayer-light.css';
import { createPrayerLightElement } from '@/components/shared/prayer-light';
import type { PrayerPoint } from '@/types/prayer';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export type MapboxStyle = 'dark' | 'light' | 'satellite' | 'satellite-streets' | 'streets' | 'outdoors';
export type FogPreset = 'dark' | 'warm' | 'blue';

const STYLE_URLS: Record<MapboxStyle, string> = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
};

const FOG_PRESETS: Record<FogPreset, mapboxgl.FogSpecification> = {
  dark: {
    color: 'rgb(10, 10, 20)',
    'high-color': 'rgb(20, 20, 40)',
    'horizon-blend': 0.08,
    'space-color': 'rgb(5, 5, 15)',
    'star-intensity': 0.4,
  },
  warm: {
    color: 'rgb(30, 15, 10)',
    'high-color': 'rgb(50, 25, 15)',
    'horizon-blend': 0.1,
    'space-color': 'rgb(15, 8, 5)',
    'star-intensity': 0.3,
  },
  blue: {
    color: 'rgb(10, 20, 40)',
    'high-color': 'rgb(20, 40, 80)',
    'horizon-blend': 0.06,
    'space-color': 'rgb(5, 10, 25)',
    'star-intensity': 0.5,
  },
};

interface MapboxViewProps {
  points: PrayerPoint[];
  mapStyle?: MapboxStyle;
  fogPreset?: FogPreset;
  hideLabels?: boolean;
}

export function MapboxView({ points, mapStyle = 'dark', fogPreset = 'dark', hideLabels = false }: MapboxViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef(new globalThis.Map<string, mapboxgl.Marker>());
  const currentStyleRef = useRef(mapStyle);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE_URLS[mapStyle],
      center: [126.978, 37.5665],
      zoom: 1.5,
      projection: 'globe',
      attributionControl: false,
    });

    map.on('style.load', () => {
      map.setFog(FOG_PRESETS[fogPreset]);
      if (hideLabels) {
        map.getStyle().layers?.forEach((layer) => {
          if (layer.type === 'symbol') {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        });
      }
    });

    mapRef.current = map;
    currentStyleRef.current = mapStyle;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update style when changed
  useEffect(() => {
    const map = mapRef.current;
    if (!map || currentStyleRef.current === mapStyle) return;

    currentStyleRef.current = mapStyle;
    map.setStyle(STYLE_URLS[mapStyle]);

    map.once('style.load', () => {
      map.setFog(FOG_PRESETS[fogPreset]);
      if (hideLabels) {
        map.getStyle().layers?.forEach((layer) => {
          if (layer.type === 'symbol') {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        });
      }
      // Re-add markers after style change
      markersRef.current.forEach((marker) => marker.addTo(map));
    });
  }, [mapStyle, fogPreset, hideLabels]);

  // Update fog when preset changes (without style reload)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setFog(FOG_PRESETS[fogPreset]);
    } catch {
      // style not loaded yet
    }
  }, [fogPreset]);

  // Update label visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.getStyle().layers?.forEach((layer) => {
        if (layer.type === 'symbol') {
          map.setLayoutProperty(layer.id, 'visibility', hideLabels ? 'none' : 'visible');
        }
      });
    } catch {
      // style not loaded yet
    }
  }, [hideLabels]);

  // Update markers (diff-based)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(points.map((p) => p.id));
    const existing = markersRef.current;

    existing.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    });

    const limited = points.length > 60 ? points.slice(-60) : points;
    limited.forEach((p) => {
      if (existing.has(p.id)) return;

      const el = createPrayerLightElement({
        weight: p.intensity,
        isUser: p.isUser,
        isActive: p.isActive,
        lat: p.lat,
        lng: p.lng,
        context: 'map',
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([p.lng, p.lat])
        .addTo(map);

      existing.set(p.id, marker);
    });
  }, [points]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ background: '#08080F' }}>
        <p className="text-sm text-white/40">Mapbox 토큰이 설정되지 않았습니다</p>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
