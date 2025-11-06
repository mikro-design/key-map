/**
 * Remote Source Management
 *
 * Utilities for connecting to external WMS, WMTS, XYZ, and GeoJSON sources
 * Following OpenAtlas remote source specification
 */

import { Map as MapLibreMap } from 'maplibre-gl';
import { RemoteSourceConfig } from './map-sources';

/**
 * Add an XYZ tile source to the map
 */
export function addXYZSource(
  map: MapLibreMap,
  config: RemoteSourceConfig,
  opacity: number = 1.0
): void {
  const sourceId = `remote-xyz-${config.id}`;
  const layerId = `remote-xyz-layer-${config.id}`;

  // Remove if exists
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  // Add source
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [config.url],
    tileSize: 256,
  });

  // Add layer
  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    paint: {
      'raster-opacity': opacity,
    },
  });
}

/**
 * Add a WMS source to the map
 */
export function addWMSSource(
  map: MapLibreMap,
  config: RemoteSourceConfig,
  opacity: number = 1.0
): void {
  const sourceId = `remote-wms-${config.id}`;
  const layerId = `remote-wms-layer-${config.id}`;

  // Remove if exists
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  // Build WMS tile URL
  const baseUrl = config.url;
  const layers = config.layers || '';
  const format = config.format || 'image/png';

  const tileUrl = `${baseUrl}?service=WMS&version=1.1.1&request=GetMap&layers=${layers}&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=${format}&transparent=true`;

  // Add source
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [tileUrl],
    tileSize: 256,
  });

  // Add layer
  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    paint: {
      'raster-opacity': opacity,
    },
  });
}

/**
 * Add a WMTS source to the map
 */
export function addWMTSSource(
  map: MapLibreMap,
  config: RemoteSourceConfig,
  opacity: number = 1.0
): void {
  const sourceId = `remote-wmts-${config.id}`;
  const layerId = `remote-wmts-layer-${config.id}`;

  // Remove if exists
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  // Add source
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [config.url],
    tileSize: 256,
  });

  // Add layer
  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    paint: {
      'raster-opacity': opacity,
    },
  });
}

/**
 * Add a remote GeoJSON source to the map
 */
export async function addGeoJSONSource(
  map: MapLibreMap,
  config: RemoteSourceConfig,
  styleOptions?: {
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
  }
): Promise<void> {
  const sourceId = `remote-geojson-${config.id}`;
  const fillLayerId = `remote-geojson-fill-${config.id}`;
  const strokeLayerId = `remote-geojson-stroke-${config.id}`;

  // Remove if exists
  if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
  if (map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  try {
    // Fetch GeoJSON with automatic retry
    const { fetchJSONWithRetry } = await import('@/lib/utils/fetchWithRetry');
    const geojson = await fetchJSONWithRetry(config.url, {
      timeout: 30000,
      retries: 3,
    });

    // Add source
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
        'fill-color': styleOptions?.fillColor || '#088',
        'fill-opacity': styleOptions?.fillOpacity || 0.4,
      },
    });

    // Add stroke layer
    map.addLayer({
      id: strokeLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': styleOptions?.strokeColor || '#066',
        'line-width': styleOptions?.strokeWidth || 2,
      },
    });
  } catch (error) {
    const { logger } = await import('@/lib/utils/logger');
    logger.error('Error loading GeoJSON source', error as Error, { url: config.url });
    throw error;
  }
}

/**
 * Remove a remote source from the map
 */
export function removeRemoteSource(
  map: MapLibreMap,
  sourceId: string,
  type: 'wms' | 'wmts' | 'xyz' | 'geojson'
): void {
  if (type === 'geojson') {
    const fillLayerId = `remote-geojson-fill-${sourceId}`;
    const strokeLayerId = `remote-geojson-stroke-${sourceId}`;
    const source = `remote-geojson-${sourceId}`;

    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
    if (map.getSource(source)) map.removeSource(source);
  } else {
    const layerId = `remote-${type}-layer-${sourceId}`;
    const source = `remote-${type}-${sourceId}`;

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(source)) map.removeSource(source);
  }
}

/**
 * Update remote source opacity
 */
export function updateRemoteSourceOpacity(
  map: MapLibreMap,
  sourceId: string,
  type: 'wms' | 'wmts' | 'xyz' | 'geojson',
  opacity: number
): void {
  if (type === 'geojson') {
    const fillLayerId = `remote-geojson-fill-${sourceId}`;
    if (map.getLayer(fillLayerId)) {
      map.setPaintProperty(fillLayerId, 'fill-opacity', opacity);
    }
  } else {
    const layerId = `remote-${type}-layer-${sourceId}`;
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', opacity);
    }
  }
}

