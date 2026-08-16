import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../entities/activity-log.entity';
import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';
import { Task } from '../entities/task.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { Workspace } from '../entities/workspace.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { REDIS, redisProvider } from '../common/redis.provider';
import { RolesGuard } from '../common/roles.guard';
import { DomainEventsService } from './domain-events.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

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
    TypeOrmModule.forFeature([Workspace, Project, Task, TaskComment, Sprint, ActivityLog]),
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    DomainEventsService,
    redisProvider,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class ProjectsModule {}
