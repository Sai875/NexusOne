import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { ProjectsService } from './projects.service';
import {
  CreateCommentDto,
  CreateProjectDto,
  CreateSprintDto,
  CreateTaskDto,
  CreateWorkspaceDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from './dto/projects.dto';

@ApiTags('projects')
@ApiBearerAuth()
@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('workspaces')
  listWorkspaces(@CurrentUser() user: AuthUser) {
    return this.projects.listWorkspaces(user.orgId);
  }

  @Post('workspaces')
  createWorkspace(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkspaceDto) {
    return this.projects.createWorkspace(dto, user);
  }

  @Get('projects')
  listProjects(@CurrentUser() user: AuthUser, @Query('workspaceId') workspaceId?: string) {
    return this.projects.listProjects(user.orgId, workspaceId);
  }

  @Post('projects')
  createProject(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projects.createProject(dto, user);
  }

  @Get('projects/:id')
  getProject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.getProject(user.orgId, id);
  }

  @Patch('projects/:id')
  updateProject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.updateProject(user.orgId, id, dto);
  }

  @Get('projects/:id/board')
  board(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.board(user.orgId, id);
  }

  @Get('projects/:id/tasks')
  projectTasks(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.listTasks(user.orgId, id);
  }

  @Get('projects/:id/activity')
  projectActivity(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('limit') limit?: string) {
    return this.projects.activity(user.orgId, limit ? Number(limit) : 30, id);
  }

  @Get('tasks')
  listTasks(
    @CurrentUser() user: AuthUser,
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.projects.listTasks(user.orgId, projectId, assigneeId);
  }

  @Post('tasks')
  createTask(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.projects.createTask(dto, user);
  }

  @Get('tasks/:id')
  getTask(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.getTask(user.orgId, id);
  }

  @Patch('tasks/:id')
  updateTask(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.projects.updateTask(user.orgId, id, dto, user);
  }

  @Delete('tasks/:id')
  async deleteTask(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.projects.deleteTask(user.orgId, id, user);
    return { ok: true };
  }

  @Post('tasks/:id/comments')
  addComment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateCommentDto) {
    return this.projects.addComment(user.orgId, id, dto.body, user);
  }

  @Get('sprints')
  listSprints(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.projects.listSprints(user.orgId, projectId);
  }

  @Post('sprints')
  createSprint(@CurrentUser() user: AuthUser, @Body() dto: CreateSprintDto) {
    return this.projects.createSprint(dto, user);
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'projects', timestamp: new Date().toISOString() };
  }
}
