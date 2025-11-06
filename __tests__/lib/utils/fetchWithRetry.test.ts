import { fetchWithRetry, fetchJSONWithRetry, NetworkError } from '@/lib/utils/fetchWithRetry';

// Mock p-retry to avoid actual delays in tests
jest.mock('p-retry', () => {
  return jest.fn((fn, options) => {
    // Try the function once, then fail fast for tests
    return fn().catch((error: any) => {
      if (options?.onFailedAttempt) {
        options.onFailedAttempt({
          attemptNumber: 1,
          retriesLeft: options.retries - 1,
          message: error.message,
        });
      }
      throw error;
    });
  });
});

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock) = jest.fn();
  });

  it('should successfully fetch on first try', async () => {
    const mockResponse = new Response('OK', { status: 200 });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const response = await fetchWithRetry('https://example.com/api');

    expect(response).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw NetworkError on 500 error', async () => {
    const mockResponse = new Response('Server Error', { status: 500 });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(fetchWithRetry('https://example.com/api')).rejects.toThrow(NetworkError);
  });

  it('should not retry on 404 error', async () => {
    const mockResponse = new Response('Not Found', { status: 404 });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(fetchWithRetry('https://example.com/api')).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle network timeout', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      (url, options) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve(new Response('OK')), 40000);
        options.signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          reject(error);
        });
      })
    );

    await expect(
      fetchWithRetry('https://example.com/api', { timeout: 100 })
    ).rejects.toThrow();
  });

  it('should call onRetry callback', async () => {
    const mockResponse = new Response('Server Error', { status: 500 });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const onRetry = jest.fn();

    try {
      await fetchWithRetry('https://example.com/api', { onRetry });
    } catch (e) {
      // Expected to fail
    }

    expect(onRetry).toHaveBeenCalled();
  });
});

describe('fetchJSONWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock) = jest.fn();
  });

  it('should parse JSON response', async () => {
    const mockData = { success: true, data: 'test' };
    const mockResponse = new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await fetchJSONWithRetry('https://example.com/api');

    expect(result).toEqual(mockData);
  });

  it('should throw on invalid JSON', async () => {
    const mockResponse = new Response('not json', { status: 200 });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(fetchJSONWithRetry('https://example.com/api')).rejects.toThrow(NetworkError);
  });

  it('should add Accept header', async () => {
    const mockData = { test: true };
    const mockResponse = new Response(JSON.stringify(mockData), { status: 200 });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await fetchJSONWithRetry('https://example.com/api');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/json',
        }),
      })
    );
  });
});

describe('NetworkError', () => {
  it('should create error with metadata', () => {
    const error = new NetworkError('Test error', {
      status: 500,
      url: 'https://example.com',
      retryable: true,
    });

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('NetworkError');
    expect(error.meta.status).toBe(500);
    expect(error.meta.url).toBe('https://example.com');
    expect(error.meta.retryable).toBe(true);
  });
});
