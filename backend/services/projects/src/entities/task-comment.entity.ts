import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('task_comments')
export class TaskComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Index()
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId: string | null;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
