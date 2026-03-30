'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

import '@/components/shared/prayer-light.css';
import { createPrayerLightElement } from '@/components/shared/prayer-light';
import type { PrayerPoint } from '@/types/prayer';

export type { PrayerPoint };

interface GlobeViewProps {
  points: PrayerPoint[];
  onZoomChange?: (zoomLevel: number, center: { lat: number; lng: number }) => void;
}

interface ClusteredPoint {
  lat: number;
  lng: number;
  weight: number;
  isUser: boolean;
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

export function GlobeView({ points, onZoomChange }: GlobeViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const [clusterRadius, setClusterRadius] = useState(5);

  const globeMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.15, 0.15, 0.18),
      specular: new THREE.Color(0.05, 0.05, 0.05),
      shininess: 5,
    });
  }, []);

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
        onZoomChangeRef.current(zoomLevel, center);
      }
    };

    controls.addEventListener('change', handleChange);
    return () => controls.removeEventListener('change', handleChange);
  }, []);

  const clustered = useMemo(() => clusterPoints(points, clusterRadius), [points, clusterRadius]);
  const wires = useMemo(() => buildWireConnections(clustered), [clustered]);

  const htmlElementFn = useCallback((d: object) => {
    const p = d as ClusteredPoint;
    return createPrayerLightElement(p);
  }, []);

  return (
    <Globe
      ref={globeRef}
      globeImageUrl="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
      globeMaterial={globeMaterial}
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
      arcColor={() => 'rgba(245, 166, 35, 0.12)'}
      arcAltitudeAutoScale={0.3}
      arcStroke={0.3}
      arcDashLength={0.4}
      arcDashGap={0.2}
      arcDashAnimateTime={4000}
    />
  );
}
