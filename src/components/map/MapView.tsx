'use client';

import { useCallback, useEffect, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';

import '@/components/shared/prayer-light.css';
import { createPrayerLightElement } from '@/components/shared/prayer-light';
import type { PrayerPoint } from '@/types/prayer';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export type MapTheme = 'retro' | 'dark' | 'night' | 'aubergine' | 'silver';

const MAP_THEME_STYLES: Record<MapTheme, google.maps.MapTypeStyle[]> = {
  retro: [
    { elementType: 'geometry', stylers: [{ color: '#ebe3cd' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1e6' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b9d3c2' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
    { featureType: 'road', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#a5977e' }, { weight: 0.5 }] },
  ],
  dark: [
    { elementType: 'geometry', stylers: [{ color: '#1a2138' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7fa3' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1624' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1a3a' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1e3050' }] },
    { featureType: 'road', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#2a4060' }, { weight: 0.5 }] },
  ],
  night: [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'road', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#3a5070' }, { weight: 0.8 }] },
  ],
  aubergine: [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
    { featureType: 'road', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#3a5580' }, { weight: 0.8 }] },
  ],
  silver: [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'road', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#9a9a9a' }, { weight: 0.8 }] },
  ],
};

interface MapViewProps {
  points: PrayerPoint[];
  theme?: MapTheme;
  hideLabels?: boolean;
  center?: { lat: number; lng: number };
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

function PrayerOverlays({ points }: { points: PrayerPoint[] }) {
  const map = useMap();
  const overlayMapRef = useRef(new globalThis.Map<string, google.maps.OverlayView>());

  useEffect(() => {
    if (!map) return;

    const currentIds = new Set(points.map((p) => p.id));
    const existingIds = overlayMapRef.current;

    // Remove overlays for deleted points
    existingIds.forEach((overlay, id) => {
      if (!currentIds.has(id)) {
        overlay.setMap(null);
        existingIds.delete(id);
      }
    });

    // Limit to last 60 points for performance
    const limitedPoints = points.length > 60 ? points.slice(-60) : points;

    // Add overlays for new points only
    limitedPoints.forEach((p) => {
      if (existingIds.has(p.id)) return;

      const overlay = new google.maps.OverlayView();

      overlay.onAdd = function () {
        const el = createPrayerLightElement({
          weight: p.intensity,
          isUser: p.isUser,
          isActive: p.isActive,
          lat: p.lat,
          lng: p.lng,
          context: 'map',
        });
        el.style.position = 'absolute';
        this.getPanes()?.overlayMouseTarget.appendChild(el);
        (this as unknown as { _el: HTMLElement })._el = el;
      };

      overlay.draw = function () {
        const projection = this.getProjection();
        if (!projection) return;
        const pos = projection.fromLatLngToDivPixel(
          new google.maps.LatLng(p.lat, p.lng)
        );
        if (!pos) return;
        const el = (this as unknown as { _el: HTMLElement })._el;
        if (el) {
          el.style.left = `${pos.x}px`;
          el.style.top = `${pos.y}px`;
        }
      };

      overlay.onRemove = function () {
        const el = (this as unknown as { _el: HTMLElement })._el;
        if (el?.parentNode) el.parentNode.removeChild(el);
      };

      overlay.setMap(map);
      existingIds.set(p.id, overlay);
    });
  }, [map, points]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      overlayMapRef.current.forEach((o) => o.setMap(null));
      overlayMapRef.current.clear();
    };
  }, []);

  return null;
}

function ZoomListener({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  const callbackRef = useRef(onZoomChange);
  callbackRef.current = onZoomChange;

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('zoom_changed', () => {
      callbackRef.current(map.getZoom() ?? 3);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  return null;
}

export function MapView({ points, theme = 'retro', hideLabels = false, center, zoom, onZoomChange }: MapViewProps) {
  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ background: '#08080F' }}>
        <p className="text-sm text-white/40">Google Maps API 키가 설정되지 않았습니다</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_KEY}>
      <Map
        defaultCenter={center ?? { lat: 37.5665, lng: 126.978 }}
        defaultZoom={zoom ?? 2}
        minZoom={1}
        gestureHandling="greedy"
        disableDefaultUI={true}
        styles={[
          ...MAP_THEME_STYLES[theme],
          ...(hideLabels ? [{ elementType: 'labels' as const, stylers: [{ visibility: 'off' as const }] }] : []),
        ]}
        backgroundColor="#08080F"
        style={{ width: '100%', height: '100%' }}
      >
        <PrayerOverlays points={points} />
        {onZoomChange && <ZoomListener onZoomChange={onZoomChange} />}
      </Map>
    </APIProvider>
  );
}
