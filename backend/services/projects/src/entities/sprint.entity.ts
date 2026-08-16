import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sprints')
export class Sprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Index()
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  goal: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ default: 'planned' })
  status: 'planned' | 'active' | 'completed';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
