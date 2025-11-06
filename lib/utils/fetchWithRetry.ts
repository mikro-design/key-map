import pRetry, { AbortError } from 'p-retry';
import { logger } from './logger';

/**
 * Custom error class for network errors
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public meta: {
      status?: number;
      url?: string;
      timeout?: number;
      retryable?: boolean;
      [key: string]: any;
    }
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Fetch with automatic retry and exponential backoff
 *
 * Features:
 * - Automatic retry on 5xx errors and network failures
 * - Exponential backoff between retries
 * - Configurable timeout
 * - No retry on 4xx errors (client errors)
 * - Detailed error logging
 *
 * @param url - URL to fetch
 * @param options - Fetch options + retry configuration
 * @returns Response
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    onRetry,
    ...fetchOptions
  } = options;

  const fetchWithTimeout = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check response status
      if (!response.ok) {
        const error = new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          {
            status: response.status,
            url,
            retryable: response.status >= 500,
          }
        );

        // Retry on 5xx errors (server errors)
        if (response.status >= 500) {
          throw error;
        }

        // Don't retry on 4xx errors (client errors)
        throw new AbortError(error);
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new AbortError(
          new NetworkError('Request timeout', {
            url,
            timeout,
            retryable: true,
          })
        );
      }

      // Network errors (no connection, DNS failure, etc.) - retry
      if (error instanceof TypeError) {
        throw new NetworkError('Network request failed', {
          url,
          retryable: true,
          originalError: error.message,
        });
      }

      throw error;
    }
  };

  return pRetry(fetchWithTimeout, {
    retries,
    minTimeout: retryDelay,
    factor: 2, // Exponential backoff: 1s, 2s, 4s, 8s...
    onFailedAttempt: (retryContext) => {
      logger.warn('Fetch retry attempt failed', {
        url,
        attempt: retryContext.attemptNumber,
        retriesLeft: retryContext.retriesLeft,
      });

      // onRetry expects Error, but retryContext doesn't provide the original error
      // So we create a generic error for the callback
      if (onRetry) {
        const error = new Error(`Retry attempt ${retryContext.attemptNumber} failed`);
        onRetry(retryContext.attemptNumber, error);
      }
    },
  });
}

/**
 * Fetch JSON with retry
 */
export async function fetchJSONWithRetry<T = any>(
  url: string,
  options?: FetchWithRetryOptions
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new NetworkError(`Failed to fetch JSON: ${response.statusText}`, {
      status: response.status,
      url,
    });
  }

  try {
    return await response.json();
  } catch (error) {
    throw new NetworkError('Invalid JSON response', {
      url,
      originalError: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
