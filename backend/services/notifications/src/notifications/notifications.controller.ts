import { Controller, Get, Logger, Param, Patch, Query, Sse, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';

import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.notifications.list(user.sub, user.orgId, limit ? Number(limit) : 30, before);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.sub, user.orgId).then((count) => ({ count }));
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, user.orgId, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.sub, user.orgId);
  }

  /**
   * Server-Sent Events stream. EventSource cannot set Authorization headers,
   * so the JWT is passed as a query parameter for the MVP (production
   * guidance in docs/architecture.md).
   */
  @Public()
  @Sse('stream')
  stream(@Query('token') token: string) {
    let payload: { sub: string; orgId: string; type?: string };
    try {
      payload = this.jwt.verify<{ sub: string; orgId: string; type?: string }>(token, {
        secret: this.config.get('JWT_SECRET', 'nexusone-dev-secret-change-me'),
      });
    } catch {
      throw new UnauthorizedException('Invalid stream token');
    }
    if (payload.type !== 'access') throw new UnauthorizedException('Invalid stream token');
    this.logger.log(`SSE stream opened for user ${payload.sub}`);
    return this.notifications.stream(payload.sub, payload.orgId);
  }

}
