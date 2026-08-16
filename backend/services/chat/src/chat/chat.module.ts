import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { PresenceService } from './presence.service';
import { EventsConsumer } from './events.consumer';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { REDIS, redisProvider } from '../common/redis.provider';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'nexusone-dev-secret-change-me'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '8h') },
      }),
    }),
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    PresenceService,
    EventsConsumer,
    redisProvider,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class ChatModule {}
