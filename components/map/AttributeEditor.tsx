'use client';

import { useState, useEffect } from 'react';
import { Feature } from 'geojson';
import { toast } from 'sonner';

interface AttributeEditorProps {
  feature: Feature | null;
  layerId: string | null;
  onClose: () => void;
  onSave: (layerId: string, featureId: string | number, properties: Record<string, any>) => void;
}

export default function AttributeEditor({ feature, layerId, onClose, onSave }: AttributeEditorProps) {
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (feature?.properties) {
      setAttributes({ ...feature.properties });
    }
  }, [feature]);

  if (!feature || !layerId) return null;

  const handleSave = () => {
    const featureId = feature.id || feature.properties?.id || `feature-${Date.now()}`;
    onSave(layerId, featureId, attributes);
    toast.success('Attributes saved', { description: 'Feature properties updated' });
    onClose();
  };

  const handleAddAttribute = () => {
    if (!newKey.trim()) {
      toast.error('Key required', { description: 'Enter a property name' });
      return;
    }

    setAttributes({ ...attributes, [newKey]: newValue });
    setNewKey('');
    setNewValue('');
  };

  const handleDeleteAttribute = (key: string) => {
    const updated = { ...attributes };
    delete updated[key];
    setAttributes(updated);
  };

  const handleUpdateAttribute = (key: string, value: any) => {
    setAttributes({ ...attributes, [key]: value });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-[500px] max-h-[600px] border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Edit Feature Properties
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Feature Info */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <strong>Feature Type:</strong> {feature.geometry.type}
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 font-mono">
              <strong>Layer:</strong> {layerId}
            </div>
          </div>

          {/* Existing Attributes */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Properties ({Object.keys(attributes).length})
            </h4>

            {Object.keys(attributes).length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic p-3 bg-gray-50 dark:bg-gray-700 rounded">
                No properties yet. Add some below.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(attributes).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={key}
                        readOnly
                        className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500 font-mono"
                      />
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => handleUpdateAttribute(key, e.target.value)}
                        className="px-2 py-1 text-sm bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteAttribute(key)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete property"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Attribute */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Add New Property
            </h4>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Property Name
                  </label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="e.g., name, type, notes"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAttribute()}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Value
                  </label>
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Enter value"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAttribute()}
                  />
                </div>
              </div>
              <button
                onClick={handleAddAttribute}
                disabled={!newKey.trim()}
                className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Property
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}
