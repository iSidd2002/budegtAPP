import { withRateLimit } from '@/lib/middleware';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    jest.clearAllMocks();
  });

  it('should allow requests within limit', () => {
    const key = 'test-key-1';
    const limit = 5;
    const windowMs = 60000;

    for (let i = 0; i < limit; i++) {
      const result = withRateLimit(key, limit, windowMs);
      expect(result.allowed).toBe(true);
    }
  });

  it('should block requests exceeding limit', () => {
    const key = 'test-key-2';
    const limit = 3;
    const windowMs = 60000;

    // Make requests up to limit
    for (let i = 0; i < limit; i++) {
      withRateLimit(key, limit, windowMs);
    }

    // Next request should be blocked
    const result = withRateLimit(key, limit, windowMs);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
  });

  it('should reset after window expires', (done) => {
    const key = 'test-key-3';
    const limit = 2;
    const windowMs = 100; // 100ms window

    // Make requests up to limit
    for (let i = 0; i < limit; i++) {
      withRateLimit(key, limit, windowMs);
    }

    // Should be blocked
    let result = withRateLimit(key, limit, windowMs);
    expect(result.allowed).toBe(false);

    // Wait for window to expire
    setTimeout(() => {
      result = withRateLimit(key, limit, windowMs);
      expect(result.allowed).toBe(true);
      done();
    }, 150);
  });

  it('should track different keys separately', () => {
    const key1 = 'user-1';
    const key2 = 'user-2';
    const limit = 2;

    // Fill key1
    withRateLimit(key1, limit, 60000);
    withRateLimit(key1, limit, 60000);

    // key1 should be blocked
    let result1 = withRateLimit(key1, limit, 60000);
    expect(result1.allowed).toBe(false);

    // key2 should still be allowed
    let result2 = withRateLimit(key2, limit, 60000);
    expect(result2.allowed).toBe(true);
  });
});

