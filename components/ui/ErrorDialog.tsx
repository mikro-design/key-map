'use client';

export interface ErrorDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: any;
  onClose: () => void;
}

export default function ErrorDialog({ isOpen, title, message, details, onClose }: ErrorDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {message}
          </p>

          {details && (
            <div className="mt-4">
              <button
                onClick={() => {
                  const detailsEl = document.getElementById('error-details');
                  if (detailsEl) {
                    detailsEl.classList.toggle('hidden');
                  }
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-2"
              >
                Show technical details
              </button>

              <div id="error-details" className="hidden">
                <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 mt-2">
                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-auto max-h-48">
                    {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Helpful suggestions */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
              Troubleshooting Tips:
            </p>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Check that your file is not corrupted</li>
              <li>Ensure the file format is supported (GeoJSON, Shapefile, KML, GPX, CSV)</li>
              <li>For CSV files, make sure you have lat/lon or latitude/longitude columns</li>
              <li>For Shapefiles, upload as a .zip containing all files (.shp, .dbf, .shx, .prj)</li>
              <li>Try opening the file in a GIS application to verify it&apos;s valid</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
