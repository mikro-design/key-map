# What's Actually Missing - The Heavy Lifting

## Current Reality: Lightweight Client-Only

**What we have:**
- React components rendering in browser
- All processing happens in main JavaScript thread
- No persistence (except localStorage - 5MB limit)
- No server
- No database
- No workers
- No caching
- No CDN

**What this means:**
- ❌ Can't handle files >50MB (browser memory limit)
- ❌ Can't process datasets >10k features without lag
- ❌ Can't share maps (no URLs to share)
- ❌ Can't collaborate (no real-time sync)
- ❌ Can't handle concurrent users (no backend)
- ❌ Can't persist projects (localStorage clears on cache clear)
- ❌ Can't scale (everything client-side)

## What's Missing for Production

### 1. Backend API (Critical - Nothing Works Without This)

**Current:** No backend. Everything client-side.

**Needed:**
```
backend/
├── api/
│   ├── auth/           # User authentication
│   ├── projects/       # CRUD for projects
│   ├── layers/         # Layer management
│   ├── uploads/        # File upload handling
│   ├── tiles/          # Tile generation
│   └── analysis/       # Server-side spatial ops
├── workers/
│   ├── tile-generator  # Convert uploads to tiles
│   ├── analyzer        # Heavy spatial analysis
│   └── importer        # Process large files
└── services/
    ├── storage         # S3/R2 for files
    ├── database        # PostGIS
    ├── cache           # Redis
    └── queue           # Job queue (BullMQ)
```

**Tech Stack:**
- **FastAPI** (Python) or **Fastify** (Node.js)
- **PostgreSQL + PostGIS** - Spatial database
- **Redis** - Caching + sessions
- **S3/R2** - File storage
- **BullMQ** - Job queue
- **Docker** - Containerization

**Why it matters:**
- Process 1GB files (stream to server, not browser)
- Handle 1M+ features (database queries, not browser memory)
- Multi-user support (sessions, auth)
- Background processing (tile generation, analysis)

**Estimated effort:** 4-6 weeks, 1 backend engineer

---

### 2. Database Layer (Critical)

**Current:** No database. Data lost on page refresh (localStorage ≠ database).

**Needed:**
```sql
-- PostgreSQL + PostGIS schema

CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  center GEOGRAPHY(POINT),
  zoom NUMERIC,
  basemap_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Layers
CREATE TABLE layers (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  style JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Features (for vector data)
CREATE TABLE features (
  id UUID PRIMARY KEY,
  layer_id UUID REFERENCES layers(id) ON DELETE CASCADE,
  geometry GEOGRAPHY(GEOMETRY, 4326) NOT NULL,
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spatial index for fast queries
CREATE INDEX features_geom_idx ON features USING GIST(geometry);

-- Tile cache
CREATE TABLE tiles (
  z INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  layer_id UUID REFERENCES layers(id),
  tile BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (z, x, y, layer_id)
);
```

**Queries we can now do:**
```sql
-- Find features within bounds (fast with spatial index)
SELECT id, properties, ST_AsGeoJSON(geometry)
FROM features
WHERE layer_id = $1
  AND ST_Intersects(
    geometry,
    ST_MakeEnvelope($2, $3, $4, $5, 4326)
  );

-- Spatial join (impossible in browser)
SELECT a.properties, b.properties
FROM features a
JOIN features b
  ON ST_Intersects(a.geometry, b.geometry)
WHERE a.layer_id = $1 AND b.layer_id = $2;

-- Buffer analysis (server-side, no UI freeze)
INSERT INTO features (layer_id, geometry, properties)
SELECT
  $2,  -- new layer id
  ST_Buffer(geometry::geography, $3)::geometry,
  properties
FROM features
WHERE layer_id = $1;
```

**Performance:**
- Current: 10k features = browser crash
- With PostGIS: 10M features = instant queries (spatial index)

**Estimated effort:** 2 weeks, 1 database engineer

---

### 3. Vector Tile Server (High Priority)

**Current:** Raster tiles (PNG images) - slow, pixelated, large files.

**Needed:** Vector tiles (MVT format) - fast, sharp, tiny files.