/**
 * Toggle remote source visibility
 */
export function toggleRemoteSourceVisibility(
  map: MapLibreMap,
  sourceId: string,
  type: 'wms' | 'wmts' | 'xyz' | 'geojson',
  visible: boolean
): void {
  const visibility = visible ? 'visible' : 'none';

  if (type === 'geojson') {
    const fillLayerId = `remote-geojson-fill-${sourceId}`;
    const strokeLayerId = `remote-geojson-stroke-${sourceId}`;

    if (map.getLayer(fillLayerId)) {
      map.setLayoutProperty(fillLayerId, 'visibility', visibility);
    }
    if (map.getLayer(strokeLayerId)) {
      map.setLayoutProperty(strokeLayerId, 'visibility', visibility);
    }
  } else {
    const layerId = `remote-${type}-layer-${sourceId}`;
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  }
}

/**
 * Validate and parse remote source URL
 */
export function validateRemoteSourceUrl(
  url: string,
  type: 'wms' | 'wmts' | 'xyz' | 'geojson'
): { valid: boolean; error?: string } {
  try {
    new URL(url);
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Type-specific validation
  if (type === 'xyz') {
    if (!url.includes('{z}') || !url.includes('{x}') || !url.includes('{y}')) {
      return {
        valid: false,
        error: 'XYZ URL must contain {z}, {x}, and {y} placeholders',
      };
    }
  }

  if (type === 'wms') {
    const lower = url.toLowerCase();
    if (!lower.includes('wms') && !lower.includes('service=wms')) {
      return {
        valid: false,
        error: 'WMS URL should contain WMS service endpoint',
      };
    }
  }

  if (type === 'geojson') {
    if (!url.endsWith('.json') && !url.endsWith('.geojson') && !url.includes('geojson')) {
      return {
        valid: false,
        error: 'GeoJSON URL should point to a .json or .geojson file',
      };
    }
  }

  return { valid: true };
}

/**
 * Proxy URL to avoid CORS issues
 * Use an API route to proxy external requests
 */
export function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Remote source manager class
 */
export class RemoteSourceManager {
  private map: MapLibreMap;
  private sources: Map<string, RemoteSourceConfig>;

  constructor(map: MapLibreMap) {
    this.map = map;
    this.sources = new Map();
  }

  /**
   * Add a remote source
   */
  async addSource(
    config: RemoteSourceConfig,
    opacity: number = 1.0
  ): Promise<void> {
    // Validate URL
    const validation = validateRemoteSourceUrl(config.url, config.type);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Store config
    this.sources.set(config.id, config);

    // Add to map based on type
    switch (config.type) {
      case 'xyz':
        addXYZSource(this.map, config, opacity);
        break;
      case 'wms':
        addWMSSource(this.map, config, opacity);
        break;
      case 'wmts':
        addWMTSSource(this.map, config, opacity);
        break;
      case 'geojson':
        await addGeoJSONSource(this.map, config);
        break;
      default:
        throw new Error(`Unsupported source type: ${config.type}`);
    }
  }

  /**
   * Remove a remote source
   */
  removeSource(sourceId: string): void {
    const config = this.sources.get(sourceId);
    if (!config) {
      throw new Error(`Source ${sourceId} not found`);
    }

    removeRemoteSource(this.map, sourceId, config.type);
    this.sources.delete(sourceId);
  }

  /**
   * Get all sources
   */
  getSources(): RemoteSourceConfig[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get source by ID
   */
  getSource(sourceId: string): RemoteSourceConfig | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * Update source opacity
   */
  updateOpacity(sourceId: string, opacity: number): void {
    const config = this.sources.get(sourceId);
    if (!config) {
      throw new Error(`Source ${sourceId} not found`);
    }

    updateRemoteSourceOpacity(this.map, sourceId, config.type, opacity);
  }

  /**
   * Toggle source visibility
   */
  toggleVisibility(sourceId: string, visible: boolean): void {
    const config = this.sources.get(sourceId);
    if (!config) {
      throw new Error(`Source ${sourceId} not found`);
    }

    toggleRemoteSourceVisibility(this.map, sourceId, config.type, visible);
  }
}

// Named exports are already defined above
// This default export is just for convenience and to avoid linting warnings
const remoteSources = {
  addXYZSource,
  addWMSSource,
  addWMTSSource,
  addGeoJSONSource,
  removeRemoteSource,
  updateRemoteSourceOpacity,
  toggleRemoteSourceVisibility,
  validateRemoteSourceUrl,
  proxyUrl,
  RemoteSourceManager,
};

export default remoteSources;
