'use client';

import { useState } from 'react';
import { Map } from 'maplibre-gl';
import { addImageOverlay, addVectorOverlay } from '@/lib/map/indoor-overlays';
import { addXYZSource, addWMSSource, addWMTSSource, addGeoJSONSource } from '@/lib/map/remote-sources';
import { Layer } from './LayerPanel';
import { sanitizeURL, sanitizeLayerName, sanitizeText, sanitizeColor, parseCoordinates } from '@/lib/utils/sanitize';
import { toast } from 'sonner';

interface AddLayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLayer: (layer: Layer) => void;
  map: Map | null;
}

type LayerType = 'indoor-image' | 'indoor-vector' | 'remote-xyz' | 'remote-wms' | 'remote-wmts' | 'remote-geojson';

export default function AddLayerDialog({ isOpen, onClose, onAddLayer, map }: AddLayerDialogProps) {
  const [layerType, setLayerType] = useState<LayerType>('indoor-image');
  const [layerName, setLayerName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [geojsonUrl, setGeojsonUrl] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [wmsLayers, setWmsLayers] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [opacity, setOpacity] = useState(0.8);
  const [fillColor, setFillColor] = useState('#6c6');
  const [strokeColor, setStrokeColor] = useState('#333');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!map) {
      setError('Map not initialized');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const layerId = `layer-${Date.now()}`;
      const safeName = sanitizeLayerName(layerName);

      switch (layerType) {
        case 'indoor-image': {
          if (!imageUrl || !coordinates) {
            setError('Image URL and coordinates are required');
            setIsLoading(false);
            return;
          }

          const safeUrl = sanitizeURL(imageUrl);
          if (!safeUrl) {
            toast.error('Invalid image URL', { description: 'Please enter a valid HTTP/HTTPS URL' });
            setIsLoading(false);
            return;
          }

          const coords = parseCoordinates(coordinates);
          if (!coords || coords.length !== 4) {
            setError('Invalid coordinates format. Use: [[lng,lat], [lng,lat], [lng,lat], [lng,lat]]');
            setIsLoading(false);
            return;
          }

          addImageOverlay(map, {
            type: 'image',
            levelId: layerId,
            levelName: safeName || 'Floor Plan',
            imageUrl: safeUrl,
            coordinates: coords as [[number, number], [number, number], [number, number], [number, number]],
            opacity,
          });

          onAddLayer({
            id: layerId,
            name: safeName || 'Floor Plan',
            type: 'indoor',
            visible: true,
            opacity,
          });
          break;
        }

        case 'indoor-vector': {
          if (!geojsonUrl) {
            setError('GeoJSON URL is required');
            setIsLoading(false);
            return;
          }

          const safeGeoJsonUrl = sanitizeURL(geojsonUrl);
          if (!safeGeoJsonUrl) {
            toast.error('Invalid GeoJSON URL', { description: 'Please enter a valid HTTP/HTTPS URL' });
            setIsLoading(false);
            return;
          }

          const safeFill = sanitizeColor(fillColor, '#6c6');
          const safeStroke = sanitizeColor(strokeColor, '#333');

          await addVectorOverlay(map, {
            type: 'vector',
            levelId: layerId,
            levelName: safeName || 'Vector Layer',
            geojsonUrl: safeGeoJsonUrl,
            styleOptions: {
              fillColor: safeFill,
              fillOpacity: opacity,
              strokeColor: safeStroke,
              strokeWidth: 1,
            },
          });

          onAddLayer({
            id: layerId,
            name: safeName || 'Vector Layer',
            type: 'indoor',
            visible: true,
            opacity,
          });
          break;
        }

        case 'remote-xyz': {
          if (!remoteUrl) {
            setError('XYZ tile URL is required');
            setIsLoading(false);
            return;
          }

          const safeRemoteUrl = sanitizeURL(remoteUrl);
          if (!safeRemoteUrl) {
            toast.error('Invalid XYZ URL', { description: 'Please enter a valid HTTP/HTTPS URL' });
            setIsLoading(false);
            return;
          }

          if (!safeRemoteUrl.includes('{z}') || !safeRemoteUrl.includes('{x}') || !safeRemoteUrl.includes('{y}')) {
            setError('XYZ URL must contain {z}, {x}, and {y} placeholders');
            setIsLoading(false);
            return;
          }

          addXYZSource(map, {
            id: layerId,
            name: safeName || 'XYZ Tiles',
            type: 'xyz',
            url: safeRemoteUrl,
          }, opacity);

          onAddLayer({
            id: layerId,
            name: safeName || 'XYZ Tiles',
            type: 'remote',
            visible: true,
            opacity,
          });
          break;
        }

        case 'remote-wms': {
          if (!remoteUrl || !wmsLayers) {
            setError('WMS URL and layers are required');
            setIsLoading(false);
            return;
          }

          const safeWmsUrl = sanitizeURL(remoteUrl);
          if (!safeWmsUrl) {
            toast.error('Invalid WMS URL', { description: 'Please enter a valid HTTP/HTTPS URL' });
            setIsLoading(false);
            return;
          }

          const safeLayers = sanitizeText(wmsLayers, 500);

          addWMSSource(map, {
            id: layerId,
            name: safeName || 'WMS Layer',
            type: 'wms',
            url: safeWmsUrl,
            layers: safeLayers,
          }, opacity);

          onAddLayer({
            id: layerId,
            name: safeName || 'WMS Layer',
            type: 'remote',
            visible: true,
            opacity,
          });
          break;
        }

        case 'remote-wmts': {
          if (!remoteUrl) {
            setError('WMTS URL is required');
            setIsLoading(false);
            return;
          }

          const safeWmtsUrl = sanitizeURL(remoteUrl);
          if (!safeWmtsUrl) {
            toast.error('Invalid WMTS URL', { description: 'Please enter a valid HTTP/HTTPS URL' });
            setIsLoading(false);
            return;
          }

          addWMTSSource(map, {
            id: layerId,
            name: safeName || 'WMTS Layer',
            type: 'wmts',
            url: safeWmtsUrl,
          }, opacity);

          onAddLayer({
            id: layerId,
            name: safeName || 'WMTS Layer',
            type: 'remote',
            visible: true,
            opacity,
          });
          break;
        }

        case 'remote-geojson': {
          if (!geojsonUrl) {
            setError('GeoJSON URL is required');
            setIsLoading(false);
            return;
          }

          const safeGeoJsonRemoteUrl = sanitizeURL(geojsonUrl);
          if (!safeGeoJsonRemoteUrl) {
            toast.error('Invalid GeoJSON URL', { description: 'Please enter a valid HTTP/HTTPS URL' });
            setIsLoading(false);
            return;
          }

          const safeFillColor = sanitizeColor(fillColor, '#6c6');
          const safeStrokeColor = sanitizeColor(strokeColor, '#333');

          await addGeoJSONSource(map, {
            id: layerId,
            name: safeName || 'GeoJSON Layer',
            type: 'geojson',
            url: safeGeoJsonRemoteUrl,
          }, {
            fillColor: safeFillColor,
            fillOpacity: opacity,
            strokeColor: safeStrokeColor,
            strokeWidth: 2,
          });

          onAddLayer({
            id: layerId,
            name: safeName || 'GeoJSON Layer',
            type: 'overlay',
            visible: true,
            opacity,
          });
          break;
        }
      }

      // Reset form and close
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add layer');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setLayerName('');
    setImageUrl('');
    setGeojsonUrl('');
    setRemoteUrl('');
    setWmsLayers('');
    setCoordinates('');
    setOpacity(0.8);
    setFillColor('#6c6');
    setStrokeColor('#333');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Layer</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Layer Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Layer Type
            </label>
            <select
              value={layerType}
              onChange={(e) => setLayerType(e.target.value as LayerType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <optgroup label="Indoor Mapping">
                <option value="indoor-image">Floor Plan (Image)</option>
                <option value="indoor-vector">Indoor Features (GeoJSON)</option>
              </optgroup>
              <optgroup label="Remote Sources">
                <option value="remote-xyz">XYZ Tiles</option>
                <option value="remote-wms">WMS (Web Map Service)</option>
                <option value="remote-wmts">WMTS (Web Map Tile Service)</option>
                <option value="remote-geojson">Remote GeoJSON</option>
              </optgroup>
            </select>
          </div>

          {/* Layer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Layer Name
            </label>
            <input
              type="text"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              placeholder="My Layer"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Conditional Fields Based on Type */}
          {layerType === 'indoor-image' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image URL *
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/floorplan.png"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Coordinates (4 corners: [topLeft, topRight, bottomRight, bottomLeft]) *
                </label>
                <textarea
                  value={coordinates}
                  onChange={(e) => setCoordinates(e.target.value)}
                  placeholder='[[10.750, 59.913], [10.760, 59.913], [10.760, 59.905], [10.750, 59.905]]'
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {layerType === 'indoor-vector' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GeoJSON URL *
                </label>
                <input
                  type="url"
                  value={geojsonUrl}
                  onChange={(e) => setGeojsonUrl(e.target.value)}
                  placeholder="https://example.com/features.geojson"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fill Color
                  </label>
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stroke Color
                  </label>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>
            </>
          )}

          {layerType === 'remote-xyz' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                XYZ Tile URL *
              </label>
              <input
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://tiles.example.com/{z}/{x}/{y}.png"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must include {'{'} z{'}'}, {'{'} x{'}'}, and {'{'} y{'}'} placeholders
              </p>
            </div>
          )}

          {layerType === 'remote-wms' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  WMS Service URL *
                </label>
                <input
                  type="url"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://example.com/wms"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Layer Names *
                </label>
                <input
                  type="text"
                  value={wmsLayers}
                  onChange={(e) => setWmsLayers(e.target.value)}
                  placeholder="layer1,layer2"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Comma-separated WMS layer names
                </p>
              </div>
            </>
          )}

          {layerType === 'remote-wmts' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                WMTS Tile URL *
              </label>
              <input
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://example.com/wmts/layer/{z}/{x}/{y}.png"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {layerType === 'remote-geojson' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GeoJSON URL *
                </label>
                <input
                  type="url"
                  value={geojsonUrl}
                  onChange={(e) => setGeojsonUrl(e.target.value)}
                  placeholder="https://example.com/data.geojson"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fill Color
                  </label>
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stroke Color
                  </label>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>
            </>
          )}

          {/* Opacity Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity * 100}
              onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add Layer'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
