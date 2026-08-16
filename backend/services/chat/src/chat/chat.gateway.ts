import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../common/auth-user';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';

interface SocketData {
  user: AuthUser;
}

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly chat: ChatService,
    private readonly presence: PresenceService,
  ) {}

  afterInit(server: Server): void {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('Unauthorized'));
        const payload = await this.jwt.verifyAsync<AuthUser>(token, {
          secret: this.config.get('JWT_SECRET', 'nexusone-dev-secret-change-me'),
        });
        if (payload.type !== 'access') return next(new Error('Unauthorized'));
        socket.data = { user: payload } satisfies SocketData;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
    this.logger.log('Socket.IO gateway ready');
  }

  async handleConnection(socket: Socket): Promise<void> {
    const { user } = socket.data as SocketData;
    socket.join(`org:${user.orgId}`);
    await this.presence.setStatus(user.orgId, user.sub, 'online');
    this.server.to(`org:${user.orgId}`).emit('presence:update', {
      userId: user.sub,
      status: 'online',
    });
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const { user } = socket.data as SocketData;
    if (!user) return;
    await this.presence.setOffline(user.orgId, user.sub);
    this.server.to(`org:${user.orgId}`).emit('presence:update', {
      userId: user.sub,
      status: 'offline',
    });
  }

  @SubscribeMessage('channel:join')
  joinChannel(@ConnectedSocket() socket: Socket, @MessageBody() channelId: string): void {
    socket.join(`channel:${channelId}`);
  }

  @SubscribeMessage('channel:leave')
  leaveChannel(@ConnectedSocket() socket: Socket, @MessageBody() channelId: string): void {
    socket.leave(`channel:${channelId}`);
  }

  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { channelId: string; text: string; parentId?: string; mentions?: string[] },
  ): Promise<void> {
    const { user } = socket.data as SocketData;
    const message = await this.chat.sendMessage(
      payload.channelId,
      {
        text: payload.text,
        parentId: payload.parentId,
        mentions: payload.mentions,
      },
      user,
    );
    this.server.to(`channel:${payload.channelId}`).emit('message:new', message);
  }

  @SubscribeMessage('message:edit')
  async onEdit(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { messageId: string; text: string },
  ): Promise<void> {
    const { user } = socket.data as SocketData;
    const message = await this.chat.updateMessage(payload.messageId, { text: payload.text }, user);
    this.server.to(`org:${user.orgId}`).emit('message:updated', message);
  }

  @SubscribeMessage('message:delete')
  async onDelete(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { messageId: string },
  ): Promise<void> {
    const { user } = socket.data as SocketData;
    await this.chat.deleteMessage(payload.messageId, user);
    this.server.to(`org:${user.orgId}`).emit('message:deleted', {
      messageId: payload.messageId,
      authorId: user.sub,
    });
  }

  @SubscribeMessage('reaction:toggle')
  async onReaction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { messageId: string; emoji: string },
  ): Promise<void> {
    const { user } = socket.data as SocketData;
    const message = await this.chat.toggleReaction(payload.messageId, payload.emoji, user);
    this.server.to(`org:${user.orgId}`).emit('reaction:updated', message);
  }

  @SubscribeMessage('presence:update')
  async onPresence(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { status: 'online' | 'away' | 'in_meeting' | 'dnd' },
  ): Promise<void> {
    const { user } = socket.data as SocketData;
    await this.presence.setStatus(user.orgId, user.sub, payload.status);
    this.server.to(`org:${user.orgId}`).emit('presence:update', {
      userId: user.sub,
      status: payload.status,
    });
  }
}
