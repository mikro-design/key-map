'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function SimpleMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [10.7522, 59.9139],
      zoom: 12,
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="bg-blue-600 text-white p-4 text-center">
        <h1 className="text-2xl font-bold">KeyMap - Simple Map Test</h1>
        <p>This is a basic OpenStreetMap view. If you see a map below, MapLibre is working.</p>
      </div>
      <div ref={mapContainer} className="flex-1" />
    </div>
  );
}
