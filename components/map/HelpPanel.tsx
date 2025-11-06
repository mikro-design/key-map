'use client';

import { useState } from 'react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  if (!isOpen) return null;

  const sections = {
    'getting-started': {
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Welcome to KeyMap</h3>
          <p className="text-gray-700">
            KeyMap is a powerful web-based GIS application for creating, editing, and analyzing geographic data.
            No installation required - everything runs in your browser.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Quick Start</h4>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Import your data using the &quot;Upload Data&quot; button or drag & drop files</li>
              <li>Use drawing tools to create new features</li>
              <li>Style your layers using the Style panel</li>
              <li>Perform spatial analysis on your data</li>
              <li>Export your work in multiple formats</li>
            </ol>
          </div>
        </div>
      )
    },
    'importing': {
      title: 'Importing Data',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Import Your Data</h3>

          <div className="space-y-3">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-gray-900">Drag & Drop</h4>
              <p className="text-gray-700 text-sm">
                Simply drag any supported file onto the map to import it instantly.
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-gray-900">Upload Button</h4>
              <p className="text-gray-700 text-sm">
                Click the &quot;Upload Data&quot; button in the toolbar to select a file from your computer.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Supported Formats</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><span className="font-mono bg-gray-200 px-2 py-1 rounded">.geojson / .json</span> - GeoJSON files</li>
              <li><span className="font-mono bg-gray-200 px-2 py-1 rounded">.csv</span> - CSV with latitude/longitude columns</li>
              <li><span className="font-mono bg-gray-200 px-2 py-1 rounded">.zip</span> - Zipped Shapefiles (must include .shp, .shx, .dbf)</li>
              <li><span className="font-mono bg-gray-200 px-2 py-1 rounded">.kml</span> - Keyhole Markup Language</li>
              <li><span className="font-mono bg-gray-200 px-2 py-1 rounded">.gpx</span> - GPS Exchange Format</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">📝 CSV Format Requirements</h4>
            <p className="text-yellow-800 text-sm mb-2">Your CSV file must include coordinate columns:</p>
            <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1">
              <li>Latitude column: <code className="bg-yellow-100 px-1">lat</code>, <code className="bg-yellow-100 px-1">latitude</code>, or <code className="bg-yellow-100 px-1">y</code></li>
              <li>Longitude column: <code className="bg-yellow-100 px-1">lon</code>, <code className="bg-yellow-100 px-1">lng</code>, <code className="bg-yellow-100 px-1">longitude</code>, or <code className="bg-yellow-100 px-1">x</code></li>
            </ul>
          </div>
        </div>
      )
    },
    'drawing': {
      title: 'Drawing Tools',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Features</h3>

          <div className="space-y-3">
            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">●</span>
                Draw Points
              </h4>
              <p className="text-gray-700 text-sm mt-2">
                Click &quot;Draw Point&quot; and click anywhere on the map to add point markers.
                Perfect for marking locations, landmarks, or POIs.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">—</span>
                Draw Lines
              </h4>
              <p className="text-gray-700 text-sm mt-2">
                Click &quot;Draw Line&quot; and click points along your route. Double-click to finish.
                Ideal for roads, trails, or routes.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">▢</span>
                Draw Polygons
              </h4>
              <p className="text-gray-700 text-sm mt-2">
                Click &quot;Draw Polygon&quot; and click points to define the boundary. Click the first point again or double-click to close.
                Great for zones, regions, or areas.
              </p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-2">💡 Pro Tips</h4>
            <ul className="list-disc list-inside text-purple-800 text-sm space-y-1">
              <li>Press <kbd className="bg-purple-100 px-2 py-1 rounded">Esc</kbd> to cancel drawing</li>
              <li>Click on existing features to select and edit them</li>
              <li>Use Delete key to remove selected features</li>
            </ul>
          </div>
        </div>
      )
    },
    'measurements': {
      title: 'Measurements',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Measure Distances & Areas</h3>

          <div className="space-y-3">
            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">📏 Measure Distance</h4>
              <p className="text-gray-700 text-sm mt-2 mb-2">
                Click &quot;Measure Distance&quot; and click points along your measurement path.
              </p>
              <div className="bg-gray-50 rounded p-2 text-sm text-gray-600">
                <strong>Live Feedback:</strong> Distance updates as you draw<br/>
                <strong>Units:</strong> Automatically shows meters (&lt;1km) or kilometers
              </div>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">📐 Measure Area</h4>
              <p className="text-gray-700 text-sm mt-2 mb-2">
                Click &quot;Measure Area&quot; and click points to define the boundary. Close the polygon to see the area.
              </p>
              <div className="bg-gray-50 rounded p-2 text-sm text-gray-600">
                <strong>Live Feedback:</strong> Area updates as you draw<br/>
                <strong>Units:</strong> Shows m², hectares, or km² depending on size
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Example Use Cases</h4>
            <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
              <li>Measure property boundaries</li>
              <li>Calculate walking/driving distances</li>
              <li>Estimate land area for development</li>
              <li>Plan hiking trails</li>
            </ul>
          </div>
        </div>
      )
    },
    'layers': {
      title: 'Layer Management',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Managing Layers</h3>

          <div className="space-y-3">
            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">👁️ Visibility</h4>
              <p className="text-gray-700 text-sm mt-2">
                Click the eye icon next to any layer to toggle its visibility on or off.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">🎨 Styling</h4>
              <p className="text-gray-700 text-sm mt-2">
                Use the Style panel to customize colors, sizes, and opacity for each layer.
                Click on a layer to open its style options.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">📊 Attributes</h4>
              <p className="text-gray-700 text-sm mt-2">
                Click &quot;View Table&quot; to see all feature attributes in a spreadsheet-like view.
                You can sort and filter the data.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">🗑️ Remove Layers</h4>
              <p className="text-gray-700 text-sm mt-2">
                Click the trash icon to remove a layer from the map. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">⚡ Performance Features</h4>
            <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
              <li><strong>Point Clustering:</strong> Large point datasets (&gt;100 features) automatically cluster for better performance</li>
              <li><strong>Click Clusters:</strong> Click any cluster to zoom in and see individual points</li>
              <li><strong>Color-Coded:</strong> Clusters change color based on density (blue → yellow → pink)</li>
            </ul>
          </div>
        </div>
      )
    },
    'analysis': {
      title: 'Spatial Analysis',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Analyze Your Data</h3>

          <p className="text-gray-700">
            The Spatial Analysis panel provides powerful GIS operations to extract insights from your data.
          </p>

          <div className="space-y-3">
            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">📍 Buffer</h4>
              <p className="text-gray-700 text-sm mt-2">
                Create zones around features at a specified distance.
                Example: 500m buffer around schools to identify nearby properties.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">🎯 Point in Polygon</h4>
              <p className="text-gray-700 text-sm mt-2">
                Find which polygon contains each point.
                Example: Determine which district each customer location falls within.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">✂️ Clip</h4>
              <p className="text-gray-700 text-sm mt-2">
                Cut one layer using another layer&apos;s boundary.
                Example: Extract only the roads within a city boundary.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">🔗 Union</h4>
              <p className="text-gray-700 text-sm mt-2">
                Combine multiple polygons into a single feature.
                Example: Merge adjacent parcels into a single property.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">➕ Intersection</h4>
              <p className="text-gray-700 text-sm mt-2">
                Find where two layers overlap.
                Example: Identify wetlands within protected areas.
              </p>
            </div>
          </div>
        </div>
      )
    },
    'popups': {
      title: 'Feature Popups',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Viewing Feature Data</h3>

          <div className="bg-white border rounded-lg p-3">
            <h4 className="font-semibold text-gray-900">🔍 Click to Inspect</h4>
            <p className="text-gray-700 text-sm mt-2 mb-3">
              Click any feature on the map to see its properties in a popup window.
            </p>
            <div className="bg-gray-50 rounded p-3 text-sm">
              <strong className="text-gray-900">What you&apos;ll see:</strong>
              <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                <li>All attribute data for that feature</li>
                <li>Property names and values</li>
                <li>Formatted as an easy-to-read table</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Example Popup Data</h4>
            <div className="bg-white rounded p-2 text-sm font-mono">
              <div className="border-b pb-1 mb-2 font-bold">Feature Properties</div>
              <div className="space-y-1 text-xs">
                <div className="flex"><span className="text-gray-600 w-24">Name:</span><span>Coffee Shop</span></div>
                <div className="flex"><span className="text-gray-600 w-24">Address:</span><span>123 Main St</span></div>
                <div className="flex"><span className="text-gray-600 w-24">Category:</span><span>Restaurant</span></div>
                <div className="flex"><span className="text-gray-600 w-24">Rating:</span><span>4.5</span></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    'export': {
      title: 'Exporting Data',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Export Your Work</h3>

          <p className="text-gray-700">
            Export your layers to use in other GIS software or share with colleagues.
          </p>

          <div className="space-y-3">
            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-gray-900">📥 Export Options</h4>
              <p className="text-gray-700 text-sm mt-2 mb-2">
                Click the export button on any layer to download it.
              </p>
              <div className="bg-gray-50 rounded p-2 text-sm">
                <strong>Available Formats:</strong>
                <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                  <li><strong>GeoJSON</strong> - Universal web-friendly format</li>
                  <li><strong>CSV</strong> - Spreadsheet compatible</li>
                  <li><strong>Shapefile</strong> - Industry standard (coming soon)</li>
                  <li><strong>KML</strong> - Google Earth compatible (coming soon)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">💾 Saving Projects</h4>
            <p className="text-green-800 text-sm">
              Use the Project Manager to save your entire workspace including all layers,
              styles, and settings. Projects can be loaded later to continue your work.
            </p>
          </div>
        </div>
      )
    },
    'basemaps': {
      title: 'Basemaps',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Changing Basemaps</h3>

          <div className="bg-white border rounded-lg p-3">
            <h4 className="font-semibold text-gray-900">🗺️ Choose Your Background</h4>
            <p className="text-gray-700 text-sm mt-2 mb-3">
              Click the basemap selector (usually top-left) to choose different background maps.
            </p>
            <div className="bg-gray-50 rounded p-2 text-sm">
              <strong>Available Basemaps:</strong>
              <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                <li><strong>OpenStreetMap</strong> - Detailed street map</li>
                <li><strong>Satellite</strong> - Aerial imagery</li>
                <li><strong>Terrain</strong> - Topographic view</li>
                <li><strong>Light/Dark</strong> - Minimalist styles</li>
              </ul>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Note</h4>
            <p className="text-yellow-800 text-sm">
              Changing basemaps will reload the map. Your layers will be preserved.
            </p>
          </div>
        </div>
      )
    },
    'shortcuts': {
      title: 'Keyboard Shortcuts',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between bg-gray-50 rounded p-2">
              <span className="text-gray-700">Cancel drawing</span>
              <kbd className="bg-gray-200 px-3 py-1 rounded text-sm font-mono">Esc</kbd>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded p-2">
              <span className="text-gray-700">Delete selected feature</span>
              <kbd className="bg-gray-200 px-3 py-1 rounded text-sm font-mono">Delete</kbd>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded p-2">
              <span className="text-gray-700">Zoom in</span>
              <kbd className="bg-gray-200 px-3 py-1 rounded text-sm font-mono">+</kbd>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded p-2">
              <span className="text-gray-700">Zoom out</span>
              <kbd className="bg-gray-200 px-3 py-1 rounded text-sm font-mono">-</kbd>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-900 mb-2">🖱️ Mouse Controls</h4>
            <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
              <li><strong>Left-click + drag:</strong> Pan the map</li>
              <li><strong>Scroll wheel:</strong> Zoom in/out</li>
              <li><strong>Right-click:</strong> Context menu (coming soon)</li>
              <li><strong>Double-click:</strong> Finish drawing lines/polygons</li>
            </ul>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">KeyMap Help & Documentation</h2>
            <p className="text-sm text-gray-600 mt-1">Learn how to use all the features</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close help"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r bg-gray-50 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {Object.entries(sections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeSection === key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {sections[activeSection as keyof typeof sections]?.content}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Need more help? Check out our{' '}
              <a href="https://github.com/yourusername/keymap" className="text-blue-600 hover:underline">
                GitHub repository
              </a>
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
