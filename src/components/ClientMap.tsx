"use client";

import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface ClientMapProps {
  coordinates?: { lat: number; lon: number };
  onLocationChange?: (lat: number, lon: number) => void;
  token?: string;
}

export default function ClientMap({
  coordinates = { lat: 41.6624, lon: -77.8231 },
  onLocationChange,
  token,
}: ClientMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  // Initial Mapbox mount
  useEffect(() => {
    const accessToken =
      token || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || mapboxgl.accessToken || '';

    if (!accessToken || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [coordinates.lon, coordinates.lat],
      zoom: 6,
      projection: 'globe',
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    // Force a resize once loaded to fix 0x0 container bugs
    map.on('load', () => {
      map.resize();
    });

    // Add Navigation and Scale controls
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    // Custom pulsing marker element
    const markerEl = document.createElement('div');
    markerEl.className = 'group relative flex items-center justify-center cursor-pointer';
    markerEl.innerHTML = `
      <div class="absolute -inset-2.5 rounded-full bg-sky-400/30 animate-ping"></div>
      <div class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-rose-500 to-sky-400 shadow-xl shadow-sky-950/70">
        <div class="h-2.5 w-2.5 rounded-full bg-white"></div>
      </div>
    `;

    const marker = new mapboxgl.Marker({
      element: markerEl,
      anchor: 'center',
    })
      .setLngLat([coordinates.lon, coordinates.lat])
      .addTo(map);

    markerRef.current = marker;

    // Listen for map clicks
    map.on('click', (e) => {
      const lat = Number(e.lngLat.lat.toFixed(6));
      const lon = Number(e.lngLat.lng.toFixed(6));
      onLocationChangeRef.current?.(lat, lon);
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center & marker position when coordinates change from parent
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([coordinates.lon, coordinates.lat]);
    }

    mapInstanceRef.current.flyTo({
      center: [coordinates.lon, coordinates.lat],
      zoom: Math.max(mapInstanceRef.current.getZoom(), 7),
      essential: true,
    });
  }, [coordinates.lat, coordinates.lon]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: '100%', height: '100%', minHeight: '600px' }}
      className="rounded-xl overflow-hidden shadow-2xl border border-slate-800"
    />
  );
}

