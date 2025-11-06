import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export type GeometryType = 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon';

export interface LayerStyle {
  color: string;
  opacity: number;
  width?: number;
  radius?: number;
}

export interface ChoroplethStyle {
  property: string;
  method: 'jenks' | 'quantile' | 'equal-interval' | 'standard-deviation';
  classes: number;
  colorRamp: 'reds' | 'greens' | 'blues' | 'viridis' | 'spectral';
  breaks: number[];
  colors: string[];
}

export interface GraduatedStyle {
  property: string;
  minSize: number;
  maxSize: number;
  minValue: number;
  maxValue: number;
}

export type LayerStyleType = 'simple' | 'choropleth' | 'graduated' | 'categorical';

export interface LayerMetadata {
  id: string;
  name: string;
  type: 'vector' | 'raster' | 'analysis-result';
  geometryType: GeometryType;
  visible: boolean;
  opacity: number;
  featureCount: number;
  bounds?: [number, number, number, number];
  properties?: string[];
  crs?: string;
  created: string;
  modified: string;
}

export interface VectorLayer extends LayerMetadata {
  type: 'vector';
  source: 'upload' | 'remote' | 'drawn' | 'analysis';
  data: FeatureCollection;
  styleType: LayerStyleType;
  style: LayerStyle;
  choroplethStyle?: ChoroplethStyle;
  graduatedStyle?: GraduatedStyle;
}

export interface MapProject {
  id: string;
  name: string;
  description?: string;
  created: string;
  modified: string;
  version: string;
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  basemapId: string;
  layers: VectorLayer[];
  extent?: [number, number, number, number];
}

export interface FileImportResult {
  success: boolean;
  data?: FeatureCollection;
  error?: string;
  warnings?: string[];
  metadata: {
    originalFormat: string;
    featureCount: number;
    geometryType: GeometryType;
    properties: string[];
    crs?: string;
    bounds: [number, number, number, number];
  };
}

export interface ImportProgress {
  stage: 'reading' | 'parsing' | 'validating' | 'transforming' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}
