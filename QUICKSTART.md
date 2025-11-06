# KeyMap Quick Start Guide

Get KeyMap running in under 5 minutes!

## Prerequisites

- Node.js 18+ installed
- A code editor (VS Code recommended)

## Installation

1. **Navigate to the project directory:**
```bash
cd key-map
```

2. **Install dependencies** (already done if you see `node_modules/`):
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Optional: Add MapTiler API key for premium basemaps (get free key at maptiler.com)
NEXT_PUBLIC_MAPTILER_KEY=your_key_here

# Optional: Supabase credentials (for file storage features)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Note:** The app works without API keys, but will be limited to free raster basemaps.

4. **Run the development server:**
```bash
npm run dev
```

5. **Open your browser:**

Visit [http://localhost:3000](http://localhost:3000)

You should see an interactive map with:
- **Basemap selector** (top-left) - Switch between different map styles
- **Layer panel** (top-left) - Manage map layers
- **Attribution** (bottom-right) - Required credits for map data

## What's Included

### ✅ Ready to Use (No Setup Required)

- **OpenStreetMap basemaps** via CARTO (Positron, Dark Matter)
- **Satellite imagery** via Esri
- **Stamen maps** (Toner, Terrain)
- **Basemap switching** UI
- **Layer management** panel
- **Attribution display**
- **Map controls** (zoom, compass)
- **Scale indicator**

### 🔑 Requires API Key

- **MapTiler vector tiles** (Streets, Bright, Hybrid)
- Get free key at: https://cloud.maptiler.com/auth/widget

### ☁️ Requires Supabase Setup

- **File upload/storage** for floor plans
- **Database** for map configurations
- Sign up at: https://supabase.com

## Quick Feature Test

### 1. Switch Basemaps

1. Click **Basemap selector** (top-left button with map icon)
2. Browse categories: Street Maps, Satellite, Specialized
3. Click any basemap to switch
4. Notice attribution updates automatically

### 2. Open Layer Panel

1. Click **Layers** button
2. Panel shows current layers (empty initially)
3. Click **+ Add Layer** for placeholder (full implementation coming soon)

### 3. Use Map Controls

- **Zoom:** Mouse wheel or +/- buttons (top-right)
- **Pan:** Click and drag
- **Rotate:** Right-click and drag or use compass (top-right)
- **Tilt:** Ctrl + drag (not enabled by default)

## Next Steps

### Add MapTiler API Key (Recommended)

1. Get free API key: https://cloud.maptiler.com/auth/widget
2. Add to `.env.local`:
```env
NEXT_PUBLIC_MAPTILER_KEY=your_key_here
```
3. Restart dev server
4. Now you can use high-quality vector basemaps!

### Set Up Supabase (Optional)

1. Create account: https://supabase.com
2. Create new project
3. Go to Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Add to `.env.local` and restart

### Explore the Code

#### Core Files

```
key-map/
├── app/page.tsx                    # Main map demo page
├── components/map/
│   ├── MapLibreMap.tsx            # Core map component
│   ├── BasemapSelector.tsx        # Basemap picker
│   ├── LayerPanel.tsx             # Layer management
│   └── MapAttribution.tsx         # Attribution display
├── lib/map/
│   ├── map-sources.ts             # 🔧 Basemap configurations
│   ├── indoor-overlays.ts         # Indoor mapping utilities
│   └── remote-sources.ts          # WMS/WMTS/XYZ support
└── docs/examples.md               # Code examples
```

#### Customize Basemaps

Edit `lib/map/map-sources.ts` to:
- Add custom tile sources
- Change default basemap
- Modify attribution text
- Configure self-hosted tiles

See [docs/examples.md](docs/examples.md) for code examples.

## Common Issues

### Map not loading?

1. Check browser console for errors
2. Verify Node.js version: `node --version` (should be 18+)
3. Try clearing cache: `rm -rf .next && npm run dev`

### Basemaps showing errors?

- Some basemaps require API keys (MapTiler, Mapbox)
- Free basemaps (CARTO, Esri) work without keys
- Check `.env.local` for correct key format

### Attribution not showing?

- Normal! It only shows for the active basemap
- Check bottom-right corner of map
- Different sources have different attributions

## Learn More

- 📖 [Full Documentation](README.md)
- 💡 [Code Examples](docs/examples.md)
- 🗺️ [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- 🎨 [Basemap Customization](lib/map/map-sources.ts)

## Build for Production

```bash
# Build optimized production bundle
npm run build

# Test production build locally
npm start

# Deploy to Vercel
npx vercel
```

## Need Help?

- Check [examples.md](docs/examples.md) for code samples
- Review [README.md](README.md) for detailed documentation
- Open an issue on GitHub
- Read MapLibre docs: https://maplibre.org

---

**Happy Mapping! 🗺️**
