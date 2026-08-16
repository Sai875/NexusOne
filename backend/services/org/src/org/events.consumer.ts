import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../common/redis.provider';
import { EntitlementsService } from './entitlements.service';

/**
 * Consumes domain events from Redis pub/sub. When an organization is created
 * by the auth service, this consumer seeds its module entitlements.
 */
@Injectable()
export class EventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(EventsConsumer.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly entitlements: EntitlementsService,
  ) {}

  onModuleInit(): void {
    this.redis.subscribe('domain-events', (err) => {
      if (err) {
        this.logger.warn(`Event subscription failed: ${err.message}`);
        return;
      }
      this.logger.log('Subscribed to domain-events');
    });
    this.redis.on('message', (channel, raw) => {
      if (channel !== 'domain-events') return;
      try {
        const event = JSON.parse(raw) as { type: string; orgId: string; payload?: Record<string, unknown> };
        void this.handle(event);
      } catch {
        this.logger.warn('Ignored malformed domain event');
      }
    });
  }

  private async handle(event: { type: string; orgId: string }): Promise<void> {
    if (event.type === 'org.created') {
      await this.entitlements.ensureDefaults(event.orgId);
      this.logger.log(`Seeded entitlements for new org ${event.orgId}`);
    }
  }
}
