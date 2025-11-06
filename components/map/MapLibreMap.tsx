'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MapSource,
  getDefaultBasemap,
  DEFAULT_MAP_VIEW,
} from '@/lib/map/map-sources';

export interface MapLibreMapProps {
  initialBasemap?: MapSource;
  initialCenter?: [number, number];
  initialZoom?: number;
  apiKeys?: {
    maptiler?: string;
  };
  className?: string;
  onLoad?: (map: Map) => void;
  onBasemapChange?: (basemap: MapSource) => void;
  showControls?: boolean;
  showScale?: boolean;
}

export default function MapLibreMap({
  initialBasemap,
  initialCenter = DEFAULT_MAP_VIEW.center,
  initialZoom = DEFAULT_MAP_VIEW.zoom,
  apiKeys = {},
  className = 'w-full h-full',
  onLoad,
  showControls = true,
  showScale = true,
}: MapLibreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const basemap = initialBasemap || getDefaultBasemap();

    // Create simple raster style
    const style = {
      version: 8,
      sources: {
        'raster-tiles': {
          type: 'raster',
          tiles: [basemap.tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: basemap.tileSize || 256,
          attribution: basemap.attribution?.map(a => a.text).join(' | ') || '© OpenStreetMap',
        },
      },
      layers: [
        {
          id: 'raster-layer',
          type: 'raster',
          source: 'raster-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: style as any,
      center: initialCenter,
      zoom: initialZoom,
    });

    if (showControls) {
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    }

    if (showScale) {
      map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
    }

    map.current.on('load', () => {
      setIsLoaded(true);
      if (onLoad && map.current) {
        onLoad(map.current);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
