import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

export const redisProvider = {
  provide: REDIS,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis => {
    // Managed hosts (Railway/Render) usually expose a single connection URL.
    const url = config.get('REDIS_URL', '');
    if (url) {
      return new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: true });
    }
    const host = config.get('REDIS_HOST', 'localhost');
    const port = Number(config.get('REDIS_PORT', 6379));
    return new Redis({
      host,
      port,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
      retryStrategy: (times: number) => Math.min(times * 200, 2000),
    });
  },
};
