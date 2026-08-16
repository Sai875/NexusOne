import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  record(params: {
    orgId: string;
    actorId?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLog> {
    return this.repo.save(
      this.repo.create({
        orgId: params.orgId,
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata ?? {},
      }),
    );
  }

  list(orgId: string, limit = 50): Promise<AuditLog[]> {
    return this.repo.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200),
    });
  }
}
