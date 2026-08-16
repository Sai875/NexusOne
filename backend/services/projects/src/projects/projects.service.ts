import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthUser } from '../common/auth-user';
import { ActivityLog } from '../entities/activity-log.entity';
import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';
import { Task, TASK_STATUSES, TaskStatus } from '../entities/task.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { Workspace } from '../entities/workspace.entity';
import { CreateProjectDto, CreateSprintDto, CreateTaskDto, CreateWorkspaceDto, UpdateTaskDto } from './dto/projects.dto';
import { DomainEventsService } from './domain-events.service';
import { DEMO_PROJECTS } from './demo-data';

@Injectable()
export class ProjectsService implements OnModuleInit {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Workspace) private readonly workspaces: Repository<Workspace>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(TaskComment) private readonly comments: Repository<TaskComment>,
    @InjectRepository(Sprint) private readonly sprints: Repository<Sprint>,
    @InjectRepository(ActivityLog) private readonly activityRepo: Repository<ActivityLog>,
    private readonly events: DomainEventsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrapDemoData();
  }

  // ── Workspaces ───────────────────────────────────────────────────────────

  listWorkspaces(orgId: string): Promise<Workspace[]> {
    return this.workspaces.find({ where: { orgId }, order: { createdAt: 'ASC' } });
  }

  async createWorkspace(dto: CreateWorkspaceDto, user: AuthUser): Promise<Workspace> {
    const workspace = await this.workspaces.save(
      this.workspaces.create({
        orgId: user.orgId,
        name: dto.name.trim(),
        description: dto.description ?? null,
        createdBy: user.sub,
      }),
    );
    await this.recordActivity(user, 'workspace', workspace.id, 'workspace.created', { name: dto.name });
    return workspace;
  }

  // ── Projects ─────────────────────────────────────────────────────────────

  listProjects(orgId: string, workspaceId?: string): Promise<Project[]> {
    return this.projects.find({
      where: workspaceId ? { orgId, workspaceId } : { orgId },
      order: { createdAt: 'DESC' },
    });
  }

  async getProject(orgId: string, projectId: string): Promise<{ project: Project; taskCount: number }> {
    const project = await this.projects.findOneBy({ id: projectId, orgId });
    if (!project) throw new NotFoundException('Project not found');
    const taskCount = await this.tasks.countBy({ projectId, orgId });
    return { project, taskCount };
  }

  async createProject(dto: CreateProjectDto, user: AuthUser): Promise<Project> {
    const key = dto.key?.toUpperCase().trim() || this.generateKey(dto.name);
    const existing = await this.projects.findOneBy({ orgId: user.orgId, key });
    if (existing) throw new ConflictException(`Project key ${key} already exists`);
    const project = await this.projects.save(
      this.projects.create({
        orgId: user.orgId,
        workspaceId: dto.workspaceId ?? null,
        key,
        name: dto.name.trim(),
        description: dto.description ?? null,
        startDate: dto.startDate ?? null,
        dueDate: dto.dueDate ?? null,
        ownerId: user.sub,
      }),
    );
    await this.recordActivity(user, 'project', project.id, 'project.created', { key, name: dto.name });
    return project;
  }

  async updateProject(orgId: string, projectId: string, changes: Partial<Pick<Project, 'name' | 'description' | 'status' | 'dueDate' | 'startDate'>>): Promise<Project> {
    await this.projects.update({ id: projectId, orgId }, changes);
    const updated = await this.projects.findOneBy({ id: projectId, orgId });
    if (!updated) throw new NotFoundException('Project not found');
    return updated;
  }

  /** Kanban-style board grouped by task status. */
  async board(orgId: string, projectId: string): Promise<{ statuses: { key: TaskStatus; label: string; tasks: Task[] }[] }> {
    const project = await this.projects.findOneBy({ id: projectId, orgId });
    if (!project) throw new NotFoundException('Project not found');
    const tasks = await this.tasks.find({ where: { projectId, orgId }, order: { orderIndex: 'ASC', updatedAt: 'DESC' } });
    const labels: Record<string, string> = {
      todo: 'To Do',
      in_progress: 'In Progress',
      in_review: 'In Review',
      done: 'Done',
    };
    return {
      statuses: TASK_STATUSES.map((key) => ({
        key,
        label: labels[key],
        tasks: tasks.filter((task) => task.status === key),
      })),
    };
  }

  // ── Tasks ────────────────────────────────────────────────────────────────

  listTasks(orgId: string, projectId?: string, assigneeId?: string): Promise<Task[]> {
    return this.tasks.find({
      where: {
        orgId,
        ...(projectId ? { projectId } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getTask(orgId: string, taskId: string): Promise<{ task: Task; comments: TaskComment[] }> {
    const task = await this.tasks.findOneBy({ id: taskId, orgId });
    if (!task) throw new NotFoundException('Task not found');
    const comments = await this.comments.find({ where: { taskId }, order: { createdAt: 'ASC' } });
    return { task, comments };
  }

  async createTask(dto: CreateTaskDto, user: AuthUser): Promise<Task> {
    const project = await this.projects.findOneBy({ id: dto.projectId, orgId: user.orgId });
    if (!project) throw new NotFoundException('Project not found');
    const task = await this.tasks.save(
      this.tasks.create({
        orgId: user.orgId,
        projectId: dto.projectId,
        parentId: dto.parentId ?? null,
        title: dto.title.trim(),
        description: dto.description ?? null,
        status: dto.status ?? 'todo',
        priority: dto.priority ?? 'medium',
        assigneeId: dto.assigneeId ?? null,
        reporterId: user.sub,
        dueDate: dto.dueDate ?? null,
        estimatedHours: dto.estimatedHours != null ? String(dto.estimatedHours) : null,
        labels: dto.labels ?? [],
      }),
    );
    await this.recordActivity(user, 'task', task.id, 'task.created', {
      projectId: dto.projectId,
      title: dto.title,
      status: task.status,
    });
    await this.notifyAssignment(task, user);
    return task;
  }

  async updateTask(orgId: string, taskId: string, dto: UpdateTaskDto, user: AuthUser): Promise<Task> {
    const task = await this.tasks.findOneBy({ id: taskId, orgId });
    if (!task) throw new NotFoundException('Task not found');

    const changes: Partial<Task> = {};
    const allowed: (keyof UpdateTaskDto)[] = [
      'title',
      'description',
      'status',
      'priority',
      'assigneeId',
      'dueDate',
      'estimatedHours',
      'labels',
      'orderIndex',
    ];
    for (const key of allowed) {
      if (dto[key] !== undefined) (changes as Record<string, unknown>)[key] = dto[key];
    }
    await this.tasks.update({ id: taskId, orgId }, changes);

    const updated = (await this.tasks.findOneBy({ id: taskId, orgId })) as Task;
    await this.recordActivity(user, 'task', taskId, 'task.updated', {
      changed: Object.keys(changes),
      from: { status: task.status, assigneeId: task.assigneeId },
    });
    await this.notifyAssignment(updated, user, task.assigneeId);
    return updated;
  }

  async deleteTask(orgId: string, taskId: string, user: AuthUser): Promise<void> {
    const task = await this.tasks.findOneBy({ id: taskId, orgId });
    if (!task) throw new NotFoundException('Task not found');
    await this.tasks.delete(taskId);
    await this.recordActivity(user, 'task', taskId, 'task.deleted', { title: task.title });
  }

  async addComment(orgId: string, taskId: string, body: string, user: AuthUser): Promise<TaskComment> {
    const task = await this.tasks.findOneBy({ id: taskId, orgId });
    if (!task) throw new NotFoundException('Task not found');
    const comment = await this.comments.save(
      this.comments.create({ orgId, taskId, authorId: user.sub, body }),
    );
    await this.recordActivity(user, 'task', taskId, 'task.commented', { commentId: comment.id });
    return comment;
  }

  // ── Sprints ──────────────────────────────────────────────────────────────

  listSprints(orgId: string, projectId?: string): Promise<Sprint[]> {
    return this.sprints.find({
      where: projectId ? { orgId, projectId } : { orgId },
      order: { startDate: 'ASC' },
    });
  }

  async createSprint(dto: CreateSprintDto, user: AuthUser): Promise<Sprint> {
    const project = await this.projects.findOneBy({ id: dto.projectId, orgId: user.orgId });
    if (!project) throw new NotFoundException('Project not found');
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('Sprint end date must be after start date');
    }
    const sprint = await this.sprints.save(
      this.sprints.create({
        orgId: user.orgId,
        projectId: dto.projectId,
        name: dto.name.trim(),
        goal: dto.goal ?? null,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status ?? 'planned',
      }),
    );
    await this.recordActivity(user, 'sprint', sprint.id, 'sprint.created', { name: dto.name });
    return sprint;
  }

  // ── Activity ─────────────────────────────────────────────────────────────

  async activity(orgId: string, limit = 30, projectId?: string): Promise<ActivityLog[]> {
    const taskIds = projectId
      ? (await this.tasks.find({ where: { projectId, orgId }, select: { id: true } })).map((t) => t.id)
      : [];
    const where: Record<string, unknown> = { orgId };
    if (projectId) where.entityId = In([projectId, ...taskIds]);
    return this.activityRepo.find({ where, order: { createdAt: 'DESC' }, take: Math.min(limit, 100) });
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async notifyAssignment(task: Task, actor: AuthUser, previousAssignee?: string | null): Promise<void> {
    if (!task.assigneeId) return;
    if (task.assigneeId === previousAssignee || task.assigneeId === actor.sub) return;
    void this.events.publish('task.assigned', task.orgId, {
      taskId: task.id,
      projectId: task.projectId,
      title: task.title,
      assigneeId: task.assigneeId,
      assignerId: actor.sub,
    });
  }

  private recordActivity(
    user: AuthUser,
    entityType: string,
    entityId: string,
    action: string,
    metadata: Record<string, unknown> = {},
  ): Promise<ActivityLog> {
    return this.activityRepo.save(
      this.activityRepo.create({
        orgId: user.orgId,
        entityType,
        entityId,
        actorId: user.sub,
        action,
        metadata,
      }),
    );
  }

  private generateKey(name: string): string {
    const base = name
      .replace(/[^a-zA-Z0-9]+/g, '')
      .toUpperCase()
      .slice(0, 4);
    return `${base || 'PRJ'}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  private async bootstrapDemoData(): Promise<void> {
    try {
      const count = await this.projects.count();
      if (count > 0) return;
      for (const demo of DEMO_PROJECTS) {
        await this.workspaces.save(this.workspaces.create({ ...demo.workspace }));
        await this.projects.save(this.projects.create({ ...demo.project }));
        for (const task of demo.tasks) {
          await this.tasks.save(this.tasks.create(task));
        }
      }
      this.logger.log('Seeded demo projects, tasks and sprints');
    } catch (err) {
      this.logger.warn(`Demo projects bootstrap skipped: ${(err as Error).message}`);
    }
  }
}
