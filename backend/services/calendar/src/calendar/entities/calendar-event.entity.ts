import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface Attendee {
  userId: string;
  status: 'pending' | 'accepted' | 'declined';
}

@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({ name: 'all_day', default: false })
  allDay: boolean;

  @Column({ type: 'text', nullable: true })
  location: string | null;

  @Column({ name: 'organizer_id', type: 'uuid', nullable: true })
  organizerId: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  attendees: Attendee[];

  @Column({ name: 'recurrence_rule', type: 'text', nullable: true })
  recurrenceRule: string | null;

  @Column({ name: 'reminder_minutes', type: 'int', nullable: true })
  reminderMinutes: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
