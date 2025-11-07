'use client';

import { useState, useEffect } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import { StylingEngine, ClassificationMethod, COLOR_RAMPS } from '@/lib/services/stylingEngine';
import { VectorLayer } from '@/lib/types/layer';
import { toast } from 'sonner';

export interface StylePanelProps {
  layers: VectorLayer[];
  map: MapLibreMap | null;
  onStyleApplied: () => void;
  className?: string;
}

export default function StylePanel({
  layers,
  map,
  onStyleApplied,
  className = '',
}: StylePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [styleMode, setStyleMode] = useState<'simple' | 'choropleth' | 'graduated'>('simple');
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [color, setColor] = useState('#3b82f6');
  const [colorRamp, setColorRamp] = useState<'reds' | 'greens' | 'blues' | 'viridis'>('blues');
  const [classes, setClasses] = useState(5);

  useEffect(() => {
    if (selectedLayerId && map) {
      loadProperties();
    }
  }, [selectedLayerId, map]);

  const loadProperties = () => {
    if (!map) return;
    const source = map.getSource(selectedLayerId) as any;
    if (!source || !source._data) return;

    const geojson = source._data;
    const features = geojson.features || [geojson];

    if (features.length === 0) return;

    const props = Object.keys(features[0].properties || {});
    const numericProps = props.filter(prop => {
      const values = features.map((f: any) => f.properties[prop]);
      return values.some((v: any) => typeof v === 'number' && !isNaN(v));
    });

    setProperties(numericProps);
    if (numericProps.length > 0 && !selectedProperty) {
      setSelectedProperty(numericProps[0]);
    }
  };

  const getColorRamp = (ramp: string, steps: number): string[] => {
    const ramps: any = {
      reds: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
      greens: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
      blues: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
      viridis: ['#440154', '#31688e', '#35b779', '#fde724', '#fde724']
    };

    const colors = ramps[ramp] || ramps.blues;

    if (steps <= colors.length) {
      return colors.slice(0, steps);
    }

    // Interpolate for more steps
    return colors;
  };


  const applySimpleStyle = () => {
    if (!map || !selectedLayerId) return;

    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return;

    const source = map.getSource(selectedLayerId) as any;
    const geojson = source?._data;
    const geomType = geojson?.features?.[0]?.geometry?.type;

    try {
      if (geomType === 'Point' || geomType === 'MultiPoint') {
        map.setPaintProperty(selectedLayerId, 'circle-color', color);
      } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
        map.setPaintProperty(selectedLayerId, 'line-color', color);
      } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        map.setPaintProperty(`${selectedLayerId}-fill`, 'fill-color', color);
        map.setPaintProperty(selectedLayerId, 'line-color', color);
      }

      onStyleApplied();
      toast.success('Style applied', {
        description: 'Layer color has been updated'
      });
    } catch (error: any) {
      toast.error('Failed to apply style', {
        description: 'Please check your layer configuration'
      });
    }
  };

  const applyChoroplethStyle = () => {
    if (!map || !selectedLayerId || !selectedProperty) return;

    const source = map.getSource(selectedLayerId) as any;
    if (!source || !source._data) return;

    const geojson = source._data;

    try {
      const stylingEngine = new StylingEngine();

      // Create choropleth style using proper Jenks natural breaks
      const style = stylingEngine.createChoroplethStyle(
        geojson,
        selectedProperty,
        classes,
        'jenks', // Using Jenks natural breaks
        colorRamp
      );

      // Convert to MapLibre expression
      const expression = stylingEngine.choroplethToExpression(style);

      const features = geojson.features || [geojson];
      const geomType = features[0]?.geometry?.type;

      if (geomType === 'Point' || geomType === 'MultiPoint') {
        map.setPaintProperty(selectedLayerId, 'circle-color', expression);
      } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        map.setPaintProperty(`${selectedLayerId}-fill`, 'fill-color', expression);
      } else {
        toast.warning('Unsupported geometry type', {
          description: 'Choropleth styling only works with points and polygons'
        });
        return;
      }

      onStyleApplied();
      setIsOpen(false);

      // Show statistics
      const stats = stylingEngine.getPropertyStatistics(geojson, selectedProperty);
      toast.success('Choropleth style applied', {
        description: `${style.classes} classes using Jenks Natural Breaks • Min: ${stats?.min.toFixed(2)} • Max: ${stats?.max.toFixed(2)} • Mean: ${stats?.mean.toFixed(2)}`
      });

    } catch (error: any) {
      toast.error('Failed to apply choropleth style', {
        description: 'Please ensure your layer has numeric properties'
      });
    }
  };

  const applyGraduatedStyle = () => {
    if (!map || !selectedLayerId || !selectedProperty) return;

    const source = map.getSource(selectedLayerId) as any;
    if (!source || !source._data) return;

    const geojson = source._data;

    try {
      const stylingEngine = new StylingEngine();

      // Create graduated style
      const style = stylingEngine.createGraduatedStyle(geojson, selectedProperty, 3, 20);

      // Convert to MapLibre expression
      const expression = stylingEngine.graduatedToExpression(style);

      const features = geojson.features || [geojson];
      const geomType = features[0]?.geometry?.type;

      if (geomType === 'Point' || geomType === 'MultiPoint') {
        map.setPaintProperty(selectedLayerId, 'circle-radius', expression);
        map.setPaintProperty(selectedLayerId, 'circle-color', color);
      } else {
        toast.warning('Unsupported geometry type', {
          description: 'Graduated symbols only work with point layers'
        });
        return;
      }

      onStyleApplied();
      setIsOpen(false);

      // Show statistics
      const stats = stylingEngine.getPropertyStatistics(geojson, selectedProperty);
      toast.success('Graduated symbols applied', {
        description: `Size: 3-20px • Range: ${style.minValue.toFixed(2)} - ${style.maxValue.toFixed(2)} • Mean: ${stats?.mean.toFixed(2)}`
      });

    } catch (error: any) {
      toast.error('Failed to apply graduated symbols', {
        description: 'Please ensure your layer has numeric properties'
      });
    }
  };

  const handleApplyStyle = () => {
    if (styleMode === 'simple') {
      applySimpleStyle();
    } else if (styleMode === 'choropleth') {
      applyChoroplethStyle();
    } else if (styleMode === 'graduated') {
      applyGraduatedStyle();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span className="text-sm font-medium">Style</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-96">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Layer Styling
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Layer Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">Layer</label>
                <select
                  value={selectedLayerId}
                  onChange={(e) => setSelectedLayerId(e.target.value)}
                  className="w-full px-3 py-2 rounded border text-sm"
                >
                  <option value="">Select layer...</option>
                  {layers.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Style Mode */}
              <div>
                <label className="block text-sm font-medium mb-1">Style Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setStyleMode('simple')}
                    className={`px-3 py-2 rounded text-xs ${styleMode === 'simple' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setStyleMode('choropleth')}
                    className={`px-3 py-2 rounded text-xs ${styleMode === 'choropleth' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    Choropleth
                  </button>
                  <button
                    onClick={() => setStyleMode('graduated')}
                    className={`px-3 py-2 rounded text-xs ${styleMode === 'graduated' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    Graduated
                  </button>
                </div>
              </div>

              {/* Simple Color */}
              {styleMode === 'simple' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 rounded border cursor-pointer"
                  />
                </div>
              )}

              {/* Choropleth Options */}
              {styleMode === 'choropleth' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Property</label>
                    <select
                      value={selectedProperty}
                      onChange={(e) => setSelectedProperty(e.target.value)}
                      className="w-full px-3 py-2 rounded border text-sm"
                    >
                      <option value="">Select property...</option>
                      {properties.map(prop => (
                        <option key={prop} value={prop}>{prop}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Color Ramp</label>
                    <select
                      value={colorRamp}
                      onChange={(e) => setColorRamp(e.target.value as any)}
                      className="w-full px-3 py-2 rounded border text-sm"
                    >
                      <option value="blues">Blues</option>
                      <option value="reds">Reds</option>
                      <option value="greens">Greens</option>
                      <option value="viridis">Viridis</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Classes: {classes}</label>
                    <input
                      type="range"
                      min="3"
                      max="9"
                      value={classes}
                      onChange={(e) => setClasses(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {/* Graduated Options */}
              {styleMode === 'graduated' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Property</label>
                    <select
                      value={selectedProperty}
                      onChange={(e) => setSelectedProperty(e.target.value)}
                      className="w-full px-3 py-2 rounded border text-sm"
                    >
                      <option value="">Select property...</option>
                      {properties.map(prop => (
                        <option key={prop} value={prop}>{prop}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </div>

                  <div className="text-xs text-gray-500">
                    Symbol size will vary from 3-20px based on property value
                  </div>
                </>
              )}

              {/* Apply Button */}
              <button
                onClick={handleApplyStyle}
                disabled={!selectedLayerId}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Apply Style
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
