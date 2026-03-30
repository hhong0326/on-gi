'use client';

import { useEffect, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';

import '@/components/shared/prayer-light.css';
import { createPrayerLightElement } from '@/components/shared/prayer-light';
import type { PrayerPoint } from '@/types/prayer';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a12' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3a3a5e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#08080F' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080810' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0e0e18' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }, { weight: 0.5 }] },
  { featureType: 'administrative.province', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', stylers: [{ visibility: 'off' }] },
];

interface MapViewProps {
  points: PrayerPoint[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

function PrayerOverlays({ points }: { points: PrayerPoint[] }) {
  const map = useMap();
  const overlaysRef = useRef<google.maps.OverlayView[]>([]);

  useEffect(() => {
    if (!map) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    points.forEach((p) => {
      const overlay = new google.maps.OverlayView();

      overlay.onAdd = function () {
        const el = createPrayerLightElement({
          weight: p.intensity,
          isUser: p.isUser,
          lat: p.lat,
          lng: p.lng,
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

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('zoom_changed', () => {
      onZoomChange(map.getZoom() ?? 3);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onZoomChange]);

  return null;
}

export function MapView({ points, center, zoom, onZoomChange }: MapViewProps) {
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
        styles={DARK_MAP_STYLES}
        backgroundColor="#08080F"
        style={{ width: '100%', height: '100%' }}
      >
        <PrayerOverlays points={points} />
        {onZoomChange && <ZoomListener onZoomChange={onZoomChange} />}
      </Map>
    </APIProvider>
  );
}
