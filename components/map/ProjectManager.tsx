'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { sanitizeText, sanitizeFileName } from '@/lib/utils/sanitize';
import { z } from 'zod';

export interface ProjectManagerProps {
  map: any;
  layers: any[];
  basemap: any;
  onProjectLoaded: (project: any) => void;
  className?: string;
}

// Project validation schema
const projectSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  created: z.string(),
  center: z.object({
    lng: z.number(),
    lat: z.number(),
  }).optional(),
  zoom: z.number().optional(),
  basemap: z.object({
    id: z.string(),
    label: z.string(),
  }).optional(),
  layers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    visible: z.boolean().optional(),
    opacity: z.number().optional(),
    data: z.any().optional(),
  })).optional(),
});

export default function ProjectManager({
  map,
  layers,
  basemap,
  onProjectLoaded,
  className = '',
}: ProjectManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);

  const loadSavedProjects = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('keymap-project-'));
    const projects = keys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        // Validate project data
        const result = projectSchema.safeParse(data);
        if (!result.success) {
          console.warn(`Invalid project data for ${key}:`, result.error);
          return null;
        }
        return result.data;
      } catch (error) {
        console.warn(`Failed to load project ${key}:`, error);
        return null;
      }
    }).filter(Boolean);
    setSavedProjects(projects);
  };

  const handleSaveProject = () => {
    const projectNameRaw = prompt('Enter project name:');
    if (!projectNameRaw) return;

    // Sanitize project name
    const projectName = sanitizeText(projectNameRaw, 100);
    if (!projectName) {
      toast.error('Invalid project name', { description: 'Please enter a valid name' });
      return;
    }

    const project = {
      id: `keymap-project-${Date.now()}`,
      name: projectName,
      created: new Date().toISOString(),
      center: map?.getCenter(),
      zoom: map?.getZoom(),
      basemap: {
        id: basemap.id,
        label: basemap.label
      },
      layers: layers.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        visible: l.visible,
        opacity: l.opacity,
        // Store layer data if it's uploaded/drawn
        data: getLayerData(l.id)
      }))
    };

    // Validate project structure before saving
    const result = projectSchema.safeParse(project);
    if (!result.success) {
      toast.error('Invalid project data', { description: 'Failed to validate project structure' });
      console.error('Project validation error:', result.error);
      return;
    }

    try {
      localStorage.setItem(project.id, JSON.stringify(result.data));
      toast.success('Project saved', {
        description: `${projectName} has been saved to local storage`
      });
      loadSavedProjects();
    } catch (error: any) {
      toast.error('Failed to save project', {
        description: 'Try removing some layers to reduce size, or export as a file instead'
      });
    }
  };

  const getLayerData = (layerId: string) => {
    if (!map) return null;

    try {
      const source = map.getSource(layerId);
      if (source && source._data) {
        return source._data;
      }
    } catch (e) {
      return null;
    }

    return null;
  };

  const handleLoadProject = (project: any) => {
    if (!confirm(`Load project "${project.name}"? Current work will be lost.`)) {
      return;
    }

    onProjectLoaded(project);
    setIsOpen(false);
    toast.success('Project loaded', {
      description: `${project.name} has been restored with ${project.layers?.length || 0} layers`
    });
  };

  const handleDeleteProject = (project: any) => {
    if (!confirm(`Delete project "${project.name}"?`)) {
      return;
    }

    localStorage.removeItem(project.id);
    loadSavedProjects();
  };

  const handleExportProject = (project: any) => {
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.keymap.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleImportProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.keymap.json';

    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large', {
          description: 'Project files must be smaller than 10MB'
        });
        return;
      }

      // Sanitize file name
      const safeFileName = sanitizeFileName(file.name);

      try {
        const text = await file.text();

        // Limit file content size
        if (text.length > 10 * 1024 * 1024) {
          toast.error('File content too large', {
            description: 'Project files must be smaller than 10MB'
          });
          return;
        }

        const projectData = JSON.parse(text);

        // Validate project structure
        const result = projectSchema.safeParse(projectData);
        if (!result.success) {
          toast.error('Invalid project file', {
            description: 'The file does not contain valid KeyMap project data'
          });
          console.error('Project validation error:', result.error);
          return;
        }

        const project = result.data;

        // Ensure the project has a valid ID
        if (!project.id || !project.id.startsWith('keymap-project-')) {
          project.id = `keymap-project-${Date.now()}`;
        }

        // Save to localStorage
        localStorage.setItem(project.id, JSON.stringify(project));

        loadSavedProjects();
        toast.success('Project imported', {
          description: `${project.name} has been added to your saved projects`
        });
      } catch (error: any) {
        toast.error('Failed to import project', {
          description: 'Please check that the file is a valid KeyMap project file'
        });
        console.error('Import error:', error);
      }
    };

    input.click();
  };

  const handleOpenMenu = () => {
    setIsOpen(true);
    loadSavedProjects();
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleOpenMenu}
        className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        <span className="text-sm font-medium">Projects</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-96">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Project Manager
              </h3>
            </div>

            <div className="p-3 space-y-2">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProject}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                  💾 Save Current
                </button>
                <button
                  onClick={handleImportProject}
                  className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
                >
                  📥 Import
                </button>
              </div>

              {/* Saved Projects List */}
              <div className="border-t pt-3 mt-3">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                  Saved Projects ({savedProjects.length})
                </h4>

                {savedProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No saved projects yet.<br />
                    Click &quot;Save Current&quot; to save your work.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {savedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {project.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {project.layers?.length || 0} layers • {new Date(project.created).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => handleLoadProject(project)}
                            className="flex-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleExportProject(project)}
                            className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500 text-xs"
                          >
                            Export
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project)}
                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 pt-2 border-t">
                <strong>Tip:</strong> Projects are saved in your browser&apos;s localStorage. Export projects to share or backup.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
