'use client';

import { useState } from 'react';

export interface Layer {
  id: string;
  name: string;
  type: string; // Can be 'indoor', 'overlay', 'remote', 'vector', 'analysis-result', etc.
  visible: boolean;
  opacity: number;
  geometryType?: string;
  featureCount?: number;
  properties?: string[];
  bounds?: [number, number, number, number];
}

export interface LayerPanelProps {
  layers: Layer[];
  onLayerToggle: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerRemove: (layerId: string) => void;
  onAddLayer: () => void;
  className?: string;
}

export default function LayerPanel({
  layers,
  onLayerToggle,
  onLayerOpacityChange,
  onLayerRemove,
  onAddLayer,
  className = '',
}: LayerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
        <span className="text-sm font-medium">Layers</span>
        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded">
          {layers.filter((l) => l.visible).length}
        </span>
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Panel Content */}
          <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-96">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Layer Management
              </h3>
              <button
                onClick={onAddLayer}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                + Add Layer
              </button>
            </div>

            {/* Layer List */}
            <div className="max-h-96 overflow-y-auto">
              {layers.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                  <p className="text-sm">No layers added</p>
                  <button
                    onClick={onAddLayer}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Add your first layer
                  </button>
                </div>
              ) : (
                layers.map((layer) => (
                  <div
                    key={layer.id}
                    className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    {/* Layer Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={layer.visible}
                          onChange={() => onLayerToggle(layer.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {layer.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {layer.type}
                            {layer.geometryType && ` • ${layer.geometryType}`}
                            {layer.featureCount && ` • ${layer.featureCount} features`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onLayerRemove(layer.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Opacity Slider */}
                    {layer.visible && (
                      <div className="flex items-center gap-2 pl-6">
                        <label className="text-xs text-gray-600 dark:text-gray-400 w-16">
                          Opacity:
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={layer.opacity * 100}
                          onChange={(e) =>
                            onLayerOpacityChange(
                              layer.id,
                              parseInt(e.target.value) / 100
                            )
                          }
                          className="flex-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-8">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
