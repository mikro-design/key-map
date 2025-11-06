'use client';

import { MapAttribution as Attribution } from '@/lib/map/map-sources';

export interface MapAttributionProps {
  attributions: Attribution[];
  className?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export default function MapAttribution({
  attributions,
  className = '',
  position = 'bottom-right',
}: MapAttributionProps) {
  const positionClasses = {
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
  };

  const requiredAttributions = attributions.filter(attr => attr.required);

  if (requiredAttributions.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute ${positionClasses[position]} bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-700 dark:text-gray-300 shadow-sm z-10 ${className}`}
    >
      {requiredAttributions.map((attr, index) => (
        <span key={index}>
          {index > 0 && <span className="mx-1">|</span>}
          {attr.url ? (
            <a
              href={attr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {attr.text}
            </a>
          ) : (
            <span>{attr.text}</span>
          )}
        </span>
      ))}
    </div>
  );
}
