import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('team_members')
@Unique(['teamId', 'userId'])
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ default: 'member' })
  role: string;
}
