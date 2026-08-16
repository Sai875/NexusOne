import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from './audit.service';
import { Entitlement } from './entities/entitlement.entity';
import { EntitlementsService } from './entitlements.service';
import { Role, ROLE_RANK } from '../common/role.constants';

export interface OrgMember {
  userId: string;
  name: string;
  email: string;
  roles: string[];
  status: string;
  joinedAt: Date;
}

export interface AnalyticsSummary {
  members: number;
  projects: number;
  tasks: number;
  tasksDone: number;
  completionRate: number;
  files: number;
  events: number;
  messages7d: number;
  activity7d: number;
  tasksByStatus: { status: string; count: string }[];
  recentActivity: { action: string; entityType: string | null; actorId: string | null; createdAt: Date }[];
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Entitlement) private readonly entitlementsRepo: Repository<Entitlement>,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async listMembers(orgId: string): Promise<OrgMember[]> {
    return this.dataSource.query(
      `SELECT m.user_id AS "userId", u.name, u.email, m.roles, m.status, m.created_at AS "joinedAt"
         FROM memberships m
         JOIN users u ON u.id = m.user_id
        WHERE m.org_id = $1
        ORDER BY u.name ASC`,
      [orgId],
    );
  }

  async updateMemberRoles(orgId: string, userId: string, roles: string[], actorId: string): Promise<OrgMember> {
    if (!roles.length || roles.some((role) => !(role in Role))) {
      throw new BadRequestException('Invalid role list');
    }
    const result = await this.dataSource.query(
      `UPDATE memberships SET roles = $3::jsonb
        WHERE org_id = $1 AND user_id = $2
        RETURNING user_id AS "userId", roles`,
      [orgId, userId, JSON.stringify(roles)],
    );
    if (!result.length) throw new BadRequestException('Member not found in this organization');
    await this.audit.record({
      orgId,
      actorId,
      action: 'member.roles_updated',
      entityType: 'membership',
      entityId: userId,
      metadata: { roles },
    });
    const members = await this.listMembers(orgId);
    return members.find((member) => member.userId === userId) as OrgMember;
  }

  async removeMember(orgId: string, userId: string, actorId: string): Promise<void> {
    if (userId === actorId) throw new BadRequestException('You cannot remove yourself');
    await this.dataSource.query(
      `UPDATE memberships SET status = 'inactive'
        WHERE org_id = $1 AND user_id = $2`,
      [orgId, userId],
    );
    await this.audit.record({
      orgId,
      actorId,
      action: 'member.removed',
      entityType: 'membership',
      entityId: userId,
    });
  }

  async analytics(orgId: string): Promise<AnalyticsSummary> {
    const rows = await this.dataSource.query(
      `SELECT
          (SELECT COUNT(*) FROM memberships WHERE org_id = $1 AND status = 'active') AS members,
          (SELECT COUNT(*) FROM projects WHERE org_id = $1) AS projects,
          (SELECT COUNT(*) FROM tasks WHERE org_id = $1) AS tasks,
          (SELECT COUNT(*) FROM tasks WHERE org_id = $1 AND status = 'done') AS tasks_done,
          (SELECT COUNT(*) FROM files WHERE org_id = $1) AS files,
          (SELECT COUNT(*) FROM calendar_events WHERE org_id = $1) AS events,
          (SELECT COUNT(*) FROM activity_logs WHERE org_id = $1 AND created_at > now() - interval '7 days') AS activity_7d`,
      [orgId],
    );
    const row = rows[0] as {
      members: string;
      projects: string;
      tasks: string;
      tasks_done: string;
      files: string;
      events: string;
      activity_7d: string;
    };
    const tasks = Number(row.tasks);
    const tasksByStatus: { status: string; count: string }[] = await this.dataSource.query(
      `SELECT status, COUNT(*)::text AS count FROM tasks WHERE org_id = $1 GROUP BY status`,
      [orgId],
    );
    const recentActivity: AnalyticsSummary['recentActivity'] = await this.dataSource.query(
      `SELECT action, entity_type AS "entityType", actor_id AS "actorId", created_at AS "createdAt"
         FROM activity_logs WHERE org_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [orgId],
    );
    return {
      members: Number(row.members),
      projects: Number(row.projects),
      tasks,
      tasksDone: Number(row.tasks_done),
      completionRate: tasks > 0 ? Math.round((Number(row.tasks_done) / tasks) * 100) : 0,
      files: Number(row.files),
      events: Number(row.events),
      messages7d: 0,
      activity7d: Number(row.activity_7d),
      tasksByStatus,
      recentActivity,
    };
  }

  /** Role-hierarchy check: a MANAGER cannot grant roles above their own. */
  canManage(userRoles: string[]): boolean {
    const actorRank = Math.max(...userRoles.map((r) => ROLE_RANK[r as keyof typeof ROLE_RANK] ?? 0));
    return actorRank >= ROLE_RANK.MANAGER;
  }
}
