import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Index()
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: 'todo' })
  status: TaskStatus;

  @Column({ default: 'medium' })
  priority: TaskPriority;

  @Index()
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null;

  @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
  reporterId: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ name: 'estimated_hours', type: 'numeric', nullable: true })
  estimatedHours: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  labels: string[];

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
