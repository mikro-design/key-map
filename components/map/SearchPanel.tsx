'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import maplibregl from 'maplibre-gl';
import { sanitizeSearchQuery } from '@/lib/utils/sanitize';

export interface SearchPanelProps {
  map: maplibregl.Map | null;
  onLog?: (msg: string) => void;
}

export default function SearchPanel({ map, onLog }: SearchPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleAddressSearch = async () => {
    if (!addressQuery.trim() || !map) return;

    const sanitized = sanitizeSearchQuery(addressQuery);
    if (!sanitized) {
      toast.error('Invalid search query', { description: 'Please enter a valid search term' });
      return;
    }

    setIsSearching(true);
    onLog?.(`Searching for: ${sanitized}`);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sanitized)}&limit=5`
      );
      const results = await response.json();

      if (results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        onLog?.(`Found: ${result.display_name}`);

        // Fly to location
        map.flyTo({
          center: [lon, lat],
          zoom: 14,
          duration: 2000
        });

        // Add a marker
        new maplibregl.Marker({ color: '#ef4444' })
          .setLngLat([lon, lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25 })
              .setHTML(`<div class="p-2"><strong>${result.display_name}</strong></div>`)
          )
          .addTo(map);

        toast.success('Location found', { description: result.display_name });
        setIsOpen(false);
        setAddressQuery('');
      } else {
        onLog?.(`No results found for: ${sanitized}`);
        toast.info('No results found', {
          description: 'Try a different search term or check your spelling'
        });
      }
    } catch (error: any) {
      onLog?.(`Search error: ${error.message}`);
      toast.error('Search failed', {
        description: 'Please check your internet connection and try again'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCoordinateSearch = () => {
    if (!latitude.trim() || !longitude.trim() || !map) {
      toast.error('Invalid coordinates', { description: 'Please enter both latitude and longitude' });
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      toast.error('Invalid coordinates', { description: 'Please enter valid numbers' });
      return;
    }

    if (lat < -90 || lat > 90) {
      toast.error('Invalid latitude', { description: 'Latitude must be between -90 and 90' });
      return;
    }

    if (lon < -180 || lon > 180) {
      toast.error('Invalid longitude', { description: 'Longitude must be between -180 and 180' });
      return;
    }

    onLog?.(`Going to coordinates: ${lat}, ${lon}`);

    // Fly to location
    map.flyTo({
      center: [lon, lat],
      zoom: 14,
      duration: 2000
    });

    // Add a marker
    new maplibregl.Marker({ color: '#3b82f6' })
      .setLngLat([lon, lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 })
          .setHTML(`<div class="p-2"><strong>Coordinates</strong><br/>Lat: ${lat.toFixed(6)}<br/>Lon: ${lon.toFixed(6)}</div>`)
      )
      .addTo(map);

    toast.success('Location found', { description: `${lat.toFixed(6)}, ${lon.toFixed(6)}` });
    setIsOpen(false);
    setLatitude('');
    setLongitude('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2"
        title="Search for location"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm font-medium">Search</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-96">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Search Location
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Address Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🏠 Search by Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addressQuery}
                    onChange={(e) => setAddressQuery(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleAddressSearch)}
                    placeholder="Enter city, address, or place name..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    disabled={isSearching}
                  />
                  <button
                    onClick={handleAddressSearch}
                    disabled={isSearching || !addressQuery.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isSearching ? 'Searching...' : 'Go'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Example: "Oslo", "Times Square, New York", "Eiffel Tower"
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">OR</span>
                </div>
              </div>

              {/* Coordinate Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🌍 Go to Coordinates
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleCoordinateSearch)}
                    placeholder="Latitude (e.g., 59.9139)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  />
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleCoordinateSearch)}
                    placeholder="Longitude (e.g., 10.7522)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  />
                  <button
                    onClick={handleCoordinateSearch}
                    disabled={!latitude.trim() || !longitude.trim()}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Go to Coordinates
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Latitude: -90 to 90 | Longitude: -180 to 180
                </p>
              </div>

              {/* Current Location Button */}
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        setLatitude(lat.toString());
                        setLongitude(lon.toString());
                        toast.success('Location detected', { description: 'Coordinates filled in' });
                      },
                      (error) => {
                        toast.error('Location access denied', { description: 'Please enable location access in your browser' });
                      }
                    );
                  } else {
                    toast.error('Geolocation not supported', { description: 'Your browser does not support geolocation' });
                  }
                }}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use My Current Location
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
