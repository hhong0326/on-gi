'use client';

import { useCallback, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';

import '@/components/shared/prayer-light.css';
import { createPrayerLightElement } from '@/components/shared/prayer-light';
import type { PrayerPoint } from '@/types/prayer';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a12' }] },
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080810' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0e0e18' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }, { weight: 0.5 }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#3a3a5e' }, { visibility: 'simplified' }] },
];

interface MapViewProps {
  points: PrayerPoint[];
}

function PrayerMarkers({ points }: { points: PrayerPoint[] }) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Initialize clusterer
  useEffect(() => {
    if (!map) return;

    clustererRef.current = new MarkerClusterer({
      map,
      algorithm: new SuperClusterAlgorithm({ radius: 80 }),
      renderer: {
        render: ({ count, position }) => {
          const weight = Math.min(count, 10);
          const el = createPrayerLightElement({
            weight,
            isUser: false,
            lat: position.lat(),
            lng: position.lng(),
          });
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: el,
          });
        },
      },
    });

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
    };
  }, [map]);

  // Update markers when points change
  useEffect(() => {
    if (!map || !clustererRef.current) return;

    // Clear old markers
    clustererRef.current.clearMarkers();
    markersRef.current = [];

    // Create new markers
    const newMarkers = points.map((p) => {
      const el = createPrayerLightElement({
        weight: p.intensity,
        isUser: p.isUser,
        lat: p.lat,
        lng: p.lng,
      });

      return new google.maps.marker.AdvancedMarkerElement({
        position: { lat: p.lat, lng: p.lng },
        content: el,
        map: undefined, // clusterer manages the map
      });
    });

    markersRef.current = newMarkers;
    clustererRef.current.addMarkers(newMarkers);
  }, [map, points]);

  return null;
}

export function MapView({ points }: MapViewProps) {
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
        defaultCenter={{ lat: 37.5665, lng: 126.978 }}
        defaultZoom={3}
        gestureHandling="greedy"
        disableDefaultUI={true}
        mapId="ongi-dark-map"
        styles={DARK_MAP_STYLES}
        backgroundColor="#08080F"
        style={{ width: '100%', height: '100%' }}
      >
        <PrayerMarkers points={points} />
      </Map>
    </APIProvider>
  );
}
