'use client';

import MapLibreMap from '@/components/map/MapLibreMap';

export default function MapTest() {
  return (
    <div className="w-screen h-screen">
      <MapLibreMap
        className="w-full h-full"
      />
    </div>
  );
}
