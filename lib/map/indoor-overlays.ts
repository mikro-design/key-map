/**
 * Indoor Overlay Management
 *
 * Utilities for managing indoor floor plans (raster images) and vector data
 * Following OpenAtlas indoor mapping specification
 */

import { Map as MapLibreMap } from 'maplibre-gl';
import {
  IndoorImageOverlay,
  IndoorVectorOverlay,
} from './map-sources';

/**
 * Add an image overlay (floor plan) to the map
 */
export function addImageOverlay(
  map: MapLibreMap,
  overlay: IndoorImageOverlay
): void {
  const sourceId = `indoor-image-${overlay.levelId}`;
  const layerId = `indoor-image-layer-${overlay.levelId}`;

  // Check if source already exists
  if (map.getSource(sourceId)) {
    map.removeLayer(layerId);
    map.removeSource(sourceId);
  }

  // Add image source
  map.addSource(sourceId, {
    type: 'image',
    url: overlay.imageUrl,
    coordinates: overlay.coordinates,
  });

  // Add raster layer
  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    paint: {
      'raster-opacity': overlay.opacity || 0.8,
    },
  });
}

/**
 * Add a vector overlay (GeoJSON) to the map
 */
export async function addVectorOverlay(
  map: MapLibreMap,
  overlay: IndoorVectorOverlay
): Promise<void> {
  const sourceId = `indoor-vector-${overlay.levelId}`;
  const fillLayerId = `indoor-vector-fill-${overlay.levelId}`;
  const strokeLayerId = `indoor-vector-stroke-${overlay.levelId}`;

  // Check if source already exists
  if (map.getSource(sourceId)) {
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
    map.removeSource(sourceId);
  }

  // Fetch GeoJSON data
  const response = await fetch(overlay.geojsonUrl);
  const geojson = await response.json();

  // Add GeoJSON source
  map.addSource(sourceId, {
    type: 'geojson',
    data: geojson,
  });

  // Add fill layer
  map.addLayer({
    id: fillLayerId,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': overlay.styleOptions?.fillColor || '#6c6',
      'fill-opacity': overlay.styleOptions?.fillOpacity || 0.4,
    },
  });

  // Add stroke layer
  map.addLayer({
    id: strokeLayerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': overlay.styleOptions?.strokeColor || '#333',
      'line-width': overlay.styleOptions?.strokeWidth || 1,
    },
  });
}

/**
 * Remove an indoor overlay from the map
 */
export function removeIndoorOverlay(
  map: MapLibreMap,
  levelId: string,
  type: 'image' | 'vector'
): void {
  if (type === 'image') {
    const sourceId = `indoor-image-${levelId}`;
    const layerId = `indoor-image-layer-${levelId}`;

    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  } else {
    const sourceId = `indoor-vector-${levelId}`;
    const fillLayerId = `indoor-vector-fill-${levelId}`;
    const strokeLayerId = `indoor-vector-stroke-${levelId}`;

    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  }
}

/**
 * Update the opacity of an indoor overlay
 */
export function updateOverlayOpacity(
  map: MapLibreMap,
  levelId: string,
  type: 'image' | 'vector',
  opacity: number
): void {
  if (type === 'image') {
    const layerId = `indoor-image-layer-${levelId}`;
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', opacity);
    }
  } else {
    const fillLayerId = `indoor-vector-fill-${levelId}`;
    if (map.getLayer(fillLayerId)) {
      map.setPaintProperty(fillLayerId, 'fill-opacity', opacity);
    }
  }
}

/**
 * Toggle visibility of an indoor overlay
 */
export function toggleOverlayVisibility(
  map: MapLibreMap,
  levelId: string,
  type: 'image' | 'vector',
  visible: boolean
): void {
  const visibility = visible ? 'visible' : 'none';

  if (type === 'image') {
    const layerId = `indoor-image-layer-${levelId}`;
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  } else {
    const fillLayerId = `indoor-vector-fill-${levelId}`;
    const strokeLayerId = `indoor-vector-stroke-${levelId}`;

    if (map.getLayer(fillLayerId)) {
      map.setLayoutProperty(fillLayerId, 'visibility', visibility);
    }
    if (map.getLayer(strokeLayerId)) {
      map.setLayoutProperty(strokeLayerId, 'visibility', visibility);
    }
  }
}