**Architecture:**
```
User requests tile →
  Tile server checks cache (Redis) →
    If cached: Return immediately
    If not cached:
      Query PostGIS for features in tile bounds →
      Convert to MVT (Mapbox Vector Tiles) →
      Compress (gzip) →
      Cache in Redis →
      Return to client

Client receives MVT →
  Decompress →
  Render with WebGL (GPU-accelerated) →
  Apply styles client-side
```

**Options:**
1. **pg_tileserv** - Auto-generates tiles from PostGIS
2. **Martin** - Rust-based tile server (fast)
3. **Tegola** - Go-based tile server
4. **Custom** - Build with FastAPI + PostGIS

**Example with Martin:**
```bash
# Start Martin tile server
martin postgres://user:pass@localhost/gis

# Serves tiles at:
# http://localhost:3000/{schema}.{table}/{z}/{x}/{y}.mvt
```

**Client-side (MapLibre):**
```typescript
map.addSource('my-layer', {
  type: 'vector',
  tiles: ['http://localhost:3000/public.features/{z}/{x}/{y}.mvt'],
  minzoom: 0,
  maxzoom: 14
});

map.addLayer({
  id: 'my-layer',
  type: 'fill',
  source: 'my-layer',
  'source-layer': 'features',
  paint: {
    'fill-color': ['get', 'color'],  // Data-driven!
    'fill-opacity': 0.8
  }
});
```

**Benefits:**
- 10-20x smaller file sizes
- GPU rendering (60fps with millions of features)
- Client-side styling
- Sharp at all zoom levels

**Estimated effort:** 1-2 weeks

---

### 4. Job Queue for Background Processing (Critical)

**Current:** All processing in browser main thread = UI freezes.

**Needed:** Background jobs for heavy operations.

**BullMQ Architecture:**
```typescript
// api/queues/analysis.queue.ts
import Queue from 'bullmq';

const analysisQueue = new Queue('analysis', {
  connection: { host: 'redis', port: 6379 }
});

// Add job to queue
export async function queueBufferAnalysis(layerId: string, distance: number) {
  const job = await analysisQueue.add('buffer', {
    layerId,
    distance,
    userId: req.user.id
  });

  return job.id;  // Return immediately, don't wait
}

// Worker processes jobs in background
// workers/analysis.worker.ts
const worker = new Worker('analysis', async (job) => {
  if (job.name === 'buffer') {
    const { layerId, distance } = job.data;

    // This runs in background, doesn't block API
    await db.query(`
      INSERT INTO features (layer_id, geometry)
      SELECT $1, ST_Buffer(geometry::geography, $2)::geometry
      FROM features
      WHERE layer_id = $3
    `, [newLayerId, distance, layerId]);

    // Notify user via WebSocket when complete
    io.to(job.data.userId).emit('analysis-complete', {
      jobId: job.id,
      resultLayerId: newLayerId
    });
  }
}, { connection: redis });
```

**User Experience:**
```
User clicks "Buffer 500m"
  → API adds job to queue, returns job ID immediately
  → User sees "Processing... 0%"
  → Worker picks up job
  → Progress updates: 25%, 50%, 75%
  → Worker completes
  → WebSocket notification
  → Client shows "Complete! View results →"
  → UI never froze
```

**Estimated effort:** 1 week

---

### 5. Spatial Indexing with RBush (Immediate Win)

**Current:** Linear search O(n) - slow.

**Needed:** Spatial index O(log n) - fast.

