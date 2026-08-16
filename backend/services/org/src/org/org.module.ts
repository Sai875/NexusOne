import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { Department } from './entities/department.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { Entitlement } from './entities/entitlement.entity';
import { AuditLog } from './entities/audit-log.entity';
import { EntitlementsService } from './entitlements.service';
import { EventsConsumer } from './events.consumer';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { REDIS, redisProvider } from '../common/redis.provider';
import { StructureService } from './structure.service';
import { OrgController } from './org.controller';
import { HealthController } from '../health.controller';

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
    TypeOrmModule.forFeature([Department, Team, TeamMember, Entitlement, AuditLog]),
  ],
  controllers: [OrgController, AdminController, HealthController],
  providers: [
    StructureService,
    EntitlementsService,
    AuditService,
    AdminService,
    EventsConsumer,
    redisProvider,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class OrgModule {}
