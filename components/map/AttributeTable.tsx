'use client';

import { useState, useEffect } from 'react';

export interface AttributeTableProps {
  layers: any[];
  map: any;
  className?: string;
}

export default function AttributeTable({
  layers,
  map,
  className = '',
}: AttributeTableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [features, setFeatures] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filteredFeatures, setFilteredFeatures] = useState<any[]>([]);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    if (selectedLayerId && map) {
      loadLayerData(selectedLayerId);
    }
  }, [selectedLayerId, map]);

  useEffect(() => {
    if (filterText === '') {
      setFilteredFeatures(features);
    } else {
      const filtered = features.filter(f => {
        return Object.values(f.properties).some(val =>
          String(val).toLowerCase().includes(filterText.toLowerCase())
        );
      });
      setFilteredFeatures(filtered);
    }
  }, [filterText, features]);

  const loadLayerData = (layerId: string) => {
    const source = map.getSource(layerId);
    if (!source || !source._data) {
      setFeatures([]);
      setColumns([]);
      return;
    }

    const geojson = source._data;
    const feats = geojson.features || [geojson];

    setFeatures(feats);
    setFilteredFeatures(feats);

    // Extract all unique property keys
    const allKeys = new Set<string>();
    feats.forEach((f: any) => {
      if (f.properties) {
        Object.keys(f.properties).forEach(key => allKeys.add(key));
      }
    });

    const cols = ['_id', '_geometry', ...Array.from(allKeys)];
    setColumns(cols);
  };

  const getGeometryType = (feature: any) => {
    return feature.geometry?.type || 'Unknown';
  };

  const exportToCSV = () => {
    if (filteredFeatures.length === 0) return;

    const csvRows = [];

    // Header
    csvRows.push(columns.join(','));

    // Data rows
    filteredFeatures.forEach((feature, idx) => {
      const row = columns.map(col => {
        if (col === '_id') return feature.id || idx;
        if (col === '_geometry') return getGeometryType(feature);
        const val = feature.properties?.[col];
        if (val === null || val === undefined) return '';
        // Escape commas and quotes
        if (String(val).includes(',') || String(val).includes('"')) {
          return `"${String(val).replace(/"/g, '""')}"`;
        }
        return String(val);
      });
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedLayerId}-attributes.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const zoomToFeature = (feature: any) => {
    if (!map || !feature.geometry) return;

    const bbox = getBBox(feature.geometry);
    if (bbox) {
      map.fitBounds(bbox, { padding: 50, duration: 1000 });
    }
  };

  const getBBox = (geometry: any): [number, number, number, number] | null => {
    if (!geometry || !geometry.coordinates) return null;

    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    const processCoords = (coords: any) => {
      if (typeof coords[0] === 'number') {
        // Single coordinate
        minLng = Math.min(minLng, coords[0]);
        maxLng = Math.max(maxLng, coords[0]);
        minLat = Math.min(minLat, coords[1]);
        maxLat = Math.max(maxLat, coords[1]);
      } else {
        // Array of coordinates
        coords.forEach((c: any) => processCoords(c));
      }
    };

    processCoords(geometry.coordinates);

    if (minLng === Infinity) return null;
    return [minLng, minLat, maxLng, maxLat];
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium">Table</span>
      </button>

      {isOpen && (
        <div className="fixed inset-x-4 bottom-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-96">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Attribute Table
              </h3>

              <select
                value={selectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="px-3 py-1.5 rounded border text-sm"
              >
                <option value="">Select layer...</option>
                {layers.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              {selectedLayerId && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredFeatures.length} / {features.length} features
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter..."
                className="px-3 py-1.5 rounded border text-sm w-48"
              />

              <button
                onClick={exportToCSV}
                disabled={filteredFeatures.length === 0}
                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Export CSV
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                Close
              </button>
            </div>
          </div>

          {/* Table */}
          {selectedLayerId ? (
            <div className="flex-1 overflow-auto">
              {filteredFeatures.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium border-b">Actions</th>
                      {columns.map(col => (
                        <th key={col} className="px-3 py-2 text-left font-medium border-b whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeatures.map((feature, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b"
                      >
                        <td className="px-3 py-2">
                          <button
                            onClick={() => zoomToFeature(feature)}
                            className="text-blue-600 hover:text-blue-800 text-xs underline"
                          >
                            Zoom
                          </button>
                        </td>
                        {columns.map(col => {
                          let value;
                          if (col === '_id') {
                            value = feature.id || idx;
                          } else if (col === '_geometry') {
                            value = getGeometryType(feature);
                          } else {
                            value = feature.properties?.[col];
                          }

                          return (
                            <td key={col} className="px-3 py-2 whitespace-nowrap">
                              {value !== null && value !== undefined ? String(value) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  {features.length === 0 ? 'No features in layer' : 'No features match filter'}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              Select a layer to view its attributes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
