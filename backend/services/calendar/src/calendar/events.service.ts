import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AuthUser } from '../common/auth-user';
import { CalendarEvent } from './entities/calendar-event.entity';
import { DomainEventsService } from './domain-events.service';
import { CreateEventDto, UpdateEventDto } from './dto/events.dto';

export interface BusyWindow {
  startAt: string;
  endAt: string;
}

export interface AvailabilityResult {
  userId: string;
  busy: BusyWindow[];
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(CalendarEvent) private readonly events: Repository<CalendarEvent>,
    private readonly eventsBus: DomainEventsService,
  ) {}

  async list(
    orgId: string,
    userId: string,
    from: string,
    to: string,
    mine = false,
  ): Promise<CalendarEvent[]> {
    const query = this.events
      .createQueryBuilder('event')
      .where('event.orgId = :orgId', { orgId })
      .andWhere('event.startAt < :to', { to: new Date(to) })
      .andWhere('event.endAt > :from', { from: new Date(from) })
      .orderBy('event.startAt', 'ASC');
    if (mine) {
      query.andWhere(
        `event.organizerId = :userId OR event.attendees @> :attendeeJson::jsonb`,
        { userId, attendeeJson: JSON.stringify([{ userId }]) },
      );
    }
    return query.getMany();
  }

  async create(dto: CreateEventDto, user: AuthUser): Promise<CalendarEvent> {
    this.assertRange(dto.startAt, dto.endAt);
    const attendees = dto.attendeeIds
      ? dto.attendeeIds.map((attendeeId) => ({
          userId: attendeeId,
          status: attendeeId === user.sub ? ('accepted' as const) : ('pending' as const),
        }))
      : [];
    const event = await this.events.save(
      this.events.create({
        orgId: user.orgId,
        title: dto.title.trim(),
        description: dto.description ?? null,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        allDay: dto.allDay ?? false,
        location: dto.location ?? null,
        organizerId: user.sub,
        attendees,
        recurrenceRule: dto.recurrenceRule ?? null,
        reminderMinutes: dto.reminderMinutes ?? null,
      }),
    );
    if (event.reminderMinutes) {
      void this.eventsBus.publish('event.reminder', user.orgId, {
        eventId: event.id,
        title: event.title,
        startAt: event.startAt.toISOString(),
        reminderMinutes: event.reminderMinutes,
        userIds: [user.sub, ...attendees.map((a) => a.userId)],
      });
    }
    return event;
  }

  async update(orgId: string, eventId: string, dto: UpdateEventDto): Promise<CalendarEvent> {
    const event = await this.events.findOneBy({ id: eventId, orgId });
    if (!event) throw new NotFoundException('Event not found');
    const changes: Partial<CalendarEvent> = {};
    const allowed: (keyof UpdateEventDto)[] = [
      'title',
      'description',
      'startAt',
      'endAt',
      'allDay',
      'location',
      'recurrenceRule',
      'reminderMinutes',
    ];
    for (const key of allowed) {
      if (dto[key] !== undefined) (changes as Record<string, unknown>)[key] = dto[key];
    }
    await this.events.update({ id: eventId, orgId }, changes);
    return (await this.events.findOneBy({ id: eventId, orgId })) as CalendarEvent;
  }

  async remove(orgId: string, eventId: string): Promise<void> {
    const event = await this.events.findOneBy({ id: eventId, orgId });
    if (!event) throw new NotFoundException('Event not found');
    await this.events.delete(eventId);
  }

  async rsvp(orgId: string, eventId: string, userId: string, status: 'accepted' | 'declined'): Promise<CalendarEvent> {
    const event = await this.events.findOneBy({ id: eventId, orgId });
    if (!event) throw new NotFoundException('Event not found');
    const attendees = event.attendees.map((attendee) =>
      attendee.userId === userId ? { ...attendee, status } : attendee,
    );
    if (!attendees.some((attendee) => attendee.userId === userId)) {
      attendees.push({ userId, status });
    }
    event.attendees = attendees;
    await this.events.save(event);
    return event;
  }

  /** Free/busy lookup for a set of users over a time window. */
  async availability(orgId: string, userIds: string[], from: string, to: string): Promise<AvailabilityResult[]> {
    const events = await this.events.find({
      where: { orgId, startAt: Between(new Date(from), new Date(to)) },
    });
    return userIds.map((userId) => ({
      userId,
      busy: events
        .filter((event) => event.attendees.some((attendee) => attendee.userId === userId && attendee.status !== 'declined'))
        .map((event) => ({
          startAt: event.startAt.toISOString(),
          endAt: event.endAt.toISOString(),
        })),
    }));
  }

  private assertRange(startAt: string, endAt: string): void {
    if (new Date(endAt) <= new Date(startAt)) {
      throw new BadRequestException('Event end time must be after start time');
    }
  }
}
