import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Role } from '../common/role.constants';
import { Roles } from '../common/roles.decorator';
import { AuthService } from './auth.service';
import { AcceptInviteDto, CreateInviteDto } from './dto/invite.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchOrgDto } from './dto/switch-org.dto';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.logout(user.sub);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }

  @Post('switch-org')
  switchOrg(@CurrentUser() user: AuthUser, @Body() dto: SwitchOrgDto) {
    return this.auth.switchOrg(user.sub, dto.orgId);
  }

  @Roles(Role.ORG_ADMIN, Role.MANAGER)
  @Post('invites')
  createInvite(@CurrentUser() user: AuthUser, @Body() dto: CreateInviteDto) {
    return this.auth.createInvite(dto, user);
  }

  @Roles(Role.ORG_ADMIN, Role.MANAGER)
  @Get('invites')
  listInvites(@CurrentUser() user: AuthUser) {
    return this.auth.listInvites(user.orgId);
  }

  @Public()
  @Post('invite/accept')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.auth.acceptInvite(dto);
  }
}
