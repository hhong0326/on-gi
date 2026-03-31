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
  ],
  silver: [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'road', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

interface MapViewProps {
  points: PrayerPoint[];
  theme?: MapTheme;
  center?: { lat: number; lng: number };
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

function PrayerOverlays({ points }: { points: PrayerPoint[] }) {
  const map = useMap();
  const overlaysRef = useRef<google.maps.OverlayView[]>([]);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!map) return;

    // Only rebuild if count changed significantly (avoid thrashing)
    if (Math.abs(points.length - prevCountRef.current) < 3 && prevCountRef.current > 0) return;
    prevCountRef.current = points.length;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    // Limit overlays for performance
    const limitedPoints = points.length > 60 ? points.slice(-60) : points;

    limitedPoints.forEach((p) => {
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
      overlaysRef.current.push(overlay);
    });

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
    };
  }, [map, points]);

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

export function MapView({ points, theme = 'retro', center, zoom, onZoomChange }: MapViewProps) {
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
        defaultZoom={zoom ?? 3}
        gestureHandling="greedy"
        disableDefaultUI={true}
        styles={MAP_THEME_STYLES[theme]}
        backgroundColor="#08080F"
        style={{ width: '100%', height: '100%' }}
      >
        <PrayerOverlays points={points} />
        {onZoomChange && <ZoomListener onZoomChange={onZoomChange} />}
      </Map>
    </APIProvider>
  );
}
