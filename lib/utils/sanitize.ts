/**
 * Input sanitization and validation utilities
 * Protects against XSS, injection attacks, and malformed data
 */

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import { logger } from './logger';

/**
 * Sanitize HTML content using DOMPurify
 * Removes all potentially dangerous HTML/JS
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text - removes all HTML and dangerous characters
 * Use for layer names, project names, etc.
 */
export function sanitizeText(input: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') return '';

  // Remove all HTML tags
  let clean = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

  // Remove control characters except newlines and tabs
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  clean = clean.trim();

  // Enforce max length
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
    logger.warn('Input truncated to max length', { maxLength, original: input.length });
  }

  return clean;
}

/**
 * URL validation schema - only allows http/https
 */
export const urlSchema = z.string()
  .url('Invalid URL format')
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Only HTTP/HTTPS URLs are allowed')
  .refine((url) => {
    const parsed = new URL(url);
    // Block localhost and private IPs
    const hostname = parsed.hostname.toLowerCase();
    return !hostname.match(/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/);
  }, 'Private/local URLs are not allowed');

/**
 * Sanitize and validate URL
 * Returns null if invalid
 */
export function sanitizeURL(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  // Remove leading/trailing whitespace
  const trimmed = input.trim();

  // Validate with Zod schema
  const result = urlSchema.safeParse(trimmed);

  if (!result.success) {
    logger.security('Invalid URL rejected', {
      input: trimmed.substring(0, 100),
      error: result.error.issues[0].message
    });
    return null;
  }

  return result.data;
}

/**
 * GeoJSON coordinate validation schema
 * Format: [[lng, lat], [lng, lat], [lng, lat], [lng, lat]]
 */
export const coordinateSchema = z.array(
  z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90),   // latitude
  ])
).min(3, 'At least 3 coordinate pairs required');

/**
 * Parse and validate coordinates
 * Returns null if invalid
 */
export function parseCoordinates(input: string): [number, number][] | null {
  if (!input || typeof input !== 'string') return null;

  try {
    const parsed = JSON.parse(input);
    const result = coordinateSchema.safeParse(parsed);

    if (!result.success) {
      logger.warn('Invalid coordinates format', {
        input: input.substring(0, 200),
        error: result.error.issues[0].message
      });
      return null;
    }

    return result.data as [number, number][];
  } catch (error) {
    logger.warn('Failed to parse coordinates', {
      input: input.substring(0, 200),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Sanitize layer name with strict validation
 */
export function sanitizeLayerName(name: string): string {
  const clean = sanitizeText(name, 100);

  // Only allow alphanumeric, spaces, hyphens, underscores
  const safe = clean.replace(/[^a-zA-Z0-9\s\-_]/g, '');

  if (!safe) {
    return 'Untitled Layer';
  }

  return safe;
}

/**
 * Sanitize file name - removes path traversal attempts
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return 'unnamed';

  // Remove path separators and traversal attempts
  let clean = fileName.replace(/[\/\\\.]{2,}/g, '');
  clean = clean.replace(/^\.+/, '');
  clean = clean.replace(/[<>:"|?*\x00-\x1F]/g, '');

  // Remove leading/trailing dots and spaces
  clean = clean.replace(/^[\s\.]+|[\s\.]+$/g, '');

  // Limit length
  if (clean.length > 255) {
    const ext = clean.split('.').pop() || '';
    const name = clean.substring(0, 251 - ext.length);
    clean = `${name}.${ext}`;
  }

  return clean || 'unnamed';
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(
  input: string | number,
  min?: number,
  max?: number,
  defaultValue: number = 0
): number {
  const num = typeof input === 'number' ? input : parseFloat(input);

  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }

  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;

  return num;
}

/**
 * Sanitize color input - accepts hex colors only
 */
export function sanitizeColor(input: string, defaultColor: string = '#000000'): string {
  if (!input || typeof input !== 'string') return defaultColor;

  const clean = input.trim().toLowerCase();

  // Validate hex color format
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(clean)) {
    return clean;
  }

  logger.warn('Invalid color format, using default', { input, defaultColor });
  return defaultColor;
}

/**
 * Sanitize search query - removes special characters that could break search
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';

  // Remove HTML
  let clean = sanitizeText(query, 500);

  // Escape special regex characters
  clean = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return clean;
}

/**
 * Type-safe input sanitizer with validation
 */
export interface SanitizeOptions<T> {
  schema?: z.ZodSchema<T>;
  maxLength?: number;
  allowHTML?: boolean;
  transform?: (value: string) => T;
  onError?: (error: z.ZodError) => void;
}

export function sanitizeInput<T = string>(
  input: string,
  options: SanitizeOptions<T> = {}
): T | null {
  const {
    schema,
    maxLength = 1000,
    allowHTML = false,
    transform,
    onError,
  } = options;

  if (!input || typeof input !== 'string') return null;

  // Sanitize HTML or text
  let clean = allowHTML ? sanitizeHTML(input) : sanitizeText(input, maxLength);

  // Apply custom transformation
  if (transform) {
    try {
      const transformed = transform(clean);

      // Validate with schema if provided
      if (schema) {
        const result = schema.safeParse(transformed);
        if (!result.success) {
          onError?.(result.error);
          return null;
        }
        return result.data;
      }

      return transformed;
    } catch (error) {
      logger.error('Input transformation failed', error as Error, { input: clean.substring(0, 100) });
      return null;
    }
  }

  // Validate with schema if provided
  if (schema) {
    const result = schema.safeParse(clean);
    if (!result.success) {
      onError?.(result.error);
      return null;
    }
    return result.data;
  }

  return clean as T;
}
