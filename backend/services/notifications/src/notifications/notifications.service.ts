import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
import { Model } from 'mongoose';
import { Observable } from 'rxjs';
import { REDIS } from '../common/redis.provider';
import { AppNotification, NotificationType } from './schemas/notification.schema';

export const NOTIFICATION_STREAM_CHANNEL = 'user-notifications';
const DOMAIN_EVENTS_CHANNEL = 'domain-events';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(AppNotification.name) private readonly model: Model<AppNotification>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  onModuleInit(): void {
    this.redis.subscribe(DOMAIN_EVENTS_CHANNEL, NOTIFICATION_STREAM_CHANNEL, (err) => {
      if (err) this.logger.warn(`Redis subscription failed: ${err.message}`);
    });
  }

  async create(
    orgId: string,
    userId: string,
    input: {
      type: NotificationType;
      title: string;
      body: string;
      link?: string;
      data?: Record<string, unknown>;
    },
  ): Promise<AppNotification> {
    const notification = await this.model.create({
      orgId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      data: input.data ?? null,
    });
    await this.push(notification);
    return notification;
  }

  async list(userId: string, orgId: string, limit = 30, before?: string): Promise<AppNotification[]> {
    const query: Record<string, unknown> = { userId, orgId };
    if (before) query.createdAt = { $lt: new Date(before) };
    return this.model.find(query).sort({ createdAt: -1 }).limit(Math.min(limit, 100)).lean();
  }

  async markRead(userId: string, orgId: string, notificationId: string): Promise<AppNotification | null> {
    return this.model.findOneAndUpdate(
      { _id: notificationId, userId, orgId },
      { readAt: new Date() },
      { new: true },
    );
  }

  async markAllRead(userId: string, orgId: string): Promise<{ modified: number }> {
    const result = await this.model.updateMany({ userId, orgId, readAt: null }, { readAt: new Date() });
    return { modified: result.modifiedCount };
  }

  async unreadCount(userId: string, orgId: string): Promise<number> {
    return this.model.countDocuments({ userId, orgId, readAt: null });
  }

  /**
   * SSE stream for one user. Subscribes to the Redis notification fan-out and
   * forwards only messages addressed to this user.
   */
  stream(userId: string, orgId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const handler = (channel: string, raw: string): void => {
        if (channel !== NOTIFICATION_STREAM_CHANNEL) return;
        try {
          const message = JSON.parse(raw) as {
            orgId: string;
            userId: string;
            notification: AppNotification;
          };
          if (message.userId === userId && message.orgId === orgId) {
            subscriber.next({ data: JSON.stringify(message.notification) });
          }
        } catch {
          // Ignore malformed fan-out messages.
        }
      };
      this.redis.on('message', handler);
      return () => this.redis.off('message', handler);
    });
  }

  private async push(notification: AppNotification): Promise<void> {
    try {
      await this.redis.publish(
        NOTIFICATION_STREAM_CHANNEL,
        JSON.stringify({ orgId: notification.orgId, userId: notification.userId, notification }),
      );
    } catch (err) {
      this.logger.warn(`Could not publish notification stream event: ${(err as Error).message}`);
    }
  }
}
