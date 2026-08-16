'use client';

import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { MonthView } from '@/components/calendar/month-view';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useOrgStore } from '@/lib/org-store';
import type { CalendarEvent } from '@/lib/types';

export default function CalendarPage() {
  const user = useAuthStore((state) => state.user);
  const members = useOrgStore((state) => state.members);
  const [month, setMonth] = useState(() => new Date());
  const [createDay, setCreateDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({ title: '', description: '', startAt: '', endAt: '', attendeeIds: '' });
  const [saving, setSaving] = useState(false);

  const from = format(startOfMonth(month), 'yyyy-MM-dd');
  const to = format(endOfMonth(month), 'yyyy-MM-dd');

  const { data: events = [], mutate } = useSWR<CalendarEvent[]>(['events', from, to], () =>
    apiGet<CalendarEvent[]>(`/api/events?from=${from}&to=${to}`),
  );

  const myEvents = useMemo(() => events, [events]);

  function openCreate(day: Date) {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    setForm({
      title: '',
      description: '',
      startAt: start.toISOString().slice(0, 16),
      endAt: end.toISOString().slice(0, 16),
      attendeeIds: '',
    });
    setCreateDay(day);
  }

  async function createEvent() {
    setSaving(true);
    try {
      await apiPost('/api/events', {
        title: form.title,
        description: form.description || undefined,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        attendeeIds: form.attendeeIds ? form.attendeeIds.split(',').map((id) => id.trim()) : [],
        reminderMinutes: 15,
      });
      await mutate();
      setCreateDay(null);
      toast.success('Event created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create event');
    } finally {
      setSaving(false);
    }
  }

  async function rsvp(status: 'accepted' | 'declined') {
    if (!selectedEvent) return;
    try {
      await apiPost(`/api/events/${selectedEvent.id}/rsvp`, { status });
      await mutate();
      toast.success(status === 'accepted' ? 'RSVP accepted' : 'RSVP declined');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update RSVP');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">{format(month, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setMonth(new Date())}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MonthView
        month={month}
        events={myEvents}
        onSelectDay={openCreate}
        onSelectEvent={setSelectedEvent}
      />

      <Dialog open={createDay !== null} onOpenChange={(open) => !open && setCreateDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
            <DialogDescription>
              {createDay ? format(createDay, 'EEEE, MMMM d') : 'Schedule something'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Attendees (comma-separated IDs)</Label>
              <Select
                value=""
                onValueChange={(userId) =>
                  setForm((current) => ({
                    ...current,
                    attendeeIds: current.attendeeIds ? `${current.attendeeIds},${userId}` : userId,
                  }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Add attendee" /></SelectTrigger>
                <SelectContent>
                  {members.filter((m) => m.userId !== user?.id).map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.attendeeIds && (
                <div className="flex flex-wrap gap-1 text-xs">
                  {form.attendeeIds.split(',').map((id) => (
                    <span key={id} className="rounded bg-muted px-1.5 py-0.5">
                      {members.find((m) => m.userId === id)?.name ?? id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDay(null)}>Cancel</Button>
            <Button onClick={createEvent} disabled={saving || !form.title.trim() || !form.startAt}>
              {saving ? 'Saving…' : 'Create event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedEvent !== null} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent &&
                `${format(new Date(selectedEvent.startAt), 'EEEE, MMMM d · HH:mm')} – ${format(new Date(selectedEvent.endAt), 'HH:mm')}`}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent?.description && <p className="text-sm">{selectedEvent.description}</p>}
          <div className="flex flex-wrap gap-1">
            {selectedEvent?.attendees.map((attendee) => (
              <span key={attendee.userId} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {members.find((m) => m.userId === attendee.userId)?.name ?? attendee.userId} · {attendee.status}
              </span>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => void rsvp('declined')}>Decline</Button>
            <Button onClick={() => void rsvp('accepted')}>Accept</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
