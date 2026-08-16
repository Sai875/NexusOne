import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../common/redis.provider';

export type PresenceStatus = 'online' | 'away' | 'in_meeting' | 'dnd';

export interface PresenceEntry {
  status: PresenceStatus;
  lastSeen: string;
}

const PRESENCE_TTL_SECONDS = 300;

@Injectable()
export class PresenceService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  private key(orgId: string, userId: string): string {
    return `presence:${orgId}:${userId}`;
  }

  private orgKey(orgId: string): string {
    return `presence:org:${orgId}`;
  }

  async setStatus(orgId: string, userId: string, status: PresenceStatus): Promise<void> {
    const entry: PresenceEntry = { status, lastSeen: new Date().toISOString() };
    await this.redis.set(this.key(orgId, userId), JSON.stringify(entry), 'EX', PRESENCE_TTL_SECONDS);
    await this.redis.sadd(this.orgKey(orgId), userId);
  }

  async setOffline(orgId: string, userId: string): Promise<void> {
    await this.redis.del(this.key(orgId, userId));
    await this.redis.srem(this.orgKey(orgId), userId);
  }

  async onlineUserIds(orgId: string): Promise<string[]> {
    return this.redis.smembers(this.orgKey(orgId));
  }

  async statuses(orgId: string, userIds: string[]): Promise<Record<string, PresenceEntry>> {
    if (!userIds.length) return {};
    const pipeline = this.redis.pipeline();
    for (const userId of userIds) pipeline.get(this.key(orgId, userId));
    const results = await pipeline.exec();
    const out: Record<string, PresenceEntry> = {};
    results?.forEach(([err, value], index) => {
      if (!err && typeof value === 'string') {
        try {
          out[userIds[index]] = JSON.parse(value) as PresenceEntry;
        } catch {
          // ignore malformed entries
        }
      }
    });
    return out;
  }
}
