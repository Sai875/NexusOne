import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from '../src/projects/projects.service';
import { Task } from '../src/entities/task.entity';

const user = {
  sub: '22222222-2222-4222-8222-222222222222',
  email: 'a@x.io',
  name: 'Alice',
  orgId: 'org-1',
  orgName: 'Org',
  orgSlug: 'org',
  roles: ['ORG_ADMIN'],
  type: 'access' as const,
};

function makeService(overrides: { task?: Partial<Task> } = {}) {
  const baseTask: Task = {
    id: 'task-1',
    orgId: 'org-1',
    projectId: 'project-1',
    parentId: null,
    title: 'Do the thing',
    description: null,
    status: 'todo',
    priority: 'medium',
    assigneeId: null,
    reporterId: user.sub,
    dueDate: null,
    estimatedHours: null,
    labels: [],
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const task = { ...baseTask, ...overrides.task };

  const repos = {
    workspaces: {},
    projects: {
      findOneBy: jest.fn().mockResolvedValue({ id: 'project-1', orgId: 'org-1' }),
    },
    tasks: {
      findOneBy: jest.fn().mockResolvedValue(task),
      update: jest.fn(async () => ({ affected: 1 })),
      countBy: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockResolvedValue([task]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    },
    comments: {
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((entity) => entity),
      find: jest.fn().mockResolvedValue([]),
    },
    sprints: {},
    activity: {
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((entity) => entity),
      find: jest.fn().mockResolvedValue([]),
    },
  };
  const events = { publish: jest.fn().mockResolvedValue(undefined) };

  const service = new ProjectsService(
    repos.workspaces as never,
    repos.projects as never,
    repos.tasks as never,
    repos.comments as never,
    repos.sprints as never,
    repos.activity as never,
    events as never,
  );
  return { service, repos, events };
}

describe('ProjectsService', () => {
  it('emits a task.assigned event when the assignee changes', async () => {
    const { service, events, repos } = makeService();
    repos.tasks.findOneBy.mockResolvedValueOnce({
      id: 'task-1',
      orgId: 'org-1',
      projectId: 'project-1',
      title: 'Do the thing',
      status: 'todo',
      assigneeId: null,
    } as Task);
    // After update: assignee set to carol
    repos.tasks.findOneBy.mockResolvedValueOnce({
      id: 'task-1',
      orgId: 'org-1',
      projectId: 'project-1',
      title: 'Do the thing',
      status: 'todo',
      assigneeId: '44444444-4444-4444-8444-444444444444',
    } as Task);

    await service.updateTask(
      'org-1',
      'task-1',
      { assigneeId: '44444444-4444-4444-8444-444444444444' },
      user,
    );

    expect(events.publish).toHaveBeenCalledWith(
      'task.assigned',
      'org-1',
      expect.objectContaining({
        taskId: 'task-1',
        assigneeId: '44444444-4444-4444-8444-444444444444',
        assignerId: user.sub,
      }),
    );
  });

  it('does not emit when the assignee is unchanged', async () => {
    const { service, events, repos } = makeService({
      task: { assigneeId: '44444444-4444-4444-8444-444444444444' },
    });
    await service.updateTask(
      'org-1',
      'task-1',
      { assigneeId: '44444444-4444-4444-8444-444444444444' },
      user,
    );
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('throws when the task is missing', async () => {
    const { service, repos } = makeService();
    repos.tasks.findOneBy.mockResolvedValue(null);
    await expect(service.updateTask('org-1', 'nope', { status: 'done' }, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
