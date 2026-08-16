import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvent } from './entities/calendar-event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { DomainEventsService } from './domain-events.service';
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
    TypeOrmModule.forFeature([CalendarEvent]),
  ],
  controllers: [EventsController, HealthController],
  providers: [
    EventsService,
    DomainEventsService,
    redisProvider,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class CalendarModule {}
