import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn } from 'class-validator';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Role } from '../common/role.constants';
import { Roles } from '../common/roles.decorator';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { EntitlementsService } from './entitlements.service';

class UpdateRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(Object.values(Role), { each: true })
  roles: string[];
}

class UpdateEntitlementsDto {
  @IsArray()
  @ArrayNotEmpty()
  changes: { module: string; enabled: boolean }[];
}



@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ORG_ADMIN, Role.MANAGER)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly entitlements: EntitlementsService,
    private readonly audit: AuditService,
  ) {}

  @Get('members')
  listMembers(@CurrentUser() user: AuthUser) {
    return this.admin.listMembers(user.orgId);
  }

  @Roles(Role.ORG_ADMIN)
  @Patch('members/:userId/roles')
  updateMemberRoles(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateRolesDto,
  ) {
    return this.admin.updateMemberRoles(user.orgId, userId, dto.roles, user.sub);
  }

  @Roles(Role.ORG_ADMIN)
  @Delete('members/:userId')
  async removeMember(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    await this.admin.removeMember(user.orgId, userId, user.sub);
    return { ok: true };
  }

  @Get('entitlements')
  listEntitlements(@CurrentUser() user: AuthUser) {
    return this.entitlements.list(user.orgId);
  }

  @Roles(Role.ORG_ADMIN)
  @Patch('entitlements')
  async updateEntitlements(@CurrentUser() user: AuthUser, @Body() dto: UpdateEntitlementsDto) {
    const updated = await this.entitlements.setMany(user.orgId, dto.changes);
    await this.audit.record({
      orgId: user.orgId,
      actorId: user.sub,
      action: 'entitlements.updated',
      entityType: 'organization',
      entityId: user.orgId,
      metadata: { changes: dto.changes },
    });
    return updated;
  }

  @Get('analytics')
  analytics(@CurrentUser() user: AuthUser) {
    return this.admin.analytics(user.orgId);
  }

  @Get('audit-logs')
  auditLogs(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.audit.list(user.orgId, limit ? Number(limit) : 50);
  }
}


