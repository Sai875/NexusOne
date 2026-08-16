'use client';

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/lib/types';

interface MonthViewProps {
  month: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthView({ month, events, onSelectDay, onSelectEvent }: MonthViewProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <div className="rounded-xl border">
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-2 text-center text-xs font-semibold text-muted-foreground">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((event) => isSameDay(new Date(event.startAt), day));
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={cn(
                'flex min-h-20 flex-col items-stretch gap-1 border-b border-r p-1 text-left align-top transition-colors last:border-r-0 hover:bg-muted/40',
                !isSameMonth(day, month) && 'bg-muted/20 text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  isToday && 'bg-primary font-bold text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelectEvent(event);
                    }}
                    className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"
                  >
                    {format(new Date(event.startAt), 'HH:mm')} {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
