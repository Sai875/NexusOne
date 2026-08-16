import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('entitlements')
@Unique(['orgId', 'module'])
export class Entitlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column()
  module: string;

  @Column({ default: true })
  enabled: boolean;
}
