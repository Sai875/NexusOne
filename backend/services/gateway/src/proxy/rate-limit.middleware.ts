import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

interface Bucket {
  timestamps: number[];
}

/**
 * Minimal per-IP sliding-window rate limiter. Production guidance: replace
 * with a Redis-backed limiter (e.g. @nestjs/throttler with the Redis store)
 * so limits survive restarts and scale horizontally — see docs/architecture.md.
 */
export function rateLimitMiddleware(config: ConfigService) {
  const windowMs = Number(config.get('RATE_LIMIT_TTL_MS', 60_000));
  const max = Number(config.get('RATE_LIMIT_MAX', 300));
  const buckets = new Map<string, Bucket>();

  // Periodic cleanup so the map does not grow unbounded.
  const interval = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, bucket] of buckets) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
      if (bucket.timestamps.length === 0) buckets.delete(key);
    }
  }, Math.max(windowMs, 60_000));
  if (typeof interval.unref === 'function') interval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(key, bucket);
    }
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length >= max) {
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests — rate limit exceeded',
      });
      return;
    }
    bucket.timestamps.push(now);
    next();
  };
}
