# KeyMap - Open Atlas Mapping Platform

A modern, open-source mapping platform built with Next.js, MapLibre GL, and Supabase. Supports outdoor/indoor mapping, multiple basemap providers, and custom data overlays.

## Features

### 🗺️ Multiple Basemap Sources
- **Street Maps**: OpenStreetMap-based vector tiles (MapTiler, OpenMapTiles)
- **Satellite Imagery**: Esri World Imagery, MapTiler Satellite
- **Specialized Maps**: CARTO Positron/Dark Matter, Stamen Toner/Terrain, USGS Topographic
- Easy basemap switching with attribution management

### 🏢 Indoor Mapping
- Image overlay support (georeferenced floor plans)
- Vector overlay support (GeoJSON)
- Multi-floor level management
- Opacity and visibility controls

### 🌐 Remote Data Sources
- WMS (Web Map Service) support
- WMTS (Web Map Tile Service) support
- XYZ tile server support
- Remote GeoJSON loading
- Built-in CORS proxy

### 🎨 Modern UI
- Responsive basemap selector
- Layer management panel
- Attribution display
- Dark mode support

### ☁️ Supabase Integration
- File storage for floor plans and custom tiles
- Database for map configurations
- Authentication ready

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (optional, for storage features)
- MapTiler API key (optional, for premium basemaps)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/key-map.git
cd key-map
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:
- Supabase URL and keys
- MapTiler API key (get free key at https://www.maptiler.com/)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
key-map/
├── app/
│   ├── api/
│   │   └── proxy/          # CORS proxy for remote sources
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── map/
│       ├── MapLibreMap.tsx      # Core map component
│       ├── BasemapSelector.tsx  # Basemap picker UI
│       ├── LayerPanel.tsx       # Layer management UI
│       └── MapAttribution.tsx   # Attribution display
├── lib/
│   ├── map/
│   │   ├── map-sources.ts       # Basemap configurations
│   │   ├── indoor-overlays.ts   # Indoor mapping utilities
│   │   └── remote-sources.ts    # Remote source management
│   └── supabase/
│       ├── client.ts            # Client-side Supabase
│       └── server.ts            # Server-side Supabase
└── public/
```

## Usage Examples

### Basic Map

```tsx
import MapLibreMap from '@/components/map/MapLibreMap';

export default function MyMap() {
  return (
    <MapLibreMap
      initialCenter={[10.7522, 59.9139]}
      initialZoom={12}
      apiKeys={{ maptiler: process.env.NEXT_PUBLIC_MAPTILER_KEY }}
      className="w-full h-screen"
    />
  );
}
```

### With Basemap Selector

```tsx
'use client';

import { useState } from 'react';
import MapLibreMap from '@/components/map/MapLibreMap';
import BasemapSelector from '@/components/map/BasemapSelector';
import { getDefaultBasemap, MapSource } from '@/lib/map/map-sources';

export default function InteractiveMap() {
  const [basemap, setBasemap] = useState<MapSource>(getDefaultBasemap());

  return (
    <div className="relative w-full h-screen">
      <MapLibreMap
        initialBasemap={basemap}
        apiKeys={{ maptiler: process.env.NEXT_PUBLIC_MAPTILER_KEY }}
      />
      <div className="absolute top-4 left-4 z-10">
        <BasemapSelector
          currentBasemap={basemap}
          onBasemapChange={setBasemap}
        />
      </div>
    </div>
  );
}
```

### Adding Indoor Floor Plan

```tsx
import { addImageOverlay } from '@/lib/map/indoor-overlays';

// After map loads:
const overlay = {
  type: 'image' as const,
  levelId: 'floor-1',
  levelName: 'Ground Floor',
  imageUrl: '/floorplans/floor-1.png',
  coordinates: [
    [10.750, 59.913],
    [10.760, 59.913],
    [10.760, 59.905],
    [10.750, 59.905]
  ],
  opacity: 0.8
};

addImageOverlay(map, overlay);
```

## Map Sources

### Included Basemaps

| Provider | Type | License | Self-Hostable |
|----------|------|---------|---------------|
| OpenMapTiles (MapTiler) | Vector | ODbL | ✅ |
| CARTO Positron/Dark Matter | Raster | CC-BY-4.0 | ❌ |
| Esri World Imagery | Raster | Free view-only | ❌ |
| Stamen Toner/Terrain | Raster | CC-BY-4.0 | ❌ |

### Self-Hosting

To self-host vector tiles:

1. Generate MBTiles using [OpenMapTiles](https://github.com/openmaptiles/openmaptiles)
2. Serve with [TileServer GL](https://github.com/maptiler/tileserver-gl):

```bash
docker run -d -p 8080:80 \
  -v $(pwd)/tiles.mbtiles:/data/tiles.mbtiles \
  maptiler/tileserver-gl
```

3. Update map source to point to `http://localhost:8080/styles/bright/style.json`

## Configuration

### Adding Custom Basemaps

Edit `lib/map/map-sources.ts`:

```typescript
export const CUSTOM_BASEMAPS: MapSource[] = [
  {
    id: 'my-custom-map',
    label: 'My Custom Map',
    type: 'raster',
    tileUrl: 'https://tiles.example.com/{z}/{x}/{y}.png',
    license: 'Custom',
    attribution: [{ text: '© My Company', required: true }],
    selfHostable: true,
  }
];
```

### Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Create a storage bucket for floor plans:

```sql
-- Create bucket
insert into storage.buckets (id, name, public) values ('floorplans', 'floorplans', true);

-- Set up RLS policies
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'floorplans' );
```

3. Add credentials to `.env.local`

## API Routes

### `/api/proxy`

Proxies external tile/data requests to avoid CORS issues.

**Usage:**
```
GET /api/proxy?url=https://external-service.com/tiles/1/2/3.png
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [MapLibre GL JS](https://maplibre.org/) - Open-source map rendering
- [OpenStreetMap](https://www.openstreetmap.org/) - Map data
- [MapTiler](https://www.maptiler.com/) - High-quality basemaps
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## Support

- Documentation: [OpenAtlas Specification](docs/specification.md)
- Issues: [GitHub Issues](https://github.com/yourusername/key-map/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/key-map/discussions)

## Roadmap

- [ ] 3D terrain visualization
- [ ] Time-series layer support
- [ ] Offline mode (PWA)
- [ ] Collaborative editing
- [ ] Advanced search and geocoding
- [ ] Custom drawing tools
- [ ] Export to various formats