/**
 * Georeference helper - calculate coordinates for an image overlay
 * Given center point, width, and height in meters
 */
export function calculateImageCoordinates(
  centerLng: number,
  centerLat: number,
  widthMeters: number,
  heightMeters: number,
  rotation: number = 0
): [[number, number], [number, number], [number, number], [number, number]] {
  // Approximate degrees per meter (varies by latitude)
  const latDegPerMeter = 1 / 111320;
  const lngDegPerMeter = 1 / (111320 * Math.cos(centerLat * Math.PI / 180));

  const halfWidth = (widthMeters / 2) * lngDegPerMeter;
  const halfHeight = (heightMeters / 2) * latDegPerMeter;

  // Calculate corners (assuming no rotation for now)
  const topLeft: [number, number] = [centerLng - halfWidth, centerLat + halfHeight];
  const topRight: [number, number] = [centerLng + halfWidth, centerLat + halfHeight];
  const bottomRight: [number, number] = [centerLng + halfWidth, centerLat - halfHeight];
  const bottomLeft: [number, number] = [centerLng - halfWidth, centerLat - halfHeight];

  // TODO: Apply rotation if needed
  if (rotation !== 0) {
    console.warn('Rotation not yet implemented in calculateImageCoordinates');
  }

  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * Floor level manager
 */
export class FloorLevelManager {
  private map: MapLibreMap;
  private floors: Map<string, {
    level: number;
    name: string;
    overlays: (IndoorImageOverlay | IndoorVectorOverlay)[];
  }>;
  private activeFloor: string | null;

  constructor(map: MapLibreMap) {
    this.map = map;
    this.floors = new Map();
    this.activeFloor = null;
  }

  /**
   * Add a floor level
   */
  addFloor(levelId: string, level: number, name: string): void {
    this.floors.set(levelId, {
      level,
      name,
      overlays: [],
    });
  }

  /**
   * Add an overlay to a floor
   */
  addOverlayToFloor(
    levelId: string,
    overlay: IndoorImageOverlay | IndoorVectorOverlay
  ): void {
    const floor = this.floors.get(levelId);
    if (!floor) {
      throw new Error(`Floor ${levelId} not found`);
    }

    floor.overlays.push(overlay);

    // Add to map if this is the active floor
    if (this.activeFloor === levelId) {
      if (overlay.type === 'image') {
        addImageOverlay(this.map, overlay as IndoorImageOverlay);
      } else {
        addVectorOverlay(this.map, overlay as IndoorVectorOverlay);
      }
    }
  }

  /**
   * Switch to a different floor
   */
  switchToFloor(levelId: string): void {
    // Hide current floor overlays
    if (this.activeFloor) {
      const currentFloor = this.floors.get(this.activeFloor);
      if (currentFloor) {
        currentFloor.overlays.forEach((overlay) => {
          removeIndoorOverlay(this.map, overlay.levelId, overlay.type);
        });
      }
    }

    // Show new floor overlays
    const newFloor = this.floors.get(levelId);
    if (newFloor) {
      newFloor.overlays.forEach((overlay) => {
        if (overlay.type === 'image') {
          addImageOverlay(this.map, overlay as IndoorImageOverlay);
        } else {
          addVectorOverlay(this.map, overlay as IndoorVectorOverlay);
        }
      });
      this.activeFloor = levelId;
    }
  }

  /**
   * Get all floors
   */
  getFloors() {
    return Array.from(this.floors.entries()).map(([id, floor]) => ({
      id,
      ...floor,
    }));
  }

  /**
   * Get active floor
   */
  getActiveFloor(): string | null {
    return this.activeFloor;
  }
}

// Named exports are already defined above
// This default export is just for convenience and to avoid linting warnings
const indoorOverlays = {
  addImageOverlay,
  addVectorOverlay,
  removeIndoorOverlay,
  updateOverlayOpacity,
  toggleOverlayVisibility,
  calculateImageCoordinates,
  FloorLevelManager,
};

export default indoorOverlays;
