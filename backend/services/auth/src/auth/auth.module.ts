import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { HealthController } from '../health.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Organization } from '../orgs/organization.entity';
import { Membership } from '../orgs/membership.entity';
import { Invitation } from '../orgs/invitation.entity';
import { RefreshToken } from './refresh-token.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { REDIS, redisProvider } from '../common/redis.provider';
import { DomainEventsService } from '../common/domain-events.service';

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
    TypeOrmModule.forFeature([User, Organization, Membership, Invitation, RefreshToken]),
  ],
  controllers: [AuthController, HealthController],
  providers: [
    AuthService,
    UsersService,
    DomainEventsService,
    redisProvider,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [UsersService],
})
export class AuthModule {}
