'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { area as turfArea } from '@turf/turf';
import type { Feature, Polygon } from 'geojson';

interface AreaIntelligenceProps {
  onRequestAreaInfo: () => void;
  isActive: boolean;
  areaData: AreaData | null;
  isLoading: boolean;
  onClear: () => void;
}

export interface AreaData {
  coordinates: [number, number];
  address?: string;
  area?: number; // in square meters
  elevation?: number;
  weather?: {
    temperature: number;
    description: string;
    humidity: number;
  };
  landCover?: string;
}

export default function AreaIntelligence({ onRequestAreaInfo, isActive, areaData, isLoading, onClear }: AreaIntelligenceProps) {

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-3 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          📍 Area Intelligence
        </h3>
        <button
          onClick={onRequestAreaInfo}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {isActive ? 'Click Map' : 'Get Info'}
        </button>
      </div>

      {isActive && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-900 dark:text-blue-200">
          Click anywhere on the map to get comprehensive area information
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {areaData && !isLoading && (
        <div className="space-y-3">
          {/* Coordinates */}
          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Coordinates
            </div>
            <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
              {areaData.coordinates[1].toFixed(6)}, {areaData.coordinates[0].toFixed(6)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              (Lat, Lon)
            </div>
          </div>

          {/* Address */}
          {areaData.address && (
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Location
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {areaData.address}
              </div>
            </div>
          )}

          {/* Area */}
          {areaData.area !== undefined && (
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Area
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {areaData.area < 10000
                  ? `${areaData.area.toFixed(2)} m²`
                  : `${(areaData.area / 10000).toFixed(2)} ha`}
              </div>
            </div>
          )}

          {/* Elevation */}
          {areaData.elevation !== undefined && (
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Elevation
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {areaData.elevation} m
              </div>
            </div>
          )}

          {/* Weather */}
          {areaData.weather && (
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Weather
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                <div>{areaData.weather.temperature}°C - {areaData.weather.description}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Humidity: {areaData.weather.humidity}%
                </div>
              </div>
            </div>
          )}

          {/* Land Cover */}
          {areaData.landCover && (
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Land Cover
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {areaData.landCover}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${areaData.coordinates[1]}, ${areaData.coordinates[0]}`
                );
                toast.success('Coordinates copied to clipboard');
              }}
              className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Copy Coords
            </button>
            <button
              onClick={onClear}
              className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {!areaData && !isLoading && !isActive && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          Click &quot;Get Info&quot; to analyze any location on the map
        </div>
      )}
    </div>
  );
}

// Export helper function to fetch area data
export async function fetchAreaData(
  lng: number,
  lat: number,
  feature?: Feature<Polygon>
): Promise<AreaData> {
  const data: AreaData = {
    coordinates: [lng, lat],
  };

  // Calculate area if polygon provided
  if (feature && feature.geometry.type === 'Polygon') {
    data.area = turfArea(feature);
  }

  // Fetch reverse geocoding from Nominatim
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'KeyMap GIS Application',
        },
      }
    );
    const geocode = await response.json();
    if (geocode.display_name) {
      data.address = geocode.display_name;
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
  }

  // Fetch elevation from Open-Elevation API
  try {
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
    );
    const elevData = await response.json();
    if (elevData.results && elevData.results[0]) {
      data.elevation = elevData.results[0].elevation;
    }
  } catch (error) {
    console.error('Elevation fetch failed:', error);
  }

  // Note: Weather data would require OpenWeatherMap API key
  // Placeholder for future implementation
  // data.weather = await fetchWeatherData(lat, lng);

  return data;
}
