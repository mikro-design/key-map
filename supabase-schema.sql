-- KeyMap Supabase Database Schema
--
-- This file contains the SQL schema for setting up your Supabase database
-- Run this in your Supabase SQL Editor to set up the necessary tables
--
-- To use:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire file
-- 5. Run the query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- STORAGE BUCKETS
-- ==============================================================================

-- Create bucket for floor plans and indoor maps
INSERT INTO storage.buckets (id, name, public)
VALUES ('floorplans', 'floorplans', true)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for custom tiles
INSERT INTO storage.buckets (id, name, public)
VALUES ('tiles', 'tiles', true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- STORAGE POLICIES
-- ==============================================================================

-- Allow public read access to floorplans
CREATE POLICY "Public Access to Floorplans"
ON storage.objects FOR SELECT
USING (bucket_id = 'floorplans');

-- Allow authenticated users to upload floorplans
CREATE POLICY "Authenticated Upload to Floorplans"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'floorplans'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own floorplans
CREATE POLICY "Authenticated Delete Own Floorplans"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'floorplans'
  AND auth.role() = 'authenticated'
);

-- Allow public read access to tiles
CREATE POLICY "Public Access to Tiles"
ON storage.objects FOR SELECT
USING (bucket_id = 'tiles');

-- ==============================================================================
-- TABLES
-- ==============================================================================

-- Buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  center_lng DOUBLE PRECISION NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Floor levels table
CREATE TABLE IF NOT EXISTS floor_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  level INTEGER NOT NULL, -- e.g., -1 for basement, 0 for ground, 1 for first floor
  name VARCHAR(100) NOT NULL, -- e.g., "Basement", "Ground Floor"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(building_id, level)
);

-- Floor plan overlays table
CREATE TABLE IF NOT EXISTS floor_plan_overlays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_level_id UUID NOT NULL REFERENCES floor_levels(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'vector')),
  file_path TEXT NOT NULL, -- Path in Supabase storage or URL
  coordinates JSONB, -- For image overlays: [[lng,lat],[lng,lat],[lng,lat],[lng,lat]]
  geojson JSONB, -- For vector overlays
  opacity DOUBLE PRECISION DEFAULT 0.8,
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Remote sources table
CREATE TABLE IF NOT EXISTS remote_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('wms', 'wmts', 'xyz', 'geojson')),
  url TEXT NOT NULL,
  layers TEXT, -- For WMS
  format VARCHAR(50), -- For WMS
  attribution TEXT,
  opacity DOUBLE PRECISION DEFAULT 1.0,
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Map configurations table (save/load map states)
CREATE TABLE IF NOT EXISTS map_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  center_lng DOUBLE PRECISION NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  zoom DOUBLE PRECISION DEFAULT 12,
  basemap_id VARCHAR(100),
  layers JSONB, -- Array of layer configurations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indoor features table (points of interest, rooms, etc.)
CREATE TABLE IF NOT EXISTS indoor_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_level_id UUID NOT NULL REFERENCES floor_levels(id) ON DELETE CASCADE,
  name VARCHAR(255),
  type VARCHAR(50), -- e.g., 'room', 'hallway', 'stairwell', 'elevator', 'poi'
  geometry JSONB NOT NULL, -- GeoJSON geometry
  properties JSONB, -- Custom properties
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_buildings_location ON buildings(center_lng, center_lat);
CREATE INDEX IF NOT EXISTS idx_floor_levels_building_id ON floor_levels(building_id);
CREATE INDEX IF NOT EXISTS idx_floor_plan_overlays_floor_level_id ON floor_plan_overlays(floor_level_id);
CREATE INDEX IF NOT EXISTS idx_remote_sources_user_id ON remote_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_map_configurations_user_id ON map_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_indoor_features_floor_level_id ON indoor_features(floor_level_id);
CREATE INDEX IF NOT EXISTS idx_indoor_features_type ON indoor_features(type);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plan_overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE indoor_features ENABLE ROW LEVEL SECURITY;

-- Buildings policies
CREATE POLICY "Public can view buildings"
  ON buildings FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own buildings"
  ON buildings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buildings"
  ON buildings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own buildings"
  ON buildings FOR DELETE
  USING (auth.uid() = user_id);

-- Floor levels policies (inherit from buildings)
CREATE POLICY "Public can view floor levels"
  ON floor_levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = floor_levels.building_id
    )
  );

CREATE POLICY "Building owners can manage floor levels"
  ON floor_levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = floor_levels.building_id
      AND buildings.user_id = auth.uid()
    )
  );

-- Floor plan overlays policies
CREATE POLICY "Public can view floor plan overlays"
  ON floor_plan_overlays FOR SELECT
  USING (true);

CREATE POLICY "Floor level owners can manage overlays"
  ON floor_plan_overlays FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM floor_levels
      JOIN buildings ON buildings.id = floor_levels.building_id
      WHERE floor_levels.id = floor_plan_overlays.floor_level_id
      AND buildings.user_id = auth.uid()
    )
  );

-- Remote sources policies
CREATE POLICY "Public can view remote sources"
  ON remote_sources FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own remote sources"
  ON remote_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own remote sources"
  ON remote_sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own remote sources"
  ON remote_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Map configurations policies
CREATE POLICY "Users can view their own map configurations"
  ON map_configurations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own map configurations"
  ON map_configurations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own map configurations"
  ON map_configurations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own map configurations"
  ON map_configurations FOR DELETE
  USING (auth.uid() = user_id);

-- Indoor features policies
CREATE POLICY "Public can view indoor features"
  ON indoor_features FOR SELECT
  USING (true);

CREATE POLICY "Floor level owners can manage indoor features"
  ON indoor_features FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM floor_levels
      JOIN buildings ON buildings.id = floor_levels.building_id
      WHERE floor_levels.id = indoor_features.floor_level_id
      AND buildings.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- FUNCTIONS
-- ==============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floor_levels_updated_at
  BEFORE UPDATE ON floor_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floor_plan_overlays_updated_at
  BEFORE UPDATE ON floor_plan_overlays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remote_sources_updated_at
  BEFORE UPDATE ON remote_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_map_configurations_updated_at
  BEFORE UPDATE ON map_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indoor_features_updated_at
  BEFORE UPDATE ON indoor_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- VIEWS
-- ==============================================================================

-- View for all floor plans with building info
CREATE OR REPLACE VIEW floor_plans_with_buildings AS
SELECT
  fpo.id,
  fpo.type,
  fpo.file_path,
  fpo.coordinates,
  fpo.opacity,
  fpo.visible,
  fl.level,
  fl.name AS floor_name,
  b.id AS building_id,
  b.name AS building_name,
  b.center_lng,
  b.center_lat
FROM floor_plan_overlays fpo
JOIN floor_levels fl ON fpo.floor_level_id = fl.id
JOIN buildings b ON fl.building_id = b.id;

-- ==============================================================================
-- SAMPLE DATA (Optional - comment out if not needed)
-- ==============================================================================

-- Insert a sample building
-- INSERT INTO buildings (name, address, center_lng, center_lat, user_id)
-- VALUES ('Sample Building', '123 Main St, Oslo', 10.7522, 59.9139, auth.uid());

-- ==============================================================================
-- DONE!
-- ==============================================================================

-- Your KeyMap database is now ready to use!
-- Next steps:
-- 1. Test by inserting some sample data
-- 2. Configure your storage buckets in the Supabase dashboard
-- 3. Update your .env.local file with your Supabase credentials
-- 4. Start building!
