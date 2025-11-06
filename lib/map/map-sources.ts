/**
 * Map Source Strategy for KeyMap
 *
 * Comprehensive configuration for basemaps, indoor overlays, and data sources
 * Following OpenAtlas specification
 */

export type MapSourceType = 'vector' | 'raster' | 'raster-dem' | 'geojson' | 'image';

export type MapProviderLicense =
  | 'ODbL'  // OpenStreetMap Open Database License
  | 'CC-BY-4.0'  // Creative Commons Attribution
  | 'Free-View-Only'  // Free to view, not to redistribute
  | 'BSD'  // Berkeley Software Distribution
  | 'Commercial'
  | 'Open';

export interface MapAttribution {
  text: string;
  url?: string;
  required: boolean;
}

export interface MapSource {
  id: string;
  label: string;
  type: MapSourceType;
  styleUrl?: string;  // For vector styles
  tileUrl?: string;   // For raster tiles
  license: MapProviderLicense;
  attribution: MapAttribution[];
  maxZoom?: number;
  minZoom?: number;
  tileSize?: number;
  selfHostable: boolean;
  description?: string;
}

export interface BasemapCategory {
  id: string;
  label: string;
  sources: MapSource[];
}

/**
 * Default center coordinates and zoom level
 */
export const DEFAULT_MAP_VIEW = {
  center: [10.7522, 59.9139] as [number, number], // Oslo, Norway
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

/**
 * OpenStreetMap Attribution (required for all OSM-based sources)
 */
const OSM_ATTRIBUTION: MapAttribution = {
  text: '© OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org/copyright',
  required: true,
};

/**
 * Base map sources - Outdoor / General
 */
export const OUTDOOR_BASEMAPS: MapSource[] = [
  {
    id: 'osm-streets',
    label: 'Streets (OpenMapTiles)',
    type: 'vector',
    styleUrl: 'https://api.maptiler.com/maps/streets/style.json?key={MAPTILER_KEY}',
    license: 'ODbL',
    attribution: [
      OSM_ATTRIBUTION,
      { text: '© MapTiler', url: 'https://www.maptiler.com/', required: true },
    ],
    selfHostable: true,
    description: 'High-quality vector street map with OpenStreetMap data',
  },
  {
    id: 'osm-bright',
    label: 'Bright (OpenMapTiles)',
    type: 'vector',
    styleUrl: 'https://api.maptiler.com/maps/bright/style.json?key={MAPTILER_KEY}',
    license: 'ODbL',
    attribution: [
      OSM_ATTRIBUTION,
      { text: '© MapTiler', url: 'https://www.maptiler.com/', required: true },
    ],
    selfHostable: true,
    description: 'Clean, neutral vector style optimized for data overlay',
  },
  {
    id: 'carto-positron',
    label: 'Positron (Light)',
    type: 'raster',
    tileUrl: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    license: 'CC-BY-4.0',
    attribution: [
      OSM_ATTRIBUTION,
      { text: '© CARTO', url: 'https://carto.com/attributions', required: true },
    ],
    maxZoom: 19,
    tileSize: 256,
    selfHostable: false,
    description: 'Minimal light basemap for data visualization',
  },
  {
    id: 'carto-darkmatter',
    label: 'Dark Matter',
    type: 'raster',
    tileUrl: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    license: 'CC-BY-4.0',
    attribution: [
      OSM_ATTRIBUTION,
      { text: '© CARTO', url: 'https://carto.com/attributions', required: true },
    ],
    maxZoom: 19,
    tileSize: 256,
    selfHostable: false,
    description: 'Dark theme basemap for data visualization',
  },
  {
    id: 'stamen-toner',
    label: 'Toner (High Contrast)',
    type: 'raster',
    tileUrl: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
    license: 'CC-BY-4.0',
    attribution: [
      OSM_ATTRIBUTION,
      { text: '© Stamen Design', url: 'http://stamen.com', required: true },
      { text: '© Stadia Maps', url: 'https://stadiamaps.com/', required: true },
    ],
    maxZoom: 18,
    tileSize: 256,
    selfHostable: false,
    description: 'High-contrast black and white map',
  },
  {
    id: 'stamen-terrain',
    label: 'Terrain',
    type: 'raster',
    tileUrl: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
    license: 'CC-BY-4.0',
    attribution: [
      OSM_ATTRIBUTION,
      { text: '© Stamen Design', url: 'http://stamen.com', required: true },
      { text: '© Stadia Maps', url: 'https://stadiamaps.com/', required: true },
    ],
    maxZoom: 18,
    tileSize: 256,
    selfHostable: false,
    description: 'Terrain visualization with hillshading',
  },
];

/**
 * Satellite / Aerial imagery sources
 */
export const SATELLITE_BASEMAPS: MapSource[] = [
  {
    id: 'esri-world-imagery',
    label: 'Satellite (Esri)',
    type: 'raster',
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    license: 'Free-View-Only',
    attribution: [
      { text: '© Esri', url: 'https://www.esri.com/', required: true },
      { text: 'Source: Esri, Maxar, Earthstar Geographics', url: '', required: true },
    ],
    maxZoom: 19,
    tileSize: 256,
    selfHostable: false,
    description: 'High-resolution satellite imagery',
  },
  {
    id: 'maptiler-satellite',
    label: 'Satellite (MapTiler)',
    type: 'raster',
    tileUrl: 'https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key={MAPTILER_KEY}',
    license: 'Commercial',
    attribution: [
      { text: '© MapTiler', url: 'https://www.maptiler.com/', required: true },
      { text: '© Satellite imagery providers', url: '', required: true },
    ],
    maxZoom: 20,
    tileSize: 256,
    selfHostable: false,
    description: 'High-quality satellite imagery with global coverage',
  },
  {
    id: 'maptiler-hybrid',
    label: 'Hybrid (Satellite + Labels)',
    type: 'vector',
    styleUrl: 'https://api.maptiler.com/maps/hybrid/style.json?key={MAPTILER_KEY}',
    license: 'Commercial',
    attribution: [
      { text: '© MapTiler', url: 'https://www.maptiler.com/', required: true },
      OSM_ATTRIBUTION,
    ],
    selfHostable: false,
    description: 'Satellite imagery with vector labels overlay',
  },
];

/**
 * Specialized basemaps
 */
export const SPECIALIZED_BASEMAPS: MapSource[] = [
  {
    id: 'usgs-topo',
    label: 'USGS Topographic',
    type: 'raster',
    tileUrl: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
    license: 'Open',
    attribution: [
      { text: '© USGS', url: 'https://www.usgs.gov/', required: true },
    ],
    maxZoom: 16,
    tileSize: 256,
    selfHostable: false,
    description: 'USGS topographic maps (US only)',
  },
  {
    id: 'osm-humanitarian',
    label: 'Humanitarian (HOT)',
    type: 'raster',
    tileUrl: 'https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    license: 'ODbL',
    attribution: [
      OSM_ATTRIBUTION,
      { text: '© Humanitarian OpenStreetMap Team', url: 'https://www.hotosm.org/', required: true },
    ],
    maxZoom: 19,
    tileSize: 256,
    selfHostable: false,
    description: 'Humanitarian-focused map style',
  },
];

/**
 * All basemap categories organized
 */
export const BASEMAP_CATEGORIES: BasemapCategory[] = [
  {
    id: 'outdoor',
    label: 'Street Maps',
    sources: OUTDOOR_BASEMAPS,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    sources: SATELLITE_BASEMAPS,
  },
  {
    id: 'specialized',
    label: 'Specialized',
    sources: SPECIALIZED_BASEMAPS,
  },
];

/**
 * Get all available basemaps as flat array
 */
export const getAllBasemaps = (): MapSource[] => {
  return BASEMAP_CATEGORIES.flatMap(category => category.sources);
};

/**
 * Find basemap by ID
 */
export const getBasemapById = (id: string): MapSource | undefined => {
  return getAllBasemaps().find(source => source.id === id);
};

/**
 * Get default basemap
 */
export const getDefaultBasemap = (): MapSource => {
  return OUTDOOR_BASEMAPS[2]; // carto-positron (free, no API key required)
};

/**
 * Replace API key placeholders in URLs
 */
export const injectApiKey = (url: string, apiKey: string): string => {
  return url.replace('{MAPTILER_KEY}', apiKey);
};

/**
 * Generate attribution HTML string
 */
export const generateAttributionHTML = (attributions: MapAttribution[]): string => {
  return attributions
    .filter(attr => attr.required)
    .map(attr => {
      if (attr.url) {
        return `<a href="${attr.url}" target="_blank" rel="noopener noreferrer">${attr.text}</a>`;
      }
      return attr.text;
    })
    .join(' | ');
};

/**
 * Indoor overlay source configuration
 */
export interface IndoorOverlayConfig {
  type: 'image' | 'vector';
  levelId: string;
  levelName: string;
  opacity?: number;
}

export interface IndoorImageOverlay extends IndoorOverlayConfig {
  type: 'image';
  imageUrl: string;
  coordinates: [[number, number], [number, number], [number, number], [number, number]]; // 4 corners
}

export interface IndoorVectorOverlay extends IndoorOverlayConfig {
  type: 'vector';
  geojsonUrl: string;
  styleOptions?: {
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
  };
}

/**
 * Remote source configuration (WMS/WMTS/XYZ)
 */
export interface RemoteSourceConfig {
  id: string;
  name: string;
  type: 'wms' | 'wmts' | 'xyz' | 'geojson';
  url: string;
  layers?: string;  // For WMS
  format?: string;  // For WMS
  attribution?: MapAttribution[];
}

/**
 * Self-hosting configuration helpers
 */
export const SELF_HOSTING_OPTIONS = {
  openmaptiles: {
    dockerImage: 'maptiler/tileserver-gl',
    defaultPort: 8080,
    styleEndpoint: '/styles/bright/style.json',
    description: 'Self-hosted vector tiles using OpenMapTiles schema',
  },
  rasterTiles: {
    method: 'gdal2tiles',
    description: 'Pre-render raster tiles from GeoTIFF using GDAL',
  },
} as const;

/**
 * Cost and usage considerations
 */
export interface ProviderCostInfo {
  provider: string;
  freeTier?: string;
  pricingUrl?: string;
  recommendedFor: string[];
}

export const PROVIDER_COSTS: ProviderCostInfo[] = [
  {
    provider: 'MapTiler',
    freeTier: '100,000 tiles/month',
    pricingUrl: 'https://www.maptiler.com/cloud/pricing/',
    recommendedFor: ['Production', 'Vector tiles', 'High quality'],
  },
  {
    provider: 'OpenMapTiles (self-hosted)',
    freeTier: 'Unlimited (hosting cost only)',
    recommendedFor: ['Full control', 'Privacy', 'High volume'],
  },
  {
    provider: 'CARTO',
    freeTier: 'Free for non-commercial with attribution',
    pricingUrl: 'https://carto.com/pricing/',
    recommendedFor: ['Data visualization', 'Light use'],
  },
  {
    provider: 'Esri',
    freeTier: 'Free view-only',
    recommendedFor: ['Satellite imagery', 'View-only applications'],
  },
];

// Named exports are already defined above
// This default export is just for convenience and to avoid linting warnings
const mapSources = {
  BASEMAP_CATEGORIES,
  DEFAULT_MAP_VIEW,
  getAllBasemaps,
  getBasemapById,
  getDefaultBasemap,
  injectApiKey,
  generateAttributionHTML,
};

export default mapSources;
