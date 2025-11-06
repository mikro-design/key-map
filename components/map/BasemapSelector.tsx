'use client';

import { useState } from 'react';
import {
  MapSource,
  BASEMAP_CATEGORIES,
  BasemapCategory,
} from '@/lib/map/map-sources';

export interface BasemapSelectorProps {
  currentBasemap: MapSource;
  onBasemapChange: (basemap: MapSource) => void;
  className?: string;
}

export default function BasemapSelector({
  currentBasemap,
  onBasemapChange,
  className = '',
}: BasemapSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('outdoor');

  const handleBasemapSelect = (basemap: MapSource) => {
    onBasemapChange(basemap);
    setIsOpen(false);
  };

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
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <span className="text-sm font-medium">{currentBasemap.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-80 max-h-96 overflow-hidden">
            {/* Category Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {BASEMAP_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* Basemap List */}
            <div className="overflow-y-auto max-h-80">
              {BASEMAP_CATEGORIES.find((c) => c.id === selectedCategory)?.sources.map(
                (basemap) => (
                  <button
                    key={basemap.id}
                    onClick={() => handleBasemapSelect(basemap)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      currentBasemap.id === basemap.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {basemap.label}
                        </div>
                        {basemap.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {basemap.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {basemap.type}
                          </span>
                          {basemap.selfHostable && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                              Self-hostable
                            </span>
                          )}
                        </div>
                      </div>
                      {currentBasemap.id === basemap.id && (
                        <svg
                          className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
