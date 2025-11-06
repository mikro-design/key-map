import { checkRateLimit } from '@/lib/utils/rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow first request', () => {
    const result = checkRateLimit('test-ip', 10, 60000);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
  });

  it('should track multiple requests from same IP', () => {
    const limit = 5;
    const ip = 'test-ip-2';

    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(ip, limit, 60000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(limit - i - 1);
    }

    // 6th request should be rate limited
    const result = checkRateLimit(ip, limit, 60000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after time window expires', () => {
    const ip = 'test-ip-3';
    const windowMs = 100; // 100ms window

    // First request
    let result = checkRateLimit(ip, 2, windowMs);
    expect(result.success).toBe(true);

    // Second request
    result = checkRateLimit(ip, 2, windowMs);
    expect(result.success).toBe(true);

    // Third request should fail
    result = checkRateLimit(ip, 2, windowMs);
    expect(result.success).toBe(false);

    // Wait for window to expire
    return new Promise((resolve) => {
      setTimeout(() => {
        // Should work again
        result = checkRateLimit(ip, 2, windowMs);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(1);
        resolve(undefined);
      }, 150);
    });
  });

  it('should track different IPs separately', () => {
    const limit = 3;

    const result1 = checkRateLimit('ip-1', limit, 60000);
    const result2 = checkRateLimit('ip-2', limit, 60000);

    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(2);
  });

  it('should return correct reset time', () => {
    const now = Date.now();
    const windowMs = 60000;

    const result = checkRateLimit('test-ip-reset', 10, windowMs);

    expect(result.reset).toBeGreaterThan(now);
    expect(result.reset).toBeLessThanOrEqual(now + windowMs);
  });
});
