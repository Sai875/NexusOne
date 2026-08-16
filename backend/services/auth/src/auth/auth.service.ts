import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { Invitation } from '../orgs/invitation.entity';
import { Membership } from '../orgs/membership.entity';
import { Organization } from '../orgs/organization.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthUser } from '../common/auth-user';
import { DomainEventsService } from '../common/domain-events.service';
import { Role } from '../common/role.constants';
import { DEMO_ORG, DEMO_USERS } from '../seed/demo-data';
import { RefreshToken } from './refresh-token.entity';
import { AcceptInviteDto, CreateInviteDto } from './dto/invite.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

export interface OrgSummary {
  id: string;
  slug: string;
  name: string;
  roles: string[];
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  orgs: OrgSummary[];
  currentOrg: OrgSummary;
}

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Organization) private readonly orgs: Repository<Organization>,
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>,
    @InjectRepository(Invitation) private readonly invitations: Repository<Invitation>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: DomainEventsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrapDemoData();
  }

  // ── Session lifecycle ────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<Session> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('An account with this email already exists');

    const user = await this.usersService.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash: bcrypt.hashSync(dto.password, 10),
    });

    const orgName = dto.orgName?.trim() || `${user.name.split(' ')[0]}'s Organization`;
    const org = await this.orgs.save(
      this.orgs.create({
        name: orgName,
        slug: await this.uniqueSlug(orgName),
        createdBy: user.id,
      }),
    );

    const membership = await this.memberships.save(
      this.memberships.create({ userId: user.id, orgId: org.id, roles: [Role.ORG_ADMIN] }),
    );

    // Fire-and-forget: chat creates default channels, org service seeds
    // entitlements, notifications may welcome the new admin.
    void this.events.publish('org.created', org.id, {
      orgName: org.name,
      createdBy: user.id,
    });

    return this.buildSession(user, org, membership);
  }

  async login(dto: LoginDto): Promise<Session> {
    const user = await this.usersService.findWithPassword(dto.email.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    const membership = await this.defaultMembership(user.id);
    if (!membership) throw new UnauthorizedException('No active organization membership found');

    const org = await this.orgs.findOneBy({ id: membership.orgId });
    if (!org) throw new UnauthorizedException('Organization not found');

    return this.buildSession(user, org, membership);
  }

  async refresh(dto: RefreshDto): Promise<Session> {
    let payload: { sub: string; jti: string; orgId: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(dto.refreshToken, {
        secret: this.config.get('JWT_SECRET', 'nexusone-dev-secret-change-me'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Malformed refresh token');
    }

    const record = await this.refreshTokens.findOneBy({ jti: payload.jti });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('Account unavailable');

    // Rotate: revoke the presented token and issue a fresh pair.
    await this.refreshTokens.update(record.id, { revokedAt: new Date() });

    const membership = await this.memberships.findOneBy({
      userId: user.id,
      orgId: payload.orgId,
      status: 'active',
    });
    if (!membership) throw new UnauthorizedException('Organization membership no longer active');
    const org = await this.orgs.findOneBy({ id: membership.orgId });
    if (!org) throw new UnauthorizedException('Organization not found');

    return this.buildSession(user, org, membership);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokens.update({ userId }, { revokedAt: new Date() });
  }

  async me(userId: string): Promise<Session['user'] & { orgs: OrgSummary[]; currentOrg: OrgSummary }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const summary = await this.summarizeOrgs(user);
    return { ...this.userShape(user), orgs: summary.orgs, currentOrg: summary.currentOrg };
  }

  async switchOrg(userId: string, orgId: string): Promise<Session> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const membership = await this.memberships.findOneBy({ userId, orgId, status: 'active' });
    if (!membership) throw new BadRequestException('No membership in the target organization');
    const org = await this.orgs.findOneBy({ id: orgId });
    if (!org) throw new NotFoundException('Organization not found');
    return this.buildSession(user, org, membership);
  }

  // ── Invitations ──────────────────────────────────────────────────────────

  async createInvite(dto: CreateInviteDto, actor: AuthUser): Promise<Invitation> {
    const token = randomBytes(32).toString('hex');
    const invite = await this.invitations.save(
      this.invitations.create({
        orgId: actor.orgId,
        email: dto.email.toLowerCase().trim(),
        role: dto.role,
        token,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        invitedBy: actor.sub,
      }),
    );
    this.logger.log(`Invitation ${invite.token} created for ${invite.email} by ${actor.sub}`);
    return invite;
  }

  async listInvites(orgId: string): Promise<Invitation[]> {
    return this.invitations.find({ where: { orgId, acceptedAt: IsNull() }, order: { createdAt: 'DESC' } });
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<Session> {
    const invite = await this.invitations.findOneBy({ token: dto.token.trim() });
    if (!invite || invite.acceptedAt) throw new BadRequestException('Invitation not found or already used');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invitation has expired');

    let user = await this.usersService.findByEmail(invite.email);
    if (!user) {
      user = await this.usersService.create({
        name: dto.name.trim(),
        email: invite.email,
        passwordHash: bcrypt.hashSync(dto.password, 10),
      });
    }

    let membership = await this.memberships.findOneBy({ userId: user.id, orgId: invite.orgId });
    if (!membership) {
      membership = await this.memberships.save(
        this.memberships.create({ userId: user.id, orgId: invite.orgId, roles: [invite.role] }),
      );
    }

    await this.invitations.update(invite.id, { acceptedAt: new Date() });

    void this.events.publish('invite.accepted', invite.orgId, {
      userId: user.id,
      email: user.email,
      invitedBy: invite.invitedBy,
    });

    const org = await this.orgs.findOneBy({ id: invite.orgId });
    if (!org) throw new NotFoundException('Organization not found');
    return this.buildSession(user, org, membership);
  }

  // ── Session helpers ──────────────────────────────────────────────────────

  private async buildSession(user: User, org: Organization, membership: Membership): Promise<Session> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      name: user.name,
      orgId: org.id,
      orgName: org.name,
      orgSlug: org.slug,
      roles: membership.roles,
      type: 'access',
    });

    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti, orgId: org.id, type: 'refresh' },
      { expiresIn: '7d' },
    );
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        jti,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      }),
    );

    const summary = await this.summarizeOrgs(user);
    return {
      accessToken,
      refreshToken,
      user: this.userShape(user),
      orgs: summary.orgs,
      currentOrg: summary.currentOrg,
    };
  }

  private async summarizeOrgs(user: User): Promise<{ orgs: OrgSummary[]; currentOrg: OrgSummary }> {
    const memberships = await this.memberships.find({
      where: { userId: user.id, status: 'active' },
      order: { createdAt: 'ASC' },
    });
    const orgs: OrgSummary[] = [];
    for (const membership of memberships) {
      const org = await this.orgs.findOneBy({ id: membership.orgId });
      if (org) orgs.push({ id: org.id, slug: org.slug, name: org.name, roles: membership.roles });
    }
    const currentOrg = orgs[0];
    if (!currentOrg) throw new UnauthorizedException('No active organization membership found');
    return { orgs, currentOrg };
  }

  private defaultMembership(userId: string): Promise<Membership | null> {
    return this.memberships.findOne({
      where: { userId, status: 'active' },
      order: { createdAt: 'ASC' },
    });
  }

  private userShape(user: User): Session['user'] {
    return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
  }

  private async uniqueSlug(base: string): Promise<string> {
    const slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const candidate = slug || 'org';
    if (!(await this.orgs.findOneBy({ slug: candidate }))) return candidate;
    return `${candidate}-${randomBytes(3).toString('hex')}`;
  }

  // ── Demo data bootstrap (idempotent) ─────────────────────────────────────

  private async bootstrapDemoData(): Promise<void> {
    try {
      const userCount = await this.users.count();
      if (userCount > 0) return;

      const org = await this.orgs.save(
        this.orgs.create({
          id: DEMO_ORG.id,
          name: DEMO_ORG.name,
          slug: DEMO_ORG.slug,
          createdBy: DEMO_USERS[0].id,
        }),
      );

      for (const demo of DEMO_USERS) {
        // Explicit IDs keep cross-service references in seed.sql valid.
        await this.users.save(
          this.users.create({
            id: demo.id,
            name: demo.name,
            email: demo.email,
            passwordHash: bcrypt.hashSync(demo.password, 10),
          }),
        );
        await this.memberships.save(
          this.memberships.create({
            userId: demo.id,
            orgId: org.id,
            roles: [demo.role],
          }),
        );
      }

      void this.events.publish('org.created', org.id, {
        orgName: org.name,
        createdBy: DEMO_USERS[0].id,
      });

      this.logger.log('Seeded demo organization "Nexus Labs" with 5 demo users');
      this.logger.log('Demo admin login: alice.admin@nexuslabs.io / Admin@123');
    } catch (err) {
      this.logger.warn(`Demo bootstrap skipped: ${(err as Error).message}`);
    }
  }
}
