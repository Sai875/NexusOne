import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../common/redis.provider';
import { ChatService } from './chat.service';

const DEMO_ORG_ID = '11111111-1111-4111-8111-111111111111';

@Injectable()
export class EventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(EventsConsumer.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly chat: ChatService,
  ) {}

  onModuleInit(): void {
    // Best-effort: ensure the demo org has channels even if the org.created
    // event fired before this service started.
    void this.chat.ensureDefaultChannels(DEMO_ORG_ID).catch((err) =>
      this.logger.warn(`Demo channel bootstrap failed: ${(err as Error).message}`),
    );

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
        const event = JSON.parse(raw) as {
          type: string;
          orgId: string;
          payload?: { createdBy?: string };
        };
        if (event.type === 'org.created') {
          void this.chat.ensureDefaultChannels(event.orgId, event.payload?.createdBy);
        }
      } catch {
        this.logger.warn('Ignored malformed domain event');
      }
    });
  }
}
