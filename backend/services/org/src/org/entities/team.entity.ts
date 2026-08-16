import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('teams')
@Unique(['orgId', 'name'])
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
