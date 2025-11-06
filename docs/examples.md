# KeyMap Usage Examples

This document provides practical examples for implementing various features of the KeyMap platform.

## Table of Contents

1. [Basic Map Setup](#basic-map-setup)
2. [Basemap Management](#basemap-management)
3. [Indoor Floor Plans](#indoor-floor-plans)
4. [Remote Data Sources](#remote-data-sources)
5. [Layer Management](#layer-management)
6. [Supabase Integration](#supabase-integration)

---

## Basic Map Setup

### Simple Map Component

```tsx
import MapLibreMap from '@/components/map/MapLibreMap';

export default function SimpleMap() {
  return (
    <MapLibreMap
      initialCenter={[10.7522, 59.9139]}
      initialZoom={12}
      className="w-full h-screen"
    />
  );
}
```

### Map with Controls

```tsx
import MapLibreMap from '@/components/map/MapLibreMap';

export default function MapWithControls() {
  return (
    <MapLibreMap
      initialCenter={[10.7522, 59.9139]}
      initialZoom={12}
      showControls={true}
      showScale={true}
      className="w-full h-screen"
    />
  );
}
```

### Map with API Keys

```tsx
import MapLibreMap from '@/components/map/MapLibreMap';
import { getBasemapById } from '@/lib/map/map-sources';

export default function MapWithAPIKeys() {
  const basemap = getBasemapById('osm-streets');

  return (
    <MapLibreMap
      initialBasemap={basemap}
      initialCenter={[10.7522, 59.9139]}
      initialZoom={12}
      apiKeys={{
        maptiler: process.env.NEXT_PUBLIC_MAPTILER_KEY,
      }}
      className="w-full h-screen"
    />
  );
}
```

---

## Basemap Management

### Interactive Basemap Selector

```tsx
'use client';

import { useState } from 'react';
import MapLibreMap from '@/components/map/MapLibreMap';
import BasemapSelector from '@/components/map/BasemapSelector';
import { MapSource, getDefaultBasemap } from '@/lib/map/map-sources';
import { Map } from 'maplibre-gl';

export default function InteractiveMap() {
  const [basemap, setBasemap] = useState<MapSource>(getDefaultBasemap());
  const [map, setMap] = useState<Map | null>(null);

  const handleBasemapChange = (newBasemap: MapSource) => {
    setBasemap(newBasemap);
    if (map && (map as any).switchBasemap) {
      (map as any).switchBasemap(newBasemap);
    }
  };

  return (
    <div className="relative w-full h-screen">
      <MapLibreMap
        initialBasemap={basemap}
        onLoad={setMap}
        apiKeys={{ maptiler: process.env.NEXT_PUBLIC_MAPTILER_KEY }}
      />

      <div className="absolute top-4 left-4 z-10">
        <BasemapSelector
          currentBasemap={basemap}
          onBasemapChange={handleBasemapChange}
        />
      </div>
    </div>
  );
}
```

### Programmatic Basemap Switching

```tsx
import { Map } from 'maplibre-gl';
import { getBasemapById, injectApiKey } from '@/lib/map/map-sources';

function switchToSatellite(map: Map) {
  const satelliteBasemap = getBasemapById('esri-world-imagery');
  if (!satelliteBasemap) return;

  const tileUrl = satelliteBasemap.tileUrl!;

  const style = {
    version: 8,
    sources: {
      'satellite': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
      },
    },
    layers: [{
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite',
    }],
  };

  map.setStyle(style);
}
```

---

## Indoor Floor Plans

### Adding an Image Overlay

```tsx
import { Map } from 'maplibre-gl';
import { addImageOverlay, IndoorImageOverlay } from '@/lib/map/indoor-overlays';

function addFloorPlan(map: Map) {
  const overlay: IndoorImageOverlay = {
    type: 'image',
    levelId: 'floor-1',
    levelName: 'Ground Floor',
    imageUrl: '/floorplans/ground-floor.png',
    coordinates: [
      [10.750, 59.913],  // Top-left
      [10.760, 59.913],  // Top-right
      [10.760, 59.905],  // Bottom-right
      [10.750, 59.905],  // Bottom-left
    ],
    opacity: 0.8,
  };

  addImageOverlay(map, overlay);
}
```

### Adding a Vector Overlay

```tsx
import { Map } from 'maplibre-gl';
import { addVectorOverlay, IndoorVectorOverlay } from '@/lib/map/indoor-overlays';

async function addIndoorRooms(map: Map) {
  const overlay: IndoorVectorOverlay = {
    type: 'vector',
    levelId: 'floor-1',
    levelName: 'Ground Floor',
    geojsonUrl: '/data/floor-1-rooms.geojson',
    opacity: 0.6,
    styleOptions: {
      fillColor: '#4CAF50',
      fillOpacity: 0.4,
      strokeColor: '#2E7D32',
      strokeWidth: 2,
    },
  };

  await addVectorOverlay(map, overlay);
}
```

### Multi-Floor Management

```tsx
import { Map } from 'maplibre-gl';
import { FloorLevelManager, IndoorImageOverlay } from '@/lib/map/indoor-overlays';

function setupMultiFloorBuilding(map: Map) {
  const floorManager = new FloorLevelManager(map);

  // Add floors
  floorManager.addFloor('basement', -1, 'Basement');
  floorManager.addFloor('ground', 0, 'Ground Floor');
  floorManager.addFloor('first', 1, 'First Floor');

  // Add overlays to each floor
  const groundFloorOverlay: IndoorImageOverlay = {
    type: 'image',
    levelId: 'ground',
    levelName: 'Ground Floor',
    imageUrl: '/floorplans/ground.png',
    coordinates: [
      [10.750, 59.913],
      [10.760, 59.913],
      [10.760, 59.905],
      [10.750, 59.905],
    ],
    opacity: 0.8,
  };

  floorManager.addOverlayToFloor('ground', groundFloorOverlay);

  // Switch to ground floor
  floorManager.switchToFloor('ground');

  return floorManager;
}
```

### Calculate Image Coordinates from Center

```tsx
import { calculateImageCoordinates } from '@/lib/map/indoor-overlays';

// Calculate coordinates for a 100m x 80m floor plan
// centered at [10.7522, 59.9139]
const coordinates = calculateImageCoordinates(
  10.7522,  // center longitude
  59.9139,  // center latitude
  100,      // width in meters
  80,       // height in meters
  0         // rotation in degrees
);

console.log(coordinates);
// Returns: [[lng, lat], [lng, lat], [lng, lat], [lng, lat]]
```

---

## Remote Data Sources

### Adding an XYZ Tile Source

```tsx
import { Map } from 'maplibre-gl';
import { RemoteSourceManager } from '@/lib/map/remote-sources';

async function addCustomTiles(map: Map) {
  const manager = new RemoteSourceManager(map);

  await manager.addSource(
    {
      id: 'custom-tiles',
      name: 'Custom Tile Server',
      type: 'xyz',
      url: 'https://tiles.example.com/{z}/{x}/{y}.png',
    },
    0.8 // opacity
  );
}
```

### Adding a WMS Source

```tsx
import { Map } from 'maplibre-gl';
import { addWMSSource } from '@/lib/map/remote-sources';

function addWeatherLayer(map: Map) {
  addWMSSource(
    map,
    {
      id: 'weather-radar',
      name: 'Weather Radar',
      type: 'wms',
      url: 'https://geo.weather.gc.ca/geomet',
      layers: 'RADAR_1KM_RRAI',
      format: 'image/png',
    },
    0.7 // opacity
  );
}
```

### Adding a Remote GeoJSON

```tsx
import { Map } from 'maplibre-gl';
import { addGeoJSONSource } from '@/lib/map/remote-sources';

async function addBuildingFootprints(map: Map) {
  await addGeoJSONSource(
    map,
    {
      id: 'buildings',
      name: 'Building Footprints',
      type: 'geojson',
      url: 'https://example.com/data/buildings.geojson',
    },
    {
      fillColor: '#FFA500',
      fillOpacity: 0.5,
      strokeColor: '#FF6600',
      strokeWidth: 1,
    }
  );
}
```

### Using the Proxy for CORS

```tsx
import { proxyUrl } from '@/lib/map/remote-sources';

const externalUrl = 'https://external-service.com/tiles/{z}/{x}/{y}.png';
const proxiedUrl = proxyUrl(externalUrl);

// Use proxiedUrl in your tile source
// Result: /api/proxy?url=https%3A%2F%2Fexternal-service.com%2Ftiles%2F%7Bz%7D%2F%7Bx%7D%2F%7By%7D.png
```

---

## Layer Management

### Complete Layer Panel Example

```tsx
'use client';

import { useState } from 'react';
import { Map } from 'maplibre-gl';
import LayerPanel, { Layer } from '@/components/map/LayerPanel';
import MapLibreMap from '@/components/map/MapLibreMap';
import { RemoteSourceManager } from '@/lib/map/remote-sources';

export default function LayerManagement() {
  const [map, setMap] = useState<Map | null>(null);
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: 'layer-1',
      name: 'Building Footprints',
      type: 'remote',
      visible: true,
      opacity: 0.7,
    },
    {
      id: 'layer-2',
      name: 'Floor Plan - Level 1',
      type: 'indoor',
      visible: false,
      opacity: 0.8,
    },
  ]);

  const handleLayerToggle = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );

    // TODO: Update map layer visibility
  };

  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, opacity } : layer
      )
    );

    // TODO: Update map layer opacity
  };

  const handleLayerRemove = (layerId: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId));

    // TODO: Remove from map
  };

  const handleAddLayer = () => {
    // TODO: Show add layer dialog
    console.log('Add layer');
  };

  return (
    <div className="relative w-full h-screen">
      <MapLibreMap onLoad={setMap} />

      <div className="absolute top-4 left-4 z-10">
        <LayerPanel
          layers={layers}
          onLayerToggle={handleLayerToggle}
          onLayerOpacityChange={handleLayerOpacityChange}
          onLayerRemove={handleLayerRemove}
          onAddLayer={handleAddLayer}
        />
      </div>
    </div>
  );
}
```

---

## Supabase Integration

### Upload Floor Plan to Supabase

```tsx
import { uploadFile } from '@/lib/supabase/client';

async function handleFloorPlanUpload(file: File, buildingId: string, level: string) {
  const path = `${buildingId}/${level}/${file.name}`;

  const { url, error } = await uploadFile('floorplans', path, file);

  if (error) {
    console.error('Upload failed:', error);
    return null;
  }

  console.log('Floor plan uploaded:', url);
  return url;
}
```

### Get Public URL

```tsx
import { getPublicUrl } from '@/lib/supabase/client';

const floorPlanUrl = getPublicUrl('floorplans', 'building-1/floor-1/plan.png');

// Use in image overlay
const overlay = {
  type: 'image' as const,
  levelId: 'floor-1',
  levelName: 'Ground Floor',
  imageUrl: floorPlanUrl,
  coordinates: [/* ... */],
};
```

### Complete Upload and Display Flow

```tsx
'use client';

import { useState } from 'react';
import { Map } from 'maplibre-gl';
import { uploadFile } from '@/lib/supabase/client';
import { addImageOverlay, IndoorImageOverlay } from '@/lib/map/indoor-overlays';

export default function FloorPlanUploader({ map }: { map: Map }) {
  const [uploading, setUploading] = useState(false);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !map) return;

    setUploading(true);

    try {
      // Upload to Supabase
      const { url, error } = await uploadFile(
        'floorplans',
        `building-1/floor-1/${file.name}`,
        file
      );

      if (error) throw error;
      if (!url) throw new Error('No URL returned');

      // Add to map
      const overlay: IndoorImageOverlay = {
        type: 'image',
        levelId: 'floor-1',
        levelName: 'Ground Floor',
        imageUrl: url,
        coordinates: [
          [10.750, 59.913],
          [10.760, 59.913],
          [10.760, 59.905],
          [10.750, 59.905],
        ],
        opacity: 0.8,
      };

      addImageOverlay(map, overlay);

      alert('Floor plan added successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to upload floor plan');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

---

## Advanced Examples

### Dark Mode Integration

```tsx
'use client';

import { useState, useEffect } from 'react';
import MapLibreMap from '@/components/map/MapLibreMap';
import { MapSource, getBasemapById } from '@/lib/map/map-sources';

export default function DarkModeMap() {
  const [isDark, setIsDark] = useState(false);
  const [basemap, setBasemap] = useState<MapSource>();

  useEffect(() => {
    // Detect system theme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // Switch basemap based on theme
    const newBasemap = isDark
      ? getBasemapById('carto-darkmatter')
      : getBasemapById('carto-positron');

    if (newBasemap) setBasemap(newBasemap);
  }, [isDark]);

  if (!basemap) return null;

  return <MapLibreMap initialBasemap={basemap} />;
}
```

### Custom Attribution Placement

```tsx
import MapLibreMap from '@/components/map/MapLibreMap';
import MapAttribution from '@/components/map/MapAttribution';
import { getBasemapById } from '@/lib/map/map-sources';

export default function CustomAttributionMap() {
  const basemap = getBasemapById('osm-streets')!;

  return (
    <div className="relative w-full h-screen">
      <MapLibreMap initialBasemap={basemap} />

      {/* Custom position and styling */}
      <MapAttribution
        attributions={basemap.attribution}
        position="top-left"
        className="bg-yellow-100 text-black font-bold"
      />
    </div>
  );
}
```

---

## Tips and Best Practices

1. **Always provide API keys** for commercial basemaps (MapTiler, Mapbox)
2. **Use environment variables** for sensitive credentials
3. **Enable CORS proxy** for external tile sources
4. **Optimize image sizes** for floor plans (< 5MB recommended)
5. **Use GeoJSON** for vector data when possible (smaller, faster)
6. **Cache tiles** in production using CDN
7. **Implement error handling** for network requests
8. **Test on mobile devices** for responsive design
9. **Use proper attribution** for all data sources
10. **Monitor API usage** to avoid exceeding free tiers

---

For more information, see:
- [README.md](../README.md)
- [Map Sources Documentation](../lib/map/map-sources.ts)
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)
