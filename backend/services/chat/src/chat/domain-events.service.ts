import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../common/redis.provider';

export const DOMAIN_EVENTS_CHANNEL = 'domain-events';

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async publish(
    type: string,
    orgId: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.redis.publish(
        DOMAIN_EVENTS_CHANNEL,
        JSON.stringify({ type, orgId, payload, occurredAt: new Date().toISOString() }),
      );
    } catch (err) {
      this.logger.warn(`Could not publish ${type}: ${(err as Error).message}`);
    }
  }
}
