import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
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
  ],
  controllers: [CopilotController, HealthController],
  providers: [CopilotService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class CopilotModule {}
