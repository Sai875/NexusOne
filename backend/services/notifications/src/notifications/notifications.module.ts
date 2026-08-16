import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsConsumer } from './events.consumer';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AppNotification, NotificationSchema } from './schemas/notification.schema';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { HealthController } from '../health.controller';
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
      { name: AppNotification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationsController, HealthController],
  providers: [
    NotificationsService,
    EventsConsumer,
    redisProvider,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class NotificationsModule {}