```typescript
// lib/services/spatialIndex.ts
import RBush from 'rbush';

interface IndexedFeature {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  feature: Feature;
}

export class SpatialIndex {
  private tree: RBush<IndexedFeature>;

  constructor() {
    this.tree = new RBush();
  }

  // Build index from GeoJSON
  load(geojson: FeatureCollection) {
    const items: IndexedFeature[] = geojson.features.map(feature => {
      const bbox = turf.bbox(feature);
      return {
        minX: bbox[0],
        minY: bbox[1],
        maxX: bbox[2],
        maxY: bbox[3],
        feature
      };
    });

    this.tree.load(items);  // Bulk load is faster
  }

  // Find features in viewport bounds
  search(bounds: [number, number, number, number]): Feature[] {
    const results = this.tree.search({
      minX: bounds[0],
      minY: bounds[1],
      maxX: bounds[2],
      maxY: bounds[3]
    });

    return results.map(r => r.feature);
  }

  // Find features near a point
  nearest(point: [number, number], n: number = 1): Feature[] {
    // RBush doesn't have built-in KNN, need to implement
    // or use rbush-knn package
  }
}

// Usage
const index = new SpatialIndex();
index.load(myGeoJSON);  // O(n log n) - do once

// Every map pan/zoom:
const visible = index.search(map.getBounds());  // O(log n + k)
// vs current: features.filter(isInBounds)  // O(n)

// 100k features:
// Current: 100,000 checks per pan
// With index: ~17 checks per pan
// 5,800x faster!
```

**Estimated effort:** 2-3 days

---

### 6. Web Workers for Non-Blocking Processing

**Current:** All analysis blocks UI thread.

**Needed:** Web Workers for heavy operations.

```typescript
// workers/analysis.worker.ts
import * as turf from '@turf/turf';

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'buffer') {
    const { geojson, distance, units } = data;

    // Heavy operation runs in background thread
    const buffered = turf.buffer(geojson, distance, { units });

    // Send result back to main thread
    self.postMessage({ type: 'buffer-complete', result: buffered });
  }

  if (type === 'intersection') {
    const { layer1, layer2 } = data;

    const results: Feature[] = [];

    // This would freeze UI if in main thread
    for (const f1 of layer1.features) {
      for (const f2 of layer2.features) {
        const intersection = turf.intersect(f1, f2);
        if (intersection) {
          results.push(intersection);
        }
      }
    }

    self.postMessage({ type: 'intersection-complete', result: results });
  }
};

// Main thread usage
// lib/services/analysisWorker.ts
export class AnalysisWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      new URL('../workers/analysis.worker.ts', import.meta.url)
    );
  }

  async buffer(geojson: FeatureCollection, distance: number): Promise<FeatureCollection> {
    return new Promise((resolve) => {
      this.worker.onmessage = (e) => {
        if (e.data.type === 'buffer-complete') {
          resolve(e.data.result);
        }
      };

      this.worker.postMessage({
        type: 'buffer',
        data: { geojson, distance, units: 'meters' }
      });
    });
  }
}

// Components use it
const worker = new AnalysisWorker();
const result = await worker.buffer(geojson, 500);
// UI stays responsive! No freezing!
```

**Estimated effort:** 3-4 days

---

### 7. State Management (Production Apps Need This)

**Current:** React useState scattered everywhere - hard to debug, no time travel, no persistence.

**Needed:** Proper state management.

**Zustand (recommended for simplicity):**
```typescript
// lib/stores/mapStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface MapState {
  // State
  layers: Layer[];
  selectedLayerId: string | null;
  map: maplibregl.Map | null;

  // Actions
  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setSelectedLayer: (id: string) => void;

  // Computed
  visibleLayers: () => Layer[];
}

export const useMapStore = create<MapState>()(
  persist(
    (set, get) => ({
      // Initial state
      layers: [],
      selectedLayerId: null,
      map: null,

      // Actions
      addLayer: (layer) => set((state) => ({
        layers: [...state.layers, layer]
      })),

      removeLayer: (id) => set((state) => ({
        layers: state.layers.filter(l => l.id !== id),
        selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId
      })),

      updateLayer: (id, updates) => set((state) => ({
        layers: state.layers.map(l =>
          l.id === id ? { ...l, ...updates } : l
        )
      })),

      setSelectedLayer: (id) => set({ selectedLayerId: id }),

      // Computed
      visibleLayers: () => get().layers.filter(l => l.visible)
    }),
    {
      name: 'keymap-storage',  // localStorage key
      partialize: (state) => ({  // Only persist these
        layers: state.layers
      })
    }
  )
);

// Usage in components
function LayerPanel() {
  const layers = useMapStore(state => state.layers);
  const removeLayer = useMapStore(state => state.removeLayer);

  return (
    <div>
      {layers.map(layer => (
        <div key={layer.id}>
          {layer.name}
          <button onClick={() => removeLayer(layer.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

**Benefits:**
- Centralized state
- Easy debugging
- Persistence built-in
- No prop drilling
- TypeScript support
- DevTools integration

**Estimated effort:** 1 week to refactor

---

### 8. Authentication & User Management

**Current:** None. Everyone anonymous.

**Needed:** User accounts, projects tied to users.

**Supabase Auth (easiest):**
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign up
async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  return { user: data.user, error };
}

// Sign in
async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  return { session: data.session, error };
}

// Get current user
async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Middleware to protect routes
export async function requireAuth(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}
```

