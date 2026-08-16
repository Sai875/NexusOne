import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('departments')
@Unique(['orgId', 'name'])
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column()
  name: string;

  @Column({ name: 'head_id', type: 'uuid', nullable: true })
  headId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
