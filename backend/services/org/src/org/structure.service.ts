import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from './audit.service';
import { Department } from './entities/department.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { DEMO_ORG_ID } from './demo.constants';

export interface OrgStructure {
  departments: (Department & { teams: Team[] })[];
  teams: Team[];
}

@Injectable()
export class StructureService implements OnModuleInit {
  private readonly logger = new Logger(StructureService.name);

  async onModuleInit(): Promise<void> {
    await this.bootstrapDemoStructure();
  }

  constructor(
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(TeamMember) private readonly teamMembers: Repository<TeamMember>,
    private readonly audit: AuditService,
  ) {}

  async structure(orgId: string): Promise<OrgStructure> {
    const [departments, teams] = await Promise.all([
      this.departments.find({ where: { orgId }, order: { name: 'ASC' } }),
      this.teams.find({ where: { orgId }, order: { name: 'ASC' } }),
    ]);
    return {
      departments: departments.map((department) => ({
        ...department,
        teams: teams.filter((team) => team.departmentId === department.id),
      })),
      teams,
    };
  }

  async createDepartment(orgId: string, name: string, headId: string | null, actorId: string): Promise<Department> {
    const department = await this.departments.save(
      this.departments.create({ orgId, name: name.trim(), headId }),
    );
    await this.audit.record({
      orgId,
      actorId,
      action: 'department.created',
      entityType: 'department',
      entityId: department.id,
      metadata: { name },
    });
    return department;
  }

  async createTeam(
    orgId: string,
    data: { name: string; description?: string | null; departmentId?: string | null },
    actorId: string,
  ): Promise<Team> {
    if (data.departmentId) {
      const department = await this.departments.findOneBy({ id: data.departmentId, orgId });
      if (!department) throw new BadRequestException('Department does not belong to this organization');
    }
    const team = await this.teams.save(
      this.teams.create({
        orgId,
        name: data.name.trim(),
        description: data.description ?? null,
        departmentId: data.departmentId ?? null,
      }),
    );
    await this.audit.record({
      orgId,
      actorId,
      action: 'team.created',
      entityType: 'team',
      entityId: team.id,
      metadata: { name: data.name },
    });
    return team;
  }

  async addTeamMember(orgId: string, teamId: string, userId: string, actorId: string): Promise<TeamMember> {
    const team = await this.teams.findOneBy({ id: teamId, orgId });
    if (!team) throw new NotFoundException('Team not found');
    const existing = await this.teamMembers.findOneBy({ teamId, userId });
    if (existing) throw new BadRequestException('User is already a member of this team');
    const member = await this.teamMembers.save(this.teamMembers.create({ teamId, userId }));
    await this.audit.record({
      orgId,
      actorId,
      action: 'team.member_added',
      entityType: 'team',
      entityId: teamId,
      metadata: { userId },
    });
    return member;
  }

  private async bootstrapDemoStructure(): Promise<void> {
    try {
      const count = await this.departments.countBy({ orgId: DEMO_ORG_ID });
      if (count > 0) return;
      await this.departments.save([
        this.departments.create({ orgId: DEMO_ORG_ID, name: 'Engineering', headId: '33333333-3333-4333-8333-333333333333' }),
        this.departments.create({ orgId: DEMO_ORG_ID, name: 'Product' }),
        this.departments.create({ orgId: DEMO_ORG_ID, name: 'People & Ops' }),
      ]);
      this.logger.log('Seeded demo departments for Nexus Labs');
    } catch (err) {
      this.logger.warn(`Demo structure bootstrap skipped: ${(err as Error).message}`);
    }
  }
}
