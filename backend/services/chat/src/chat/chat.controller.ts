import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { ChatService } from './chat.service';
import {
  CreateChannelDto,
  ReactionDto,
  SearchQueryDto,
  SendMessageDto,
  UpdateMessageDto,
} from './dto/chat.dto';
import { PresenceService } from './presence.service';

@ApiTags('chat')
@ApiBearerAuth()
@Controller()
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly presence: PresenceService,
  ) {}

  @Get('channels')
  listChannels(@CurrentUser() user: AuthUser) {
    return this.chat.listChannels(user.orgId, user.sub);
  }

  @Post('channels')
  createChannel(@CurrentUser() user: AuthUser, @Body() dto: CreateChannelDto) {
    return this.chat.createChannel(dto, user);
  }

  @Get('channels/:id/messages')
  getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') channelId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.getMessages(user.orgId, channelId, user.sub, before, limit ? Number(limit) : 50);
  }

  @Post('channels/:id/messages')
  sendMessage(@CurrentUser() user: AuthUser, @Param('id') channelId: string, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(channelId, dto, user);
  }

  @Get('channels/:id/thread/:messageId')
  getThread(
    @CurrentUser() user: AuthUser,
    @Param('id') _channelId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chat.getThread(user.orgId, messageId, user.sub);
  }

  @Patch('messages/:id')
  updateMessage(@CurrentUser() user: AuthUser, @Param('id') messageId: string, @Body() dto: UpdateMessageDto) {
    return this.chat.updateMessage(messageId, dto, user);
  }

  @Delete('messages/:id')
  async deleteMessage(@CurrentUser() user: AuthUser, @Param('id') messageId: string) {
    await this.chat.deleteMessage(messageId, user);
    return { ok: true };
  }

  @Post('messages/:id/reactions')
  toggleReaction(@CurrentUser() user: AuthUser, @Param('id') messageId: string, @Body() dto: ReactionDto) {
    return this.chat.toggleReaction(messageId, dto.emoji, user);
  }

  @Get('search')
  search(@CurrentUser() user: AuthUser, @Query() query: SearchQueryDto) {
    return this.chat.search(user.orgId, query.q, query.limit);
  }

  @Get('presence/online')
  async onlineUsers(@CurrentUser() user: AuthUser) {
    const userIds = await this.presence.onlineUserIds(user.orgId);
    return { orgId: user.orgId, userIds, count: userIds.length };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'chat', timestamp: new Date().toISOString() };
  }
}
