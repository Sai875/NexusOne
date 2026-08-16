import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Role } from '../common/role.constants';
import { Roles } from '../common/roles.decorator';
import { EntitlementsService } from './entitlements.service';
import { StructureService } from './structure.service';

class CreateDepartmentDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsUUID()
  headId?: string;
}

class CreateTeamDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

@ApiTags('orgs')
@ApiBearerAuth()
@Controller('orgs')
export class OrgController {
  constructor(
    private readonly structure: StructureService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** Shell data for the frontend: org + module flags + structure. */
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const [modules, orgStructure] = await Promise.all([
      this.entitlements.list(user.orgId),
      this.structure.structure(user.orgId),
    ]);
    return {
      org: { id: user.orgId, name: user.orgName, slug: user.orgSlug },
      modules: modules.map((m) => ({ key: m.module, enabled: m.enabled })),
      structure: orgStructure,
    };
  }

  @Get('structure')
  orgStructure(@CurrentUser() user: AuthUser) {
    return this.structure.structure(user.orgId);
  }

  @Get('entitlements')
  moduleEntitlements(@CurrentUser() user: AuthUser) {
    return this.entitlements.list(user.orgId);
  }

  @Roles(Role.ORG_ADMIN, Role.MANAGER)
  @Post('departments')
  createDepartment(@CurrentUser() user: AuthUser, @Body() dto: CreateDepartmentDto) {
    return this.structure.createDepartment(user.orgId, dto.name, dto.headId ?? null, user.sub);
  }

  @Roles(Role.ORG_ADMIN, Role.MANAGER)
  @Post('teams')
  createTeam(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.structure.createTeam(
      user.orgId,
      { name: dto.name, description: dto.description ?? null, departmentId: dto.departmentId ?? null },
      user.sub,
    );
  }

  @Roles(Role.ORG_ADMIN, Role.MANAGER)
  @Post('teams/:teamId/members')
  addTeamMember(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Body('userId') userId: string,
  ) {
    return this.structure.addTeamMember(user.orgId, teamId, userId, user.sub);
  }

}
