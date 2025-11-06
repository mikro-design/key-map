import { FeatureCollection, Feature, Geometry, GeoJsonProperties } from 'geojson';
import * as turf from '@turf/turf';
import { FileImportResult, ImportProgress, GeometryType } from '../types/layer';

export class FileImportError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'FileImportError';
  }
}

export class FileImporter {
  private progressCallback?: (progress: ImportProgress) => void;

  constructor(progressCallback?: (progress: ImportProgress) => void) {
    this.progressCallback = progressCallback;
  }

  private updateProgress(stage: ImportProgress['stage'], progress: number, message: string) {
    this.progressCallback?.({ stage, progress, message });
  }

  async importFile(file: File): Promise<FileImportResult> {
    this.updateProgress('reading', 0, `Reading ${file.name}...`);

    try {
      const extension = file.name.toLowerCase().split('.').pop();

      let geojson: FeatureCollection;

      switch (extension) {
        case 'geojson':
        case 'json':
          geojson = await this.importGeoJSON(file);
          break;
        case 'csv':
          geojson = await this.importCSV(file);
          break;
        case 'shp':
        case 'zip':
          geojson = await this.importShapefile(file);
          break;
        case 'kml':
          geojson = await this.importKML(file);
          break;
        case 'gpx':
          geojson = await this.importGPX(file);
          break;
        default:
          throw new FileImportError(`Unsupported file format: .${extension}`);
      }

      this.updateProgress('validating', 60, 'Validating data...');
      const validated = this.validateAndClean(geojson);

      this.updateProgress('complete', 100, 'Import complete');

      const metadata = this.extractMetadata(validated, extension || 'unknown');

      return {
        success: true,
        data: validated,
        metadata
      };

    } catch (error) {
      this.updateProgress('error', 0, error instanceof Error ? error.message : 'Unknown error');

      if (error instanceof FileImportError) {
        return {
          success: false,
          error: error.message,
          metadata: {
            originalFormat: 'unknown',
            featureCount: 0,
            geometryType: 'Point',
            properties: [],
            bounds: [0, 0, 0, 0]
          }
        };
      }

      throw error;
    }
  }

  private async importGeoJSON(file: File): Promise<FeatureCollection> {
    this.updateProgress('parsing', 20, 'Parsing GeoJSON...');

    const text = await file.text();

    let json: any;
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new FileImportError('Invalid JSON format', error);
    }

