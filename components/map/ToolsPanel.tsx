'use client';

import { useState } from 'react';

export interface ToolsPanelProps {
  onDrawPoint: () => void;
  onDrawLine: () => void;
  onDrawPolygon: () => void;
  onMeasureDistance: () => void;
  onMeasureArea: () => void;
  onSearch: () => void;
  onUploadData: () => void;
  onExportData: () => void;
  className?: string;
}

export default function ToolsPanel({
  onDrawPoint,
  onDrawLine,
  onDrawPolygon,
  onMeasureDistance,
  onMeasureArea,
  onSearch,
  onUploadData,
  onExportData,
  className = '',
}: ToolsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
        <span className="text-sm font-medium">Tools</span>
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-80">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Mapping Tools
              </h3>
            </div>

            <div className="p-2">
              {/* Drawing Tools */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                  DRAW
                </div>
                <button
                  onClick={() => { onDrawPoint(); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
                  title="Click to place a point on the map"
                >
                  <span className="text-xl">📍</span>
                  <div>
                    <div className="font-medium">Point</div>
                    <div className="text-xs text-gray-500">Click map to place</div>
                  </div>
                </button>
                <button
                  onClick={() => { onDrawLine(); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
                  title="Click points, double-click or press Enter to finish"
                >
                  <span className="text-xl">📏</span>
                  <div>
                    <div className="font-medium">Line</div>
                    <div className="text-xs text-gray-500">Double-click to finish</div>
                  </div>
                </button>
                <button
                  onClick={() => { onDrawPolygon(); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
                  title="Click points around perimeter, double-click to close"
                >
                  <span className="text-xl">⬟</span>
                  <div>
                    <div className="font-medium">Polygon</div>
                    <div className="text-xs text-gray-500">Double-click to close</div>
                  </div>
                </button>
              </div>

              {/* Measurement Tools */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                  MEASURE
                </div>
                <button
                  onClick={() => { onMeasureDistance(); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
                  title="Draw a line to measure distance in meters/kilometers"
                >
                  <span className="text-xl">📐</span>
                  <div>
                    <div className="font-medium">Distance</div>
                    <div className="text-xs text-gray-500">Measure length in m/km</div>
                  </div>
                </button>
                <button
                  onClick={() => { onMeasureArea(); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
                  title="Draw a polygon to calculate area in m²/ha/km²"
                >
                  <span className="text-xl">📦</span>
                  <div>
                    <div className="font-medium">Area</div>
                    <div className="text-xs text-gray-500">Calculate m²/ha/km²</div>
                  </div>
                </button>
              </div>

              {/* Data Tools */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                  DATA
                </div>
                <button
                  onClick={() => { onSearch(); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
                  title="Search for any address or place name worldwide"
                >
                  <span className="text-xl">🔍</span>
                  <div>
                    <div className="font-medium">Search Location</div>
                    <div className="text-xs text-gray-500">Find addresses globally</div>
                  </div>
                </button>
                <button
                  onClick={() => { onUploadData(); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
                  title="Import Shapefile (.zip), CSV (lat/lon), GeoJSON, KML, or GPX files"
                >
                  <span className="text-xl">📤</span>
                  <div>
                    <div className="font-medium">Upload Data</div>
                    <div className="text-xs text-gray-500">Shapefile, CSV, GeoJSON</div>
                  </div>
                </button>
                <button
                  onClick={() => { onExportData(); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
                  title="Export all drawn features as GeoJSON file"
                >
                  <span className="text-xl">💾</span>
                  <div>
                    <div className="font-medium">Export Map</div>
                    <div className="text-xs text-gray-500">Download GeoJSON</div>
                  </div>
                </button>
              </div>

              {/* Help Footer */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="px-2 py-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    ⌨️ Keyboard Shortcuts
                  </div>
                  <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                    <div><kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border">Enter</kbd> - Finish drawing</div>
                    <div><kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border">Escape</kbd> - Cancel drawing</div>
                    <div><kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border">Double-click</kbd> - Complete line/polygon</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
