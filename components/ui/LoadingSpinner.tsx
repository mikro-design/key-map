'use client';

import { ImportProgress } from '@/lib/types/layer';

export interface LoadingSpinnerProps {
  progress?: ImportProgress;
  message?: string;
}

export default function LoadingSpinner({ progress, message }: LoadingSpinnerProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Spinner */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>

        {/* Message */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {progress ? getStageLabel(progress.stage) : 'Loading...'}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {progress?.message || message || 'Please wait...'}
          </p>

          {/* Progress Bar */}
          {progress && progress.progress > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          )}

          {progress && progress.progress > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {progress.progress}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function getStageLabel(stage: ImportProgress['stage']): string {
  switch (stage) {
    case 'reading': return 'Reading File...';
    case 'parsing': return 'Parsing Data...';
    case 'validating': return 'Validating...';
    case 'transforming': return 'Transforming...';
    case 'complete': return 'Complete!';
    case 'error': return 'Error';
    default: return 'Processing...';
  }
}
