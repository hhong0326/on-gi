'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import Globe from 'react-globe.gl';

export interface PrayerPoint {
  id: string;
  lat: number;
  lng: number;
  intensity: number;
  isUser: boolean;
}

interface GlobeViewProps {
  points: PrayerPoint[];
}

interface ClusteredPoint {
  lat: number;
  lng: number;
  weight: number;
  isUser: boolean;
}

// Warm bulb colors from reference
const BULB_COLORS = ['#FFD700', '#FFA500', '#FF8C42', '#FFE4B5', '#FFFACD'];

function pickColor(lat: number, lng: number): string {
  return BULB_COLORS[Math.abs(Math.floor((lat + lng) * 100)) % BULB_COLORS.length];
}

function clusterPoints(points: PrayerPoint[], radius = 5): ClusteredPoint[] {
  const clusters: ClusteredPoint[] = [];
  const used = new Set<number>();

  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue;
    used.add(i);

    let latSum = points[i].lat * points[i].intensity;
    let lngSum = points[i].lng * points[i].intensity;
    let weightSum = points[i].intensity;
    let isUser = points[i].isUser;

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
      }
    }

    clusters.push({
      lat: latSum / weightSum,
      lng: lngSum / weightSum,
      weight: weightSum,
      isUser,
    });
  }

  return clusters;
}

// Build wire connections between nearby points (like string lights)
interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

function buildWireConnections(clusters: ClusteredPoint[], maxConns = 12): ArcData[] {
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

export function GlobeView({ points }: GlobeViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 130;
    controls.maxDistance = 600;
  }, []);

  const clustered = useMemo(() => clusterPoints(points), [points]);
  const wires = useMemo(() => buildWireConnections(clustered), [clustered]);

  // Inject flicker keyframes once (from reference: twinkling like string lights)
  useEffect(() => {
    if (document.getElementById('globe-flicker-style')) return;
    const style = document.createElement('style');
    style.id = 'globe-flicker-style';
    style.textContent = `
      @keyframes twinkle {
        0%, 100% { opacity: 1; }
        15% { opacity: 0.6; }
        30% { opacity: 0.85; }
        45% { opacity: 0.5; }
        60% { opacity: 0.9; }
        75% { opacity: 0.55; }
        90% { opacity: 0.95; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Multi-layered glow HTML element (core + inner glow + outer bloom from reference)
  const htmlElementFn = useCallback((d: object) => {
    const p = d as ClusteredPoint;
    const el = document.createElement('div');
    el.style.cssText = 'position:relative; transform:translate(-50%,-50%); pointer-events:none;';

    const clamped = Math.min(p.weight, 5);
    const t = clamped / 5;

    const color = p.isUser ? '#FFD700' : pickColor(p.lat, p.lng);
    const coreColor = p.isUser ? '#FFFFFF' : color;

    // Sizes from reference: core, inner glow (3x), outer bloom (6x)
    const coreSize = p.isUser ? 8 : 4 + t * 3;
    const innerSize = coreSize * 3;
    const outerSize = coreSize * 6;

    // Twinkling: each light gets different speed (from reference)
    const twinkleDuration = 2 + Math.random() * 4;
    const twinkleDelay = Math.random() * -6;

    // Outer bloom layer
    const outer = document.createElement('div');
    outer.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:${outerSize}px; height:${outerSize}px;
      border-radius:50%;
      background: radial-gradient(circle, ${color}15 0%, transparent 70%);
      transform:translate(-50%,-50%);
      animation: twinkle ${twinkleDuration * 1.2}s ease-in-out ${twinkleDelay}s infinite;
    `;
    el.appendChild(outer);

    // Inner glow layer
    const inner = document.createElement('div');
    inner.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:${innerSize}px; height:${innerSize}px;
      border-radius:50%;
      background: radial-gradient(circle, ${color}30 0%, transparent 70%);
      transform:translate(-50%,-50%);
      animation: twinkle ${twinkleDuration}s ease-in-out ${twinkleDelay}s infinite;
    `;
    el.appendChild(inner);

    // Core bright point
    const core = document.createElement('div');
    core.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:${coreSize}px; height:${coreSize}px;
      border-radius:50%;
      background:${coreColor};
      box-shadow: 0 0 ${coreSize}px ${color}, 0 0 ${coreSize * 2}px ${color}80;
      transform:translate(-50%,-50%);
      animation: twinkle ${twinkleDuration}s ease-in-out ${twinkleDelay}s infinite;
    `;
    el.appendChild(core);

    return el;
  }, []);

  return (
    <Globe
      ref={globeRef}
      globeImageUrl="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg"
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere={false}
      animateIn={true}
      htmlElementsData={clustered}
      htmlLat="lat"
      htmlLng="lng"
      htmlElement={htmlElementFn}
      htmlAltitude={0.01}
      arcsData={wires}
      arcStartLat="startLat"
      arcStartLng="startLng"
      arcEndLat="endLat"
      arcEndLng="endLng"
      arcColor={() => 'rgba(245, 166, 35, 0.15)'}
      arcAltitudeAutoScale={0.3}
      arcStroke={0.3}
      arcDashLength={0.4}
      arcDashGap={0.2}
      arcDashAnimateTime={4000}
    />
  );
}