**Database with RLS (Row Level Security):**
```sql
-- Only users can see their own projects
CREATE POLICY "Users can view own projects"
  ON projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only users can modify their own projects
CREATE POLICY "Users can modify own projects"
  ON projects
  FOR ALL
  USING (auth.uid() = user_id);
```

**Estimated effort:** 1 week

---

### 9. Real-Time Collaboration (Atlas.co's killer feature)

**Current:** None. No multi-user support.

**Needed:** WebSocket + CRDT for real-time sync.

**Architecture:**
```typescript
// Using Supabase Realtime or Socket.io

// Server broadcasts changes
io.to(projectId).emit('layer-added', {
  layer: newLayer,
  userId: user.id,
  timestamp: Date.now()
});

// Clients subscribe
supabase
  .channel(`project:${projectId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'layers',
    filter: `project_id=eq.${projectId}`
  }, (payload) => {
    // Update local state
    if (payload.eventType === 'INSERT') {
      addLayerToMap(payload.new);
    } else if (payload.eventType === 'DELETE') {
      removeLayerFromMap(payload.old.id);
    } else if (payload.eventType === 'UPDATE') {
      updateLayerOnMap(payload.new);
    }
  })
  .subscribe();

// Cursor tracking
socket.emit('cursor-move', { x, y, projectId });

socket.on('peer-cursor-move', ({ userId, x, y }) => {
  updateUserCursor(userId, x, y);
});
```

**What users see:**
- Other users' cursors in real-time
- Live layer additions/deletions
- Live style changes
- Conflict resolution (last-write-wins or CRDT)

**Estimated effort:** 3-4 weeks

---

## Total Missing Infrastructure

| Component | Complexity | Time | Team |
|-----------|-----------|------|------|
| Backend API | High | 4-6 weeks | 1 backend dev |
| PostGIS Database | Medium | 2 weeks | 1 backend dev |
| Vector Tile Server | Medium | 1-2 weeks | 1 backend dev |
| Job Queue | Medium | 1 week | 1 backend dev |
| Spatial Indexing (RBush) | Low | 2-3 days | 1 frontend dev |
| Web Workers | Low | 3-4 days | 1 frontend dev |
| State Management | Medium | 1 week | 1 frontend dev |
| Authentication | Medium | 1 week | 1 fullstack dev |
| Real-time Sync | High | 3-4 weeks | 2 fullstack devs |
| **TOTAL** | | **3-4 months** | **3-5 engineers** |

## Why It's "Lightweight"

**Current KeyMap:**
- 1 Next.js app
- Client-side only
- No infrastructure
- ~5,000 lines of code
- 1 developer

**Atlas.co / Felt:**
- Frontend app
- Backend API (multiple services)
- PostGIS database cluster
- Redis cache cluster
- S3/CDN for assets
- Tile server farm
- Job queue workers
- WebSocket server for real-time
- Auth service
- Monitoring (Datadog, Sentry)
- CI/CD pipelines
- ~500,000+ lines of code
- 10-50 developers
- $2-5M in cloud costs/year

**We're comparing a bicycle to a Formula 1 car.**

## What Should We Build Next?

**Option A: Quick Wins (1-2 weeks)**
1. Spatial indexing with RBush
2. Web Workers for analysis
3. State management with Zustand

**Option B: Backend Foundation (4-6 weeks)**
1. FastAPI backend
2. PostGIS database
3. Basic auth
4. Project persistence

**Option C: Full Production (3-4 months)**
Everything above + vector tiles + real-time + job queue

**Which direction?**
