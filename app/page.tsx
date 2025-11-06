'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import BasemapSelector from '@/components/map/BasemapSelector';
import LayerPanel from '@/components/map/LayerPanel';
import ToolsPanel from '@/components/map/ToolsPanel';
import AddLayerDialog from '@/components/map/AddLayerDialog';
import MapAttribution from '@/components/map/MapAttribution';
import SpatialAnalysisPanel from '@/components/map/SpatialAnalysisPanel';
import AttributeTable from '@/components/map/AttributeTable';
import StylePanel from '@/components/map/StylePanel';
import HelpPanel from '@/components/map/HelpPanel';

// Lazy load ProjectManager (includes Prisma/database logic)
const ProjectManager = dynamic(() => import('@/components/map/ProjectManager'), {
  ssr: false,
  loading: () => <div className="text-sm text-gray-500">Loading...</div>
});
import { MapSource, getDefaultBasemap } from '@/lib/map/map-sources';
import { lineString, length, polygon, area } from '@turf/turf';
import { FileImporter } from '@/lib/services/fileImporter';
import { ImportProgress } from '@/lib/types/layer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDialog from '@/components/ui/ErrorDialog';
import { toast } from 'sonner';
import { sanitizeSearchQuery, sanitizeFileName } from '@/lib/utils/sanitize';

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [basemap, setBasemap] = useState<MapSource>(getDefaultBasemap());
  const [layers, setLayers] = useState<any[]>([]);
  const [isAddLayerDialogOpen, setIsAddLayerDialogOpen] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>(['Starting...']);
  const [drawingMode, setDrawingMode] = useState<'point' | 'line' | 'polygon' | 'measure-distance' | 'measure-area' | null>(null);
  const drawingModeRef = useRef<'point' | 'line' | 'polygon' | 'measure-distance' | 'measure-area' | null>(null);
  const [measurementResult, setMeasurementResult] = useState<string | null>(null);
  const [liveDistance, setLiveDistance] = useState<string | null>(null);
  const [liveArea, setLiveArea] = useState<string | null>(null);
  const measurementPoints = useRef<[number, number][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<{ title: string; message: string; details?: any } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const addLog = (msg: string) => {
    console.log('[DEBUG]', msg);
    setDebugLog(prev => [...prev, msg]);
  };

  useEffect(() => {
    addLog('useEffect triggered');
    addLog(`Map exists: ${!!map.current}`);
    addLog(`Container exists: ${!!mapContainer.current}`);

    if (map.current) {
      addLog('Map already exists, skipping init');
      return;
    }

    if (!mapContainer.current) {
      addLog('ERROR: Container not found!');
      return;
    }

    const tileUrl = basemap.tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    addLog(`Using tile URL: ${tileUrl}`);

    try {
      addLog('Creating MapLibre map...');
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: [tileUrl],
              tileSize: 256,
              attribution: basemap.attribution?.map(a => a.text).join(' | ') || '© OpenStreetMap',
            },
          },
          layers: [
            {
              id: 'raster-layer',
              type: 'raster',
              source: 'raster-tiles',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [10.7522, 59.9139],
        zoom: 12,
      });
      addLog('Map created successfully');

      map.current.on('load', () => {
        addLog('Map loaded event fired');
        addLog(`Map has ${map.current?.getStyle()?.layers?.length || 0} layers`);
        addLog(`Canvas size: ${map.current?.getCanvas().width}x${map.current?.getCanvas().height}`);

        // Force resize after a moment
        setTimeout(() => {
          addLog('Triggering resize...');
          map.current?.resize();
          addLog(`New canvas size: ${map.current?.getCanvas().width}x${map.current?.getCanvas().height}`);
        }, 100);
      });

      map.current.on('data', (e: any) => {
        if (e.dataType === 'source' && e.sourceDataType === 'metadata') {
          addLog(`Source loaded: ${e.sourceId}`);
        }
      });

      map.current.on('error', (e) => {
        addLog(`Map error: ${e.error?.message || JSON.stringify(e)}`);
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

      // Initialize MapboxDraw
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: 'simple_select', // Allow selecting and editing features
        styles: [
          // Point style
          {
            'id': 'gl-draw-point',
            'type': 'circle',
            'filter': ['all', ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
            'paint': {
              'circle-radius': 6,
              'circle-color': '#3b82f6'
            }
          },
          // Line style
          {
            'id': 'gl-draw-line',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#3b82f6',
              'line-width': 3
            }
          },
          // Polygon fill
          {
            'id': 'gl-draw-polygon-fill',
            'type': 'fill',
            'filter': ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            'paint': {
              'fill-color': '#3b82f6',
              'fill-opacity': 0.2
            }
          },
          // Polygon outline
          {
            'id': 'gl-draw-polygon-stroke',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#3b82f6',
              'line-width': 3
            }
          },
          // Vertices
          {
            'id': 'gl-draw-polygon-and-line-vertex-active',
            'type': 'circle',
            'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
            'paint': {
              'circle-radius': 5,
              'circle-color': '#fff',
              'circle-stroke-color': '#3b82f6',
              'circle-stroke-width': 2
            }
          }
        ]
      });

      map.current.addControl(draw.current as any);

      // Drawing event listeners
      map.current.on('draw.create', (e: any) => {
        addLog(`Feature created: ${e.features[0].geometry.type}`);
        handleDrawCreate(e.features[0]);
        setLiveDistance(null); // Clear live measurements
        setLiveArea(null);
      });

      map.current.on('draw.update', (e: any) => {
        const currentMode = drawingModeRef.current;
        const geomType = e.features[0]?.geometry?.type;
        addLog(`Feature updated: mode=${currentMode}, geom=${geomType}`);

        // Show live distance during line drawing
        if (currentMode === 'measure-distance' || currentMode === 'line') {
          const features = e.features;
          if (features.length > 0 && features[0].geometry.type === 'LineString') {
            const coords = features[0].geometry.coordinates;
            if (coords.length >= 2) {
              const line = lineString(coords);
              const lineLength = length(line, { units: 'kilometers' });
              const lengthMeters = lineLength * 1000;

              if (lengthMeters < 1000) {
                setLiveDistance(`${lengthMeters.toFixed(2)} m`);
              } else {
                setLiveDistance(`${lineLength.toFixed(2)} km`);
              }
            }
          }
        }

        // Show live area during polygon drawing
        if (currentMode === 'measure-area' || currentMode === 'polygon') {
          const features = e.features;
          if (features.length > 0 && features[0].geometry.type === 'Polygon') {
            const coords = features[0].geometry.coordinates;
            if (coords[0].length >= 4) { // Need at least 4 points (including closing point)
              try {
                const poly = polygon(coords);
                const polygonArea = area(poly);

                if (polygonArea < 10000) {
                  setLiveArea(`${polygonArea.toFixed(2)} m²`);
                } else if (polygonArea < 1000000) {
                  setLiveArea(`${(polygonArea / 10000).toFixed(2)} ha`);
                } else {
                  setLiveArea(`${(polygonArea / 1000000).toFixed(2)} km²`);
                }
              } catch (error) {
                // Polygon not valid yet
              }
            }
          }
        }
      });

      map.current.on('draw.delete', (e: any) => {
        addLog(`Feature deleted`);
        setMeasurementResult(null);
        setLiveDistance(null);
        setLiveArea(null);
      });

      map.current.on('draw.modechange', (e: any) => {
        addLog(`Draw mode changed to: ${e.mode}`);
        // Clear live measurements when mode changes
        if (e.mode === 'simple_select' || e.mode === 'direct_select') {
          setLiveDistance(null);
          setLiveArea(null);
          setDrawingMode(null);
          drawingModeRef.current = null;
        }
      });

      addLog('Controls added');
    } catch (error: any) {
      addLog(`EXCEPTION: ${error.message}`);
      console.error('Map creation error:', error);
    }

    return () => {
      addLog('Cleanup triggered');

      // Remove draw control before removing map
      if (draw.current && map.current) {
        try {
          map.current.removeControl(draw.current as any);
        } catch (error) {
          console.warn('Error removing draw control:', error);
        }
      }

      // Remove map and all associated event listeners
      map.current?.remove();

      // Clear refs
      map.current = null;
      draw.current = null;
    };
  }, []); // Empty dependency - only initialize once

  // Keyboard event handler for Escape key (separate useEffect to access current state)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawingMode) {
        setDrawingMode(null);
        drawingModeRef.current = null;
        setLiveDistance(null);
        setLiveArea(null);
        setMeasurementResult(null);
        if (draw.current) {
          draw.current.changeMode('simple_select');
        }
        addLog('Drawing cancelled with Escape key');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingMode]); // Re-attach listener when drawingMode changes

  const handleBasemapChange = (newBasemap: MapSource) => {
    addLog(`Changing basemap to: ${newBasemap.label}`);

    if (!map.current) {
      setBasemap(newBasemap);
      return;
    }

    // Change the basemap style while keeping layers
    const tileUrl = newBasemap.tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newStyle = {
      version: 8,
      sources: {
        'raster-tiles': {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          attribution: newBasemap.attribution?.map(a => a.text).join(' | ') || '© OpenStreetMap',
        },
      },
      layers: [
        {
          id: 'raster-layer',
          type: 'raster',
          source: 'raster-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };

    // Save current center and zoom
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();

    if (layers.length > 0) {
      addLog(`⚠️ Warning: ${layers.length} layers will be removed when changing basemap`);
      addLog('You will need to re-add your layers after basemap change');
    }

    // Set new style
    map.current.setStyle(newStyle as any);

    // Wait for style to load, then restore view
    map.current.once('styledata', () => {
      if (!map.current) return;

      addLog('New basemap loaded');

      // Restore center and zoom
      map.current.setCenter(center);
      map.current.setZoom(zoom);

      // Clear layers from state (they were removed with style change)
      setLayers([]);
      addLog('Layers cleared - please re-add them if needed');
    });

    setBasemap(newBasemap);
  };

  const handleAddLayer = () => {
    addLog('Opening add layer dialog');
    setIsAddLayerDialogOpen(true);
  };

  const handleAddLayerSubmit = (newLayer: any) => {
    addLog(`Layer added: ${newLayer.name}`);
    setLayers((prev) => [...prev, newLayer]);
  };

  const handleAnalysisComplete = (result: any) => {
    addLog(`Analysis complete: ${result.name}`);
    setLayers((prev) => [...prev, result]);
  };

  const handleProjectLoaded = (project: any) => {
    addLog(`Loading project: ${project.name}`);

    // Clear current state
    setLayers([]);

    // Set map view
    if (project.center && project.zoom && map.current) {
      map.current.setCenter(project.center);
      map.current.setZoom(project.zoom);
    }

    // Load basemap (simplified - would need basemap switching logic)
    // setBasemap(project.basemap);

    // Load layers
    if (project.layers && map.current) {
      project.layers.forEach((layer: any) => {
        if (layer.data) {
          try {
            // Add source
            map.current!.addSource(layer.id, {
              type: 'geojson',
              data: layer.data
            });

            // Add layer based on geometry type
            const firstFeature = layer.data.features?.[0];
            const geomType = firstFeature?.geometry?.type;

            if (geomType === 'Point' || geomType === 'MultiPoint') {
              map.current!.addLayer({
                id: layer.id,
                type: 'circle',
                source: layer.id,
                paint: {
                  'circle-radius': 6,
                  'circle-color': '#10b981',
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#fff'
                }
              });
            } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
              map.current!.addLayer({
                id: layer.id,
                type: 'line',
                source: layer.id,
                paint: {
                  'line-color': '#10b981',
                  'line-width': 3
                }
              });
            } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
              map.current!.addLayer({
                id: `${layer.id}-fill`,
                type: 'fill',
                source: layer.id,
                paint: {
                  'fill-color': '#10b981',
                  'fill-opacity': 0.3
                }
              });
              map.current!.addLayer({
                id: layer.id,
                type: 'line',
                source: layer.id,
                paint: {
                  'line-color': '#10b981',
                  'line-width': 2
                }
              });
            }

            setLayers((prev) => [...prev, layer]);
          } catch (error: any) {
            addLog(`Error loading layer ${layer.name}: ${error.message}`);
          }
        }
      });
    }
  };

  const handleLayerToggle = (layerId: string) => {
    addLog(`Toggling layer: ${layerId}`);
    const layer = layers.find(l => l.id === layerId);
    if (layer && map.current) {
      const newVisibility = !layer.visible;
      map.current.setLayoutProperty(layerId, 'visibility', newVisibility ? 'visible' : 'none');
      setLayers((prev) =>
        prev.map((l) =>
          l.id === layerId ? { ...l, visible: newVisibility } : l
        )
      );
    }
  };

  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    addLog(`Changing opacity for ${layerId}: ${opacity}`);
    if (map.current) {
      // Try to set paint property for different layer types
      try {
        map.current.setPaintProperty(layerId, 'raster-opacity', opacity);
      } catch {
        try {
          map.current.setPaintProperty(layerId, 'fill-opacity', opacity);
        } catch {
          try {
            map.current.setPaintProperty(layerId, 'line-opacity', opacity);
          } catch {}
        }
      }
      setLayers((prev) =>
        prev.map((layer) =>
          layer.id === layerId ? { ...layer, opacity } : layer
        )
      );
    }
  };

  const handleLayerRemove = (layerId: string) => {
    addLog(`Removing layer: ${layerId}`);
    if (map.current) {
      try {
        // Remove cluster-related layers if they exist
        // Note: MapLibre automatically removes event listeners when layers are removed
        if (map.current.getLayer(`${layerId}-clusters`)) {
          map.current.removeLayer(`${layerId}-clusters`);
        }

        if (map.current.getLayer(`${layerId}-cluster-count`)) {
          map.current.removeLayer(`${layerId}-cluster-count`);
        }

        // Remove polygon fill layer if it exists
        if (map.current.getLayer(`${layerId}-fill`)) {
          map.current.removeLayer(`${layerId}-fill`);
        }

        // Remove main layer
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }

        // Remove source (this also cleans up all associated event listeners)
        if (map.current.getSource(layerId)) {
          map.current.removeSource(layerId);
        }
      } catch (error) {
        addLog(`Error removing layer: ${error}`);
      }
    }
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId));
  };

  // Handle feature creation for measurements
  const handleDrawCreate = (feature: any) => {
    const currentMode = drawingModeRef.current;

    if (currentMode === 'measure-distance' && feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      addLog(`Line coords: ${coords.length} points, first=[${coords[0]}], last=[${coords[coords.length-1]}]`);

      const line = lineString(coords);
      const lineLength = length(line, { units: 'kilometers' });
      const lengthMeters = lineLength * 1000;

      addLog(`Calculated: ${lineLength} km = ${lengthMeters} m`);

      let resultText = '';
      if (lengthMeters < 1000) {
        resultText = `Distance: ${lengthMeters.toFixed(2)} m`;
      } else {
        resultText = `Distance: ${lineLength.toFixed(2)} km`;
      }

      setMeasurementResult(resultText);
      addLog(resultText);
    } else if (currentMode === 'measure-area' && feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates;
      addLog(`Polygon coords: ${coords[0].length} points`);

      const poly = polygon(coords);
      const polygonArea = area(poly);

      addLog(`Calculated area: ${polygonArea} m²`);

      let resultText = '';
      if (polygonArea < 10000) {
        resultText = `Area: ${polygonArea.toFixed(2)} m²`;
      } else if (polygonArea < 1000000) {
        resultText = `Area: ${(polygonArea / 10000).toFixed(2)} ha`;
      } else {
        resultText = `Area: ${(polygonArea / 1000000).toFixed(2)} km²`;
      }

      setMeasurementResult(resultText);
      addLog(resultText);
    }
  };

  // Tool handlers
  const handleDrawPoint = () => {
    if (!draw.current) return;
    addLog('Draw Point tool activated');
    setDrawingMode('point');
    drawingModeRef.current = 'point';
    setMeasurementResult(null);
    draw.current.changeMode('draw_point');
  };

  const handleDrawLine = () => {
    if (!draw.current) return;
    addLog('Draw Line tool activated');
    setDrawingMode('line');
    drawingModeRef.current = 'line';
    setMeasurementResult(null);
    draw.current.changeMode('draw_line_string');
  };

  const handleDrawPolygon = () => {
    if (!draw.current) return;
    addLog('Draw Polygon tool activated');
    setDrawingMode('polygon');
    drawingModeRef.current = 'polygon';
    setMeasurementResult(null);
    draw.current.changeMode('draw_polygon');
  };

  const handleMeasureDistance = () => {
    if (!draw.current) return;
    addLog('Measure Distance tool activated - Draw a line');
    setDrawingMode('measure-distance');
    drawingModeRef.current = 'measure-distance';
    setMeasurementResult(null);
    draw.current.changeMode('draw_line_string');
  };

  const handleMeasureArea = () => {
    if (!draw.current) return;
    addLog('Measure Area tool activated - Draw a polygon');
    setDrawingMode('measure-area');
    drawingModeRef.current = 'measure-area';
    setMeasurementResult(null);
    draw.current.changeMode('draw_polygon');
  };

  const handleSearch = async () => {
    addLog('Search tool activated');
    const queryRaw = prompt('Enter address or place name:');
    if (!queryRaw || !map.current) return;

    // Sanitize search query
    const query = sanitizeSearchQuery(queryRaw);
    if (!query) {
      toast.error('Invalid search query', { description: 'Please enter a valid search term' });
      return;
    }

    addLog(`Searching for: ${query}`);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const results = await response.json();

      if (results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        addLog(`Found: ${result.display_name}`);

        // Fly to location
        map.current.flyTo({
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
          .addTo(map.current);

      } else {
        addLog(`No results found for: ${query}`);
        toast.info('No results found', {
          description: 'Try a different search term or check your spelling'
        });
      }
    } catch (error: any) {
      addLog(`Search error: ${error.message}`);
      toast.error('Search failed', {
        description: 'Please check your internet connection and try again'
      });
    }
  };

  // Reusable file import logic
  const importFile = async (file: File) => {
    if (!map.current) return;

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Files must be smaller than 50MB'
      });
      return;
    }

    // Sanitize file name
    const safeFileName = sanitizeFileName(file.name);
    addLog(`Importing file: ${safeFileName}`);

    setIsLoading(true);
    setLoadingProgress(null);

    try {
        // Create importer with progress callback
        const importer = new FileImporter((progress) => {
          setLoadingProgress(progress);
          addLog(progress.message);
        });

        // Import file
        const result = await importer.importFile(file);

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Import failed');
        }

        const geojson = result.data;
        const metadata = result.metadata;

        // Add to map
        const layerId = `uploaded-${Date.now()}`;

        // Configure source with clustering for point data
        const sourceConfig: any = {
          type: 'geojson',
          data: geojson
        };

        // Enable clustering for point datasets with >100 features
        if ((metadata.geometryType === 'Point' || metadata.geometryType === 'MultiPoint') &&
            metadata.featureCount > 100) {
          sourceConfig.cluster = true;
          sourceConfig.clusterMaxZoom = 14; // Max zoom to cluster points on
          sourceConfig.clusterRadius = 50; // Radius of each cluster when clustering points
        }

        map.current.addSource(layerId, sourceConfig);

        // Add appropriate layer based on geometry type
        const geomType = metadata.geometryType;

        if (geomType === 'Point' || geomType === 'MultiPoint') {
          if (sourceConfig.cluster) {
            // Add cluster circle layer
            map.current.addLayer({
              id: `${layerId}-clusters`,
              type: 'circle',
              source: layerId,
              filter: ['has', 'point_count'],
              paint: {
                'circle-color': [
                  'step',
                  ['get', 'point_count'],
                  '#51bbd6', // Color for clusters with <100 points
                  100,
                  '#f1f075', // Color for clusters with <750 points
                  750,
                  '#f28cb1'  // Color for clusters with >=750 points
                ],
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  20,  // Size for clusters with <100 points
                  100,
                  30,  // Size for clusters with <750 points
                  750,
                  40   // Size for clusters with >=750 points
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff'
              }
            });

            // Add cluster count labels
            map.current.addLayer({
              id: `${layerId}-cluster-count`,
              type: 'symbol',
              source: layerId,
              filter: ['has', 'point_count'],
              layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 12
              },
              paint: {
                'text-color': '#ffffff'
              }
            });

            // Add unclustered point layer
            map.current.addLayer({
              id: layerId,
              type: 'circle',
              source: layerId,
              filter: ['!', ['has', 'point_count']],
              paint: {
                'circle-radius': 6,
                'circle-color': '#10b981',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff'
              }
            });

            // Add click handler to zoom into clusters
            map.current.on('click', `${layerId}-clusters`, (e) => {
              if (!map.current) return;
              const features = map.current.queryRenderedFeatures(e.point, {
                layers: [`${layerId}-clusters`]
              });
              const clusterId = features[0].properties.cluster_id;
              const source = map.current.getSource(layerId) as any;

              source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                if (err || !map.current) return;
                map.current.easeTo({
                  center: (features[0].geometry as any).coordinates,
                  zoom: zoom
                });
              });
            });

            // Change cursor on cluster hover
            map.current.on('mouseenter', `${layerId}-clusters`, () => {
              if (map.current) map.current.getCanvas().style.cursor = 'pointer';
            });
            map.current.on('mouseleave', `${layerId}-clusters`, () => {
              if (map.current) map.current.getCanvas().style.cursor = '';
            });

          } else {
            // No clustering for small datasets
            map.current.addLayer({
              id: layerId,
              type: 'circle',
              source: layerId,
              paint: {
                'circle-radius': 6,
                'circle-color': '#10b981',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff'
              }
            });
          }
        } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
          map.current.addLayer({
            id: layerId,
            type: 'line',
            source: layerId,
            paint: {
              'line-color': '#10b981',
              'line-width': 3
            }
          });
        } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
          map.current.addLayer({
            id: `${layerId}-fill`,
            type: 'fill',
            source: layerId,
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.3
            }
          });
          map.current.addLayer({
            id: layerId,
            type: 'line',
            source: layerId,
            paint: {
              'line-color': '#10b981',
              'line-width': 2
            }
          });
        }

        // Add popup on feature click
        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: '400px'
        });

        const showPopup = (e: any) => {
          if (!map.current) return;

          const features = e.features;
          if (!features || features.length === 0) return;

          const feature = features[0];
          const coordinates = e.lngLat;
          const properties = feature.properties;

          // Format properties as HTML
          let html = '<div style="max-height: 300px; overflow-y: auto;">';
          html += '<div style="font-weight: 600; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">Feature Properties</div>';

          if (properties && Object.keys(properties).length > 0) {
            html += '<table style="width: 100%; font-size: 13px;">';
            for (const [key, value] of Object.entries(properties)) {
              // Skip cluster-related properties
              if (key === 'cluster' || key === 'cluster_id' || key === 'point_count' || key === 'point_count_abbreviated') {
                continue;
              }
              html += `<tr style="border-bottom: 1px solid #f3f4f6;">`;
              html += `<td style="padding: 4px 8px 4px 0; font-weight: 500; color: #6b7280;">${key}:</td>`;
              html += `<td style="padding: 4px 0; color: #111827;">${value !== null && value !== undefined ? value : 'N/A'}</td>`;
              html += `</tr>`;
            }
            html += '</table>';
          } else {
            html += '<p style="color: #9ca3af; font-size: 13px;">No properties available</p>';
          }

          html += '</div>';

          popup.setLngLat(coordinates).setHTML(html).addTo(map.current);
        };

        // Add click handlers based on layer type
        if (geomType === 'Point' || geomType === 'MultiPoint') {
          // For clustered points, only add popup to unclustered points layer
          if (sourceConfig.cluster) {
            map.current.on('click', layerId, showPopup);
            map.current.on('mouseenter', layerId, () => {
              if (map.current) map.current.getCanvas().style.cursor = 'pointer';
            });
            map.current.on('mouseleave', layerId, () => {
              if (map.current) map.current.getCanvas().style.cursor = '';
            });
          } else {
            map.current.on('click', layerId, showPopup);
            map.current.on('mouseenter', layerId, () => {
              if (map.current) map.current.getCanvas().style.cursor = 'pointer';
            });
            map.current.on('mouseleave', layerId, () => {
              if (map.current) map.current.getCanvas().style.cursor = '';
            });
          }
        } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
          map.current.on('click', layerId, showPopup);
          map.current.on('mouseenter', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current.on('mouseleave', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });
        } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
          // For polygons, use the fill layer for clicks
          map.current.on('click', `${layerId}-fill`, showPopup);
          map.current.on('mouseenter', `${layerId}-fill`, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current.on('mouseleave', `${layerId}-fill`, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });
        }

        // Zoom to bounds
        if (metadata.bounds) {
          map.current.fitBounds(metadata.bounds, { padding: 50, duration: 1000 });
        }

        // Add to layers
        setLayers(prev => [...prev, {
          id: layerId,
          name: file.name,
          type: 'vector',
          geometryType: geomType,
          visible: true,
          opacity: 1,
          featureCount: metadata.featureCount,
          properties: metadata.properties,
          bounds: metadata.bounds
        }]);

      addLog(`✓ Successfully loaded: ${file.name} (${metadata.featureCount} features)`);

    } catch (error: any) {
      addLog(`✗ Error loading file: ${error.message}`);
      console.error('File upload error:', error);

      setError({
        title: 'File Import Failed',
        message: error.message || 'An unknown error occurred while importing the file.',
        details: error.details || error.stack
      });
    } finally {
      setIsLoading(false);
      setLoadingProgress(null);
    }
  };

  // Drag-and-drop handlers
  useEffect(() => {
    if (!mapContainer.current) return;

    const container = mapContainer.current;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set dragging to false if we're leaving the container itself
      if (e.target === container) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];

      // Check file extension
      const ext = file.name.toLowerCase().match(/\.(geojson|json|csv|shp|zip|kml|gpx)$/);
      if (!ext) {
        toast.error('Unsupported file type', {
          description: 'Please drop a GeoJSON, CSV, Shapefile (.zip), KML, or GPX file'
        });
        return;
      }

      await importFile(file);
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleUploadData = () => {
    addLog('Upload Data tool activated');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.geojson,.json,.csv,.shp,.zip,.kml,.gpx';
    input.multiple = false;

    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      await importFile(file);
    };

    input.click();
  };

  const handleExportData = () => {
    addLog('Export Data tool activated');

    if (!draw.current) {
      toast.error('Drawing tools not initialized', {
        description: 'Please refresh the page and try again'
      });
      return;
    }

    const features = draw.current.getAll();

    if (features.features.length === 0 && layers.length === 0) {
      toast.warning('No data to export', {
        description: 'Draw some features or add layers first'
      });
      return;
    }

    // Export drawn features as GeoJSON
    const dataStr = JSON.stringify(features, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `keymap-export-${new Date().toISOString().split('T')[0]}.geojson`;
    link.click();

    URL.revokeObjectURL(url);
    addLog(`Exported ${features.features.length} features`);
  };

  return (
    <main className="fixed inset-0 w-full h-full">
      {/* Map Container - Full screen */}
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{ backgroundColor: '#f0f0f0' }}
      />

      {/* Drag-and-Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[9998] bg-blue-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none border-4 border-dashed border-blue-500">
          <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4">
            <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-900">Drop your file here</p>
              <p className="text-sm text-gray-600 mt-1">Supports GeoJSON, CSV, Shapefile, KML, GPX</p>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel - Overlay, scrollable inside */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="bg-black/90 text-green-400 p-2 font-mono text-xs max-h-32 overflow-y-auto pointer-events-auto">
          <div className="font-bold mb-1">DEBUG LOG:</div>
          {debugLog.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>

      {/* UI Controls - Top Left */}
      <div className="absolute top-40 left-4 z-10 flex flex-col gap-2">
        <ProjectManager
          map={map.current}
          layers={layers}
          basemap={basemap}
          onProjectLoaded={handleProjectLoaded}
        />
        <ToolsPanel
          onDrawPoint={handleDrawPoint}
          onDrawLine={handleDrawLine}
          onDrawPolygon={handleDrawPolygon}
          onMeasureDistance={handleMeasureDistance}
          onMeasureArea={handleMeasureArea}
          onSearch={handleSearch}
          onUploadData={handleUploadData}
          onExportData={handleExportData}
        />
        <StylePanel
          layers={layers}
          map={map.current}
          onStyleApplied={() => addLog('Style applied')}
        />
        <SpatialAnalysisPanel
          layers={layers}
          map={map.current}
          onAnalysisComplete={handleAnalysisComplete}
        />
        <AttributeTable
          layers={layers}
          map={map.current}
        />
        <BasemapSelector
          currentBasemap={basemap}
          onBasemapChange={handleBasemapChange}
        />
        <LayerPanel
          layers={layers}
          onLayerToggle={handleLayerToggle}
          onLayerOpacityChange={handleLayerOpacityChange}
          onLayerRemove={handleLayerRemove}
          onAddLayer={handleAddLayer}
        />
      </div>

      {/* Title & Help - Top Right */}
      <div className="absolute top-40 right-4 z-10 flex flex-col gap-2">
        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            KeyMap
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Open Atlas Platform
          </p>
        </div>

        {/* Help Button */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg shadow-md border border-blue-500 transition-colors flex items-center gap-2 justify-center group"
          title="Open Help & Documentation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">Help</span>
        </button>
      </div>

      {/* Active Drawing Instructions - Top Center */}
      {drawingMode && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-lg shadow-xl border-2 border-white/30 min-w-[400px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {drawingMode === 'point' && '📍'}
                  {(drawingMode === 'line' || drawingMode === 'measure-distance') && '📏'}
                  {(drawingMode === 'polygon' || drawingMode === 'measure-area') && '⬛'}
                </span>
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-90 font-semibold">
                    {drawingMode === 'point' && 'Draw Point'}
                    {drawingMode === 'line' && 'Draw Line'}
                    {drawingMode === 'polygon' && 'Draw Polygon'}
                    {drawingMode === 'measure-distance' && 'Measure Distance'}
                    {drawingMode === 'measure-area' && 'Measure Area'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setDrawingMode(null);
                  drawingModeRef.current = null;
                  setLiveDistance(null);
                  setLiveArea(null);
                  setMeasurementResult(null);
                  if (draw.current) {
                    draw.current.changeMode('simple_select');
                  }
                }}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-semibold"
              >
                Cancel (ESC)
              </button>
            </div>

            <div className="bg-black/20 rounded p-3 text-sm">
              <div className="font-semibold mb-2">📖 Instructions:</div>
              {drawingMode === 'point' && (
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Click</strong> anywhere on the map to place a point</li>
                  <li>• Point will be created immediately</li>
                </ul>
              )}
              {(drawingMode === 'line' || drawingMode === 'measure-distance') && (
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Click</strong> to add points along the line</li>
                  <li>• <strong>Double-click</strong> to finish the line</li>
                  <li>• <strong>Press Enter</strong> to finish</li>
                  <li>• <strong>Press Escape</strong> to cancel</li>
                  <li>• Distance calculated when you finish</li>
                </ul>
              )}
              {(drawingMode === 'polygon' || drawingMode === 'measure-area') && (
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Click</strong> to add points around the perimeter</li>
                  <li>• <strong>Double-click</strong> to close and finish the polygon</li>
                  <li>• <strong>Press Enter</strong> to finish</li>
                  <li>• <strong>Press Escape</strong> to cancel</li>
                  <li>• Area calculated when you finish</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Measurement Result - Below Instructions */}
      {measurementResult && !drawingMode && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-10 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-green-400">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-xs uppercase tracking-wide opacity-90">Measurement Complete</div>
              <div className="text-lg font-bold">{measurementResult}</div>
            </div>
            <button
              onClick={() => {
                setMeasurementResult(null);
                if (draw.current) {
                  draw.current.deleteAll();
                }
              }}
              className="ml-2 px-2 py-1 bg-green-700 hover:bg-green-800 rounded text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Attribution - Bottom Right */}
      <MapAttribution
        attributions={basemap.attribution}
        position="bottom-right"
      />

      {/* Info Panel - Bottom Left */}
      <div className="absolute bottom-12 left-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-sm">
        <div className="text-xs text-gray-700 dark:text-gray-300">
          <p className="font-bold mb-2">🗺️ KeyMap - Professional GIS Platform</p>

          <div className="space-y-1">
            <p>💾 <strong>Projects:</strong> Save/load your work, export/import</p>
            <p>🎨 <strong>Styling:</strong> Choropleth maps, graduated symbols</p>
            <p>📂 <strong>Import:</strong> Shapefile, KML, GPX, CSV, GeoJSON</p>
            <p>⚡ <strong>Analysis:</strong> Buffer, intersection, union, difference</p>
            <p>📊 <strong>Table:</strong> View/filter/export attributes</p>
            <p>🎯 <strong>Tools:</strong> Draw, measure, search, geocode</p>
            <p>✏️ <strong>Edit:</strong> Click drawn features to reshape/move</p>
          </div>

          <p className="font-semibold mt-3 mb-1">Try this workflow:</p>
          <div className="text-[10px] space-y-1 opacity-90">
            <p>1. Upload Shapefile/CSV data</p>
            <p>2. Style → Choropleth map by attribute</p>
            <p>3. Analysis → Buffer features</p>
            <p>4. Table → Export results</p>
            <p>5. Projects → Save your work!</p>
          </div>
        </div>
      </div>

      {/* Add Layer Dialog */}
      <AddLayerDialog
        isOpen={isAddLayerDialogOpen}
        onClose={() => setIsAddLayerDialogOpen(false)}
        onAddLayer={handleAddLayerSubmit}
        map={map.current}
      />

      {/* Loading Spinner */}
      {isLoading && <LoadingSpinner progress={loadingProgress || undefined} />}

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={error !== null}
        title={error?.title || 'Error'}
        message={error?.message || 'An unknown error occurred'}
        details={error?.details}
        onClose={() => setError(null)}
      />

      {/* Help Panel */}
      <HelpPanel
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </main>
  );
}
