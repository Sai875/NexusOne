import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS } from '../common/redis.provider';
import { NotificationsService } from './notifications.service';

interface DomainEvent {
  type: string;
  orgId: string;
  payload?: Record<string, unknown>;
}

/**
 * Turns cross-service domain events into user-facing notifications:
 *   task.assigned   (projects → notifications)
 *   chat.mentioned  (chat → notifications)
 *   event.reminder  (calendar → notifications)
 *   invite.accepted (auth → notifications)
 */
@Injectable()
export class EventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(EventsConsumer.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly notifications: NotificationsService,
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
        void this.handle(JSON.parse(raw) as DomainEvent);
      } catch {
        this.logger.warn('Ignored malformed domain event');
      }
    });
  }

  private async handle(event: DomainEvent): Promise<void> {
    const p = event.payload ?? {};
    switch (event.type) {
      case 'task.assigned':
        await this.notifications.create(event.orgId, String(p.assigneeId), {
          type: 'task.assigned',
          title: 'Task assigned to you',
          body: `“${p.title ?? 'Untitled task'}” was assigned to you`,
          link: `/projects?task=${p.taskId}`,
          data: { taskId: p.taskId, projectId: p.projectId },
        });
        break;
      case 'chat.mentioned':
        await this.notifications.create(event.orgId, String(p.mentioneeId), {
          type: 'chat.mentioned',
          title: 'You were mentioned',
          body: `“${String(p.text ?? '').slice(0, 120)}”`,
          link: `/chat?channel=${p.channelId}&message=${p.messageId}`,
          data: { channelId: p.channelId, messageId: p.messageId },
        });
        break;
      case 'event.reminder': {
        const startAt = new Date(String(p.startAt));
        const reminderMs = Number(p.reminderMinutes) * 60_000;
        const due = startAt.getTime() - reminderMs;
        const delay = Math.max(0, due - Date.now());
        // MVP reminder: fire immediately in dev; scheduled jobs (BullMQ /
        // cron) are documented in docs/architecture.md.
        setTimeout(() => {
          const userIds = (p.userIds as string[]) ?? [];
          for (const userId of userIds) {
            void this.notifications.create(event.orgId, userId, {
              type: 'event.reminder',
              title: 'Upcoming event',
              body: `“${String(p.title ?? 'Event')}” starts at ${startAt.toLocaleString()}`,
              link: '/calendar',
              data: { eventId: p.eventId },
            });
          }
        }, delay);
        break;
      }
      case 'invite.accepted':
        if (p.invitedBy) {
          await this.notifications.create(event.orgId, String(p.invitedBy), {
            type: 'system',
            title: 'Invitation accepted',
            body: `${String(p.email ?? 'Someone')} joined your organization`,
            link: '/admin',
            data: { userId: p.userId },
          });
        }
        break;
      default:
        break;
    }
  }
}
