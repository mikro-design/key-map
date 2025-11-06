'use client';

import { useState } from 'react';
import * as turf from '@turf/turf';
import { toast } from 'sonner';

export interface SpatialAnalysisPanelProps {
  layers: any[];
  map: any;
  onAnalysisComplete: (result: any) => void;
  className?: string;
}

export default function SpatialAnalysisPanel({
  layers,
  map,
  onAnalysisComplete,
  className = '',
}: SpatialAnalysisPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [operation, setOperation] = useState<string>('');
  const [selectedLayer, setSelectedLayer] = useState<string>('');
  const [bufferDistance, setBufferDistance] = useState<number>(100);
  const [bufferUnit, setBufferUnit] = useState<'meters' | 'kilometers'>('meters');

  const performBuffer = () => {
    if (!selectedLayer) {
      toast.warning('No layer selected', {
        description: 'Please select a layer before running buffer analysis'
      });
      return;
    }

    const layer = layers.find(l => l.id === selectedLayer);
    if (!layer || !map) return;

    const source = map.getSource(selectedLayer);
    if (!source || !source._data) {
      toast.error('Layer data not available', {
        description: 'The selected layer does not contain valid data'
      });
      return;
    }

    const geojson = source._data;
    const buffered = turf.buffer(geojson, bufferDistance, { units: bufferUnit });

    if (!buffered) {
      toast.error('Buffer analysis failed', {
        description: 'Could not create buffer for the selected layer'
      });
      return;
    }

    // turf.buffer returns a Feature or FeatureCollection, wrap it if needed
    const bufferedFC = turf.featureCollection(
      Array.isArray((buffered as any).features)
        ? (buffered as any).features
        : [buffered]
    );

    // Add buffer result as new layer
    const resultId = `buffer-${Date.now()}`;
    map.addSource(resultId, {
      type: 'geojson',
      data: bufferedFC
    });

    map.addLayer({
      id: `${resultId}-fill`,
      type: 'fill',
      source: resultId,
      paint: {
        'fill-color': '#f59e0b',
        'fill-opacity': 0.3
      }
    });

    map.addLayer({
      id: resultId,
      type: 'line',
      source: resultId,
      paint: {
        'line-color': '#f59e0b',
        'line-width': 2
      }
    });

    onAnalysisComplete({
      id: resultId,
      name: `Buffer ${bufferDistance}${bufferUnit} - ${layer.name}`,
      type: 'analysis-buffer',
      visible: true,
      opacity: 1
    });

    setIsOpen(false);
    toast.success('Buffer analysis complete', {
      description: `Created ${bufferedFC.features.length} buffered features`
    });
  };

  const performIntersection = () => {
    if (layers.length < 2) {
      toast.warning('Not enough layers', {
        description: 'Need at least 2 layers for intersection analysis'
      });
      return;
    }

    // Use first two visible layers
    const visibleLayers = layers.filter(l => l.visible);
    if (visibleLayers.length < 2) {
      toast.warning('Not enough visible layers', {
        description: 'Please make at least 2 layers visible'
      });
      return;
    }

    const source1 = map.getSource(visibleLayers[0].id);
    const source2 = map.getSource(visibleLayers[1].id);

    if (!source1?._data || !source2?._data) {
      toast.error('Layer data not available', {
        description: 'One or more layers do not contain valid data'
      });
      return;
    }

    const features1 = source1._data.features || [source1._data];
    const features2 = source2._data.features || [source2._data];

    const intersections: any[] = [];

    features1.forEach((f1: any) => {
      features2.forEach((f2: any) => {
        try {
          const intersection = turf.intersect(f1, f2);
          if (intersection) {
            intersections.push(intersection);
          }
        } catch (e) {
          // Skip invalid intersections
        }
      });
    });

    if (intersections.length === 0) {
      toast.info('No intersections found', {
        description: 'The selected layers do not overlap'
      });
      return;
    }

    const resultId = `intersection-${Date.now()}`;
    map.addSource(resultId, {
      type: 'geojson',
      data: turf.featureCollection(intersections)
    });

    map.addLayer({
      id: `${resultId}-fill`,
      type: 'fill',
      source: resultId,
      paint: {
        'fill-color': '#8b5cf6',
        'fill-opacity': 0.4
      }
    });

    map.addLayer({
      id: resultId,
      type: 'line',
      source: resultId,
      paint: {
        'line-color': '#8b5cf6',
        'line-width': 2
      }
    });

    onAnalysisComplete({
      id: resultId,
      name: `Intersection - ${visibleLayers[0].name} & ${visibleLayers[1].name}`,
      type: 'analysis-intersection',
      visible: true,
      opacity: 1
    });

    setIsOpen(false);
    toast.success('Intersection complete', {
      description: `Found ${intersections.length} overlapping features`
    });
  };

  const performUnion = () => {
    if (layers.length < 2) {
      toast.warning('Not enough layers', {
        description: 'Need at least 2 layers for union analysis'
      });
      return;
    }

    const visibleLayers = layers.filter(l => l.visible);
    if (visibleLayers.length < 2) {
      toast.warning('Not enough visible layers', {
        description: 'Please make at least 2 layers visible'
      });
      return;
    }

    const source1 = map.getSource(visibleLayers[0].id);
    const source2 = map.getSource(visibleLayers[1].id);

    if (!source1?._data || !source2?._data) {
      toast.error('Layer data not available', {
        description: 'One or more layers do not contain valid data'
      });
      return;
    }

    const features1 = source1._data.features || [source1._data];
    const features2 = source2._data.features || [source2._data];

    if (features1.length === 0 || features2.length === 0) {
      toast.warning('Invalid layer data', {
        description: 'Layers must contain polygon features for union'
      });
      return;
    }

    try {
      const result = turf.union(turf.featureCollection([features1[0], features2[0]]));

      const resultId = `union-${Date.now()}`;
      map.addSource(resultId, {
        type: 'geojson',
        data: result
      });

      map.addLayer({
        id: `${resultId}-fill`,
        type: 'fill',
        source: resultId,
        paint: {
          'fill-color': '#06b6d4',
          'fill-opacity': 0.4
        }
      });

      map.addLayer({
        id: resultId,
        type: 'line',
        source: resultId,
        paint: {
          'line-color': '#06b6d4',
          'line-width': 2
        }
      });

      onAnalysisComplete({
        id: resultId,
        name: `Union - ${visibleLayers[0].name} & ${visibleLayers[1].name}`,
        type: 'analysis-union',
        visible: true,
        opacity: 1
      });

      setIsOpen(false);
      toast.success('Union complete', {
        description: 'Features have been merged successfully'
      });
    } catch (error: any) {
      toast.error('Union failed', {
        description: 'Please check that your layers contain valid polygon features'
      });
    }
  };

  const performDifference = () => {
    if (layers.length < 2) {
      toast.warning('Not enough layers', {
        description: 'Need at least 2 layers for difference analysis'
      });
      return;
    }

    const visibleLayers = layers.filter(l => l.visible);
    if (visibleLayers.length < 2) {
      toast.warning('Not enough visible layers', {
        description: 'Please make at least 2 layers visible'
      });
      return;
    }

    const source1 = map.getSource(visibleLayers[0].id);
    const source2 = map.getSource(visibleLayers[1].id);

    if (!source1?._data || !source2?._data) {
      toast.error('Layer data not available', {
        description: 'One or more layers do not contain valid data'
      });
      return;
    }

    const features1 = source1._data.features || [source1._data];
    const features2 = source2._data.features || [source2._data];

    try {
      // @ts-ignore - turf.difference API varies by version
      const result = turf.difference(features1[0], features2[0]);

      if (!result) {
        toast.info('Empty result', {
          description: 'Difference operation resulted in no geometry'
        });
        return;
      }

      const resultId = `difference-${Date.now()}`;
      map.addSource(resultId, {
        type: 'geojson',
        data: result
      });

      map.addLayer({
        id: `${resultId}-fill`,
        type: 'fill',
        source: resultId,
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.4
        }
      });

      map.addLayer({
        id: resultId,
        type: 'line',
        source: resultId,
        paint: {
          'line-color': '#ef4444',
          'line-width': 2
        }
      });

      onAnalysisComplete({
        id: resultId,
        name: `Difference - ${visibleLayers[0].name} - ${visibleLayers[1].name}`,
        type: 'analysis-difference',
        visible: true,
        opacity: 1
      });

      setIsOpen(false);
      toast.success('Difference complete', {
        description: 'Geometry difference calculated successfully'
      });
    } catch (error: any) {
      toast.error('Difference failed', {
        description: 'Please check that your layers contain valid polygon features'
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium">Analysis</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-96">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Spatial Analysis
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Buffer Analysis */}
              <div className="space-y-2">
                <button
                  onClick={() => setOperation('buffer')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded font-medium text-sm"
                >
                  📏 Buffer Analysis
                </button>

                {operation === 'buffer' && (
                  <div className="pl-4 space-y-2 border-l-2 border-blue-500">
                    <select
                      value={selectedLayer}
                      onChange={(e) => setSelectedLayer(e.target.value)}
                      className="w-full px-2 py-1 rounded border text-sm"
                    >
                      <option value="">Select layer...</option>
                      {layers.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={bufferDistance}
                        onChange={(e) => setBufferDistance(Number(e.target.value))}
                        className="flex-1 px-2 py-1 rounded border text-sm"
                        placeholder="Distance"
                      />
                      <select
                        value={bufferUnit}
                        onChange={(e) => setBufferUnit(e.target.value as any)}
                        className="px-2 py-1 rounded border text-sm"
                      >
                        <option value="meters">meters</option>
                        <option value="kilometers">kilometers</option>
                      </select>
                    </div>

                    <button
                      onClick={performBuffer}
                      className="w-full px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Run Buffer
                    </button>
                  </div>
                )}
              </div>

              {/* Intersection */}
              <button
                onClick={performIntersection}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
              >
                <span className="text-xl">⚡</span>
                <div>
                  <div className="font-medium">Intersection</div>
                  <div className="text-xs text-gray-500">Find overlapping areas</div>
                </div>
              </button>

              {/* Union */}
              <button
                onClick={performUnion}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
              >
                <span className="text-xl">🔗</span>
                <div>
                  <div className="font-medium">Union</div>
                  <div className="text-xs text-gray-500">Merge two features</div>
                </div>
              </button>

              {/* Difference */}
              <button
                onClick={performDifference}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
              >
                <span className="text-xl">✂️</span>
                <div>
                  <div className="font-medium">Difference</div>
                  <div className="text-xs text-gray-500">Subtract one from another</div>
                </div>
              </button>

              <div className="text-xs text-gray-500 pt-2 border-t">
                Note: Intersection, Union, and Difference use the first two visible layers
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
