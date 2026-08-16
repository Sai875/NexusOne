import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('projects')
@Unique(['orgId', 'key'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string | null;

  @Column()
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: 'active' })
  status: 'active' | 'archived';

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
