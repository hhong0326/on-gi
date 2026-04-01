'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

import '@/components/shared/prayer-light.css';
import { createPrayerLightElement } from '@/components/shared/prayer-light';
import type { PrayerPoint } from '@/types/prayer';

export type { PrayerPoint };

export type GlobeTheme = 'wire-light' | 'wire-dark' | 'aubergine' | 'dark' | 'night' | 'blue-marble' | 'topology';

interface WireframeStyle {
  globe: [number, number, number];      // 구체(바다) RGB
  landFill: string;                      // 대륙 채움
  landStroke: string;                    // 대륙 경계선
  landSide: string;                      // 대륙 측면
  arcColor: string;                      // 연결선
}

interface ThemeConfig {
  url: string | null;
  color: [number, number, number];
  wireframe?: boolean;
  wireStyle?: WireframeStyle;
}

const GLOBE_THEMES: Record<GlobeTheme, ThemeConfig> = {
  'wire-light': {
    url: null,
    color: [0.06, 0.06, 0.08],
    wireframe: true,
    wireStyle: {
      globe: [0.08, 0.08, 0.12],
      landFill: 'rgba(180, 190, 210, 0.08)',
      landStroke: 'rgba(160, 170, 200, 0.4)',
      landSide: 'rgba(140, 150, 180, 0.05)',
      arcColor: 'rgba(160, 180, 220, 0.2)',
    },
  },
  'wire-dark': {
    url: null,
    color: [0.02, 0.02, 0.04],
    wireframe: true,
    wireStyle: {
      globe: [0.02, 0.02, 0.04],
      landFill: 'rgba(20, 30, 60, 0.5)',
      landStroke: 'rgba(60, 100, 180, 0.35)',
      landSide: 'rgba(30, 50, 100, 0.1)',
      arcColor: 'rgba(80, 140, 255, 0.2)',
    },
  },
  aubergine: { url: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg', color: [0.08, 0.04, 0.12] },
  dark: { url: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg', color: [0.08, 0.08, 0.1] },
  night: { url: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg', color: [0.06, 0.06, 0.08] },
  'blue-marble': { url: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg', color: [0.08, 0.08, 0.1] },
  topology: { url: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png', color: [0.1, 0.08, 0.06] },
};

interface GlobeViewProps {
  points: PrayerPoint[];
  theme?: GlobeTheme;
  onZoomChange?: (zoomLevel: number, center: { lat: number; lng: number }, visibleDegrees: number) => void;
}

interface ClusteredPoint {
  lat: number;
  lng: number;
  weight: number;
  isUser: boolean;
  isActive: boolean;
}

function clusterPoints(points: PrayerPoint[], radius: number): ClusteredPoint[] {
  const clusters: ClusteredPoint[] = [];
  const used = new Set<number>();

  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue;
    used.add(i);

    let latSum = points[i].lat * points[i].intensity;
    let lngSum = points[i].lng * points[i].intensity;
    let weightSum = points[i].intensity;
    let isUser = points[i].isUser;
    let hasActive = points[i].isActive;

    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue;
      const dLat = points[i].lat - points[j].lat;
      const dLng = points[i].lng - points[j].lng;
      if (dLat * dLat + dLng * dLng < radius * radius) {
        used.add(j);
        latSum += points[j].lat * points[j].intensity;
        lngSum += points[j].lng * points[j].intensity;
        weightSum += points[j].intensity;
        if (points[j].isUser) isUser = true;
        if (points[j].isActive) hasActive = true;
      }
    }

    clusters.push({
      lat: latSum / weightSum,
      lng: lngSum / weightSum,
      weight: weightSum,
      isUser,
      isActive: hasActive,
    });
  }

  return clusters;
}

interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

function buildWireConnections(clusters: ClusteredPoint[], maxConns = 15): ArcData[] {
  const conns: ArcData[] = [];

  for (let i = 0; i < clusters.length && conns.length < maxConns; i++) {
    let nearestIdx = -1;
    let nearestDist = Infinity;

    for (let j = i + 1; j < clusters.length; j++) {
      const dLat = clusters[i].lat - clusters[j].lat;
      const dLng = clusters[i].lng - clusters[j].lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < 40 && dist < nearestDist) {
        nearestIdx = j;
        nearestDist = dist;
      }
    }

    if (nearestIdx >= 0) {
      conns.push({
        startLat: clusters[i].lat,
        startLng: clusters[i].lng,
        endLat: clusters[nearestIdx].lat,
        endLng: clusters[nearestIdx].lng,
      });
    }
  }

  return conns;
}

const COUNTRIES_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export function GlobeView({ points, theme = 'aubergine', onZoomChange }: GlobeViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const [clusterRadius, setClusterRadius] = useState(5);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [countries, setCountries] = useState<any[]>([]);

  const themeConfig = GLOBE_THEMES[theme];
  const isWireframe = themeConfig.wireframe ?? false;

  // Load country polygons for wireframe mode
  useEffect(() => {
    if (!isWireframe) {
      setCountries([]);
      return;
    }
    (async () => {
      const { feature } = await import('topojson-client');
      const res = await fetch(COUNTRIES_URL);
      const world = await res.json();
      const geo = feature(world, world.objects.countries) as unknown as { features: unknown[] };
      setCountries(geo.features);
    })();
  }, [isWireframe]);

  const wireStyle = themeConfig.wireStyle;
  const globeMaterial = useMemo(() => {
    const [r, g, b] = themeConfig.color;
    if (isWireframe && wireStyle) {
      const [wr, wg, wb] = wireStyle.globe;
      return new THREE.MeshBasicMaterial({
        color: new THREE.Color(wr, wg, wb),
      });
    }
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(r, g, b),
      specular: new THREE.Color(0.05, 0.05, 0.05),
      shininess: 5,
    });
  }, [themeConfig, isWireframe, wireStyle]);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 130;
    controls.maxDistance = 600;

    const handleChange = () => {
      if (!globeRef.current) return;
      const camera = globeRef.current.camera();
      const dist = camera.position.length();
      const normalized = (dist - 130) / (600 - 130);
      setClusterRadius(1 + normalized * 7);

      if (onZoomChangeRef.current) {
        const zoomLevel = 1 - normalized;
        // Raycast from screen center to globe surface for accurate lat/lng
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const scene = globeRef.current.scene();
        const globeMesh = scene.children.find(
          (c: THREE.Object3D) => c.type === 'Mesh' || c.type === 'Group'
        );
        let center = { lat: 0, lng: 0 };
        if (globeMesh) {
          const hits = raycaster.intersectObject(globeMesh, true);
          if (hits.length > 0) {
            const p = hits[0].point.clone().normalize();
            center = {
              lat: Math.asin(p.y) * (180 / Math.PI),
              lng: Math.atan2(p.x, -p.z) * (180 / Math.PI),
            };
          }
        }
        // Calculate visible latitude degrees based on camera FOV and distance
        const globeRadius = 100; // react-globe.gl default
        const fov = camera.fov * (Math.PI / 180);
        const visibleDegrees = 2 * Math.atan(globeRadius / dist) * (180 / Math.PI) * (fov / 0.7);
        onZoomChangeRef.current(zoomLevel, center, visibleDegrees);
      }
    };

    controls.addEventListener('change', handleChange);
    return () => controls.removeEventListener('change', handleChange);
  }, []);

  const clustered = useMemo(() => clusterPoints(points, clusterRadius), [points, clusterRadius]);
  const wires = useMemo(() => buildWireConnections(clustered), [clustered]);

  const htmlElementFn = useCallback((d: object) => {
    const p = d as ClusteredPoint;
    return createPrayerLightElement({ ...p, context: 'globe' });
  }, []);

  return (
    <Globe
      ref={globeRef}
      globeImageUrl={themeConfig.url ?? undefined}
      showGlobe={true}
      globeMaterial={globeMaterial}
      showGraticules={isWireframe}
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere={false}
      animateIn={true}
      polygonsData={isWireframe ? countries : []}
      polygonCapColor={() => wireStyle?.landFill ?? 'rgba(30, 40, 70, 0.4)'}
      polygonSideColor={() => wireStyle?.landSide ?? 'rgba(60, 80, 140, 0.1)'}
      polygonStrokeColor={() => wireStyle?.landStroke ?? 'rgba(100, 140, 220, 0.3)'}
      polygonAltitude={0.005}
      htmlElementsData={clustered}
      htmlLat="lat"
      htmlLng="lng"
      htmlElement={htmlElementFn}
      htmlAltitude={0.02}
      arcsData={wires}
      arcStartLat="startLat"
      arcStartLng="startLng"
      arcEndLat="endLat"
      arcEndLng="endLng"
      arcColor={() => isWireframe ? (wireStyle?.arcColor ?? 'rgba(120, 180, 255, 0.25)') : 'rgba(245, 166, 35, 0.12)'}
      arcAltitudeAutoScale={0.3}
      arcStroke={isWireframe ? 0.5 : 0.3}
      arcDashLength={0.4}
      arcDashGap={0.2}
      arcDashAnimateTime={isWireframe ? 3000 : 4000}
    />
  );
}
