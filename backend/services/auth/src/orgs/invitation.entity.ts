import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column()
  email: string;

  @Column({ default: 'EMPLOYEE' })
  role: string;

  @Column({ unique: true })
  token: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
