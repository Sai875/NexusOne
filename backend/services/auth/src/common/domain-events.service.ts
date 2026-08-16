import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from './redis.provider';

export const DOMAIN_EVENTS_CHANNEL = 'domain-events';

export interface DomainEvent<T = Record<string, unknown>> {
  type: string;
  orgId: string;
  payload: T;
  occurredAt: string;
}

/**
 * Minimal event bus (Redis pub/sub). In production this is replaced by Kafka
 * for durable, replayable events — see docs/architecture.md. Publishing is
 * best-effort: services never crash when the bus is unavailable.
 */
@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async publish<T extends Record<string, unknown>>(
    type: string,
    orgId: string,
    payload: T = {} as T,
  ): Promise<void> {
    const event: DomainEvent<T> = { type, orgId, payload, occurredAt: new Date().toISOString() };
    try {
      await this.redis.publish(DOMAIN_EVENTS_CHANNEL, JSON.stringify(event));
    } catch (err) {
      this.logger.warn(`Could not publish event ${type}: ${(err as Error).message}`);
    }
  }
}