    // Handle both FeatureCollection and single Feature
    if (json.type === 'Feature') {
      return {
        type: 'FeatureCollection',
        features: [json]
      };
    } else if (json.type === 'FeatureCollection') {
      return json;
    } else if (json.type && ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(json.type)) {
      // Raw geometry
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: json,
          properties: {}
        }]
      };
    } else {
      throw new FileImportError('Not a valid GeoJSON Feature or FeatureCollection');
    }
  }

  private async importCSV(file: File): Promise<FeatureCollection> {
    this.updateProgress('parsing', 20, 'Parsing CSV...');

    const Papa = (await import('papaparse')).default;
    const text = await file.text();

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as any[];

            if (data.length === 0) {
              throw new FileImportError('CSV file is empty');
            }

            this.updateProgress('transforming', 40, 'Converting to GeoJSON...');

            const firstRow = data[0];
            const headers = Object.keys(firstRow);

            // Try to detect coordinate columns
            const latCandidates = ['lat', 'latitude', 'y', 'northing', 'lat_dd', 'lat_decimal'];
            const lonCandidates = ['lon', 'lng', 'long', 'longitude', 'x', 'easting', 'lon_dd', 'lng_decimal', 'lon_decimal'];

            const latCol = headers.find(h =>
              latCandidates.some(c => h.toLowerCase() === c || h.toLowerCase().includes(c))
            );
            const lonCol = headers.find(h =>
              lonCandidates.some(c => h.toLowerCase() === c || h.toLowerCase().includes(c))
            );

            if (!latCol || !lonCol) {
              throw new FileImportError(
                'Could not detect latitude/longitude columns',
                { availableColumns: headers, hint: 'Columns should be named: lat, latitude, lon, lng, longitude, x, or y' }
              );
            }

            // Convert to GeoJSON
            const features: Feature[] = [];
            const errors: string[] = [];

            for (let i = 0; i < data.length; i++) {
              const row = data[i];
              const lat = Number(row[latCol]);
              const lon = Number(row[lonCol]);

              if (isNaN(lat) || isNaN(lon)) {
                errors.push(`Row ${i + 1}: Invalid coordinates (lat=${row[latCol]}, lon=${row[lonCol]})`);
                continue;
              }

              if (lat < -90 || lat > 90) {
                errors.push(`Row ${i + 1}: Latitude out of range: ${lat}`);
                continue;
              }

              if (lon < -180 || lon > 180) {
                errors.push(`Row ${i + 1}: Longitude out of range: ${lon}`);
                continue;
              }

              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lon, lat]
                },
                properties: { ...row }
              });
            }

            if (features.length === 0) {
              throw new FileImportError('No valid features found in CSV', { errors });
            }

            if (errors.length > 0 && errors.length < 10) {
              console.warn('CSV import warnings:', errors);
            } else if (errors.length >= 10) {
              console.warn(`CSV import had ${errors.length} errors`);
            }

            resolve({
              type: 'FeatureCollection',
              features
            });

          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => {
          reject(new FileImportError('Failed to parse CSV', error));
        }
      });
    });
  }

  private async importShapefile(file: File): Promise<FeatureCollection> {
    this.updateProgress('parsing', 20, 'Parsing Shapefile...');

    const shp = await import('shpjs');
    const buffer = await file.arrayBuffer();

    try {
      const result = await shp.default(buffer);

      // shpjs can return array of geojsons for multiple layers
      let geojson: any;
      if (Array.isArray(result)) {
        if (result.length === 0) {
          throw new FileImportError('Shapefile contains no layers');
        }
        geojson = result[0];
        if (result.length > 1) {
          console.warn(`Shapefile contains ${result.length} layers, only importing the first one`);
        }
      } else {
        geojson = result;
      }

      if (!geojson || !geojson.features) {
        throw new FileImportError('Invalid shapefile structure');
      }

      return geojson;

    } catch (error) {
      if (error instanceof FileImportError) {
        throw error;
      }
      throw new FileImportError('Failed to parse Shapefile', error);
    }
  }

  private async importKML(file: File): Promise<FeatureCollection> {
    this.updateProgress('parsing', 20, 'Parsing KML...');

    const { kml } = await import('@tmcw/togeojson');
    const text = await file.text();

    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');

      // Check for parse errors
      const parseError = xml.querySelector('parsererror');
      if (parseError) {
        throw new FileImportError('Invalid KML/XML format', { error: parseError.textContent });
      }

      const geojson = kml(xml);

      if (!geojson || !geojson.features) {
        throw new FileImportError('KML file contains no features');
      }

      // Filter out features with null geometry
      const validFeatures = geojson.features.filter((f: any) => f.geometry !== null);

      if (validFeatures.length === 0) {
        throw new FileImportError('KML file contains no valid geometries');
      }

      return {
        type: 'FeatureCollection',
        features: validFeatures
      } as FeatureCollection;

    } catch (error) {
      if (error instanceof FileImportError) {
        throw error;
      }
      throw new FileImportError('Failed to parse KML', error);
    }
  }

  private async importGPX(file: File): Promise<FeatureCollection> {
    this.updateProgress('parsing', 20, 'Parsing GPX...');

    const { gpx } = await import('@tmcw/togeojson');
    const text = await file.text();

    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');

      // Check for parse errors
      const parseError = xml.querySelector('parsererror');
      if (parseError) {
        throw new FileImportError('Invalid GPX/XML format', { error: parseError.textContent });
      }

      const geojson = gpx(xml);

      if (!geojson || !geojson.features) {
        throw new FileImportError('GPX file contains no features');
      }

      return geojson;

    } catch (error) {
      if (error instanceof FileImportError) {
        throw error;
      }
      throw new FileImportError('Failed to parse GPX', error);
    }
  }

  private validateAndClean(geojson: FeatureCollection): FeatureCollection {
    const cleanFeatures: Feature[] = [];

    for (let i = 0; i < geojson.features.length; i++) {
      const feature = geojson.features[i];

      // Validate feature structure
      if (!feature || feature.type !== 'Feature') {
        console.warn(`Feature ${i} is not a valid Feature, skipping`);
        continue;
      }

      // Validate geometry
      if (!feature.geometry || !feature.geometry.type) {
        console.warn(`Feature ${i} has no geometry, skipping`);
        continue;
      }

      // Validate coordinates
      try {
        const coords = this.extractCoordinates(feature.geometry);
        if (coords.length === 0) {
          console.warn(`Feature ${i} has no valid coordinates, skipping`);
          continue;
        }

        // Check coordinate ranges
        const invalidCoords = coords.filter(([lon, lat]) =>
          lon < -180 || lon > 180 || lat < -90 || lat > 90 || isNaN(lon) || isNaN(lat)
        );

        if (invalidCoords.length > 0) {
          console.warn(`Feature ${i} has invalid coordinates, skipping`, invalidCoords);
          continue;
        }

      } catch (error) {
        console.warn(`Feature ${i} geometry validation failed, skipping`, error);
        continue;
      }

      // Clean properties (remove null prototypes, undefined, etc.)
      const cleanProperties: GeoJsonProperties = {};
      if (feature.properties) {
        for (const [key, value] of Object.entries(feature.properties)) {
          if (value !== undefined && value !== null) {
            cleanProperties[key] = value;
          }
        }
      }

      cleanFeatures.push({
        type: 'Feature',
        geometry: feature.geometry,
        properties: cleanProperties,
        id: feature.id
      });
    }

    if (cleanFeatures.length === 0) {
      throw new FileImportError('No valid features after validation');
    }

    return {
      type: 'FeatureCollection',
      features: cleanFeatures
    };
  }

  private extractCoordinates(geometry: Geometry): [number, number][] {
    const coords: [number, number][] = [];

    const traverse = (coord: any): void => {
      if (Array.isArray(coord)) {
        if (typeof coord[0] === 'number' && typeof coord[1] === 'number') {
          coords.push([coord[0], coord[1]]);
        } else {
          coord.forEach(traverse);
        }
      }
    };

    // GeometryCollection doesn't have coordinates, handle it separately
    if (geometry.type === 'GeometryCollection') {
      geometry.geometries.forEach(g => {
        coords.push(...this.extractCoordinates(g));
      });
    } else if ('coordinates' in geometry) {
      traverse(geometry.coordinates);
    }

    return coords;
  }

  private extractMetadata(geojson: FeatureCollection, format: string): FileImportResult['metadata'] {
    const featureCount = geojson.features.length;

    // Detect geometry type (use most common)
    const geometryTypes = geojson.features.map(f => f.geometry.type);
    const geometryType = this.mostCommon(geometryTypes) as GeometryType;

    // Extract all property keys
    const propertyKeys = new Set<string>();
    geojson.features.forEach(f => {
      if (f.properties) {
        Object.keys(f.properties).forEach(key => propertyKeys.add(key));
      }
    });

    // Calculate bounds
    const bounds = turf.bbox(geojson) as [number, number, number, number];

    return {
      originalFormat: format,
      featureCount,
      geometryType,
      properties: Array.from(propertyKeys),
      bounds
    };
  }

  private mostCommon<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    arr.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    let max = 0;
    let result = arr[0];
    counts.forEach((count, item) => {
      if (count > max) {
        max = count;
        result = item;
      }
    });

    return result;
  }
}
