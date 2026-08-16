import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('memberships')
@Unique(['userId', 'orgId'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ type: 'jsonb', default: () => "'[\"EMPLOYEE\"]'::jsonb" })
  roles: string[];

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
