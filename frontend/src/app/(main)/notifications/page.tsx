'use client';

import Link from 'next/link';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiGet, apiPatch } from '@/lib/api';
import { useNotificationsStore } from '@/lib/notifications-store';
import { cn, timeAgo } from '@/lib/utils';
import type { AppNotification } from '@/lib/types';

const TYPE_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' }> = {
  'task.assigned': { label: 'Task', variant: 'default' },
  'chat.mentioned': { label: 'Mention', variant: 'warning' },
  'event.reminder': { label: 'Reminder', variant: 'secondary' },
  system: { label: 'System', variant: 'success' },
};

export default function NotificationsPage() {
  const setUnread = useNotificationsStore((state) => state.setUnread);
  const { data: notifications = [], mutate } = useSWR<AppNotification[]>('notifications', async () => {
    const data = await apiGet<AppNotification[]>('/api/notifications?limit=50');
    setUnread(data.filter((notification) => !notification.readAt).length);
    return data;
  });

  async function markRead(notification: AppNotification) {
    if (!notification.readAt) {
      await apiPatch(`/api/notifications/${notification._id}/read`, {}).catch(() => undefined);
      await mutate();
    }
    if (notification.link) window.location.href = notification.link;
  }

  async function markAllRead() {
    await apiPatch('/api/notifications/read-all', {}).catch(() => undefined);
    setUnread(0);
    await mutate();
    toast.success('All notifications marked as read');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">Everything that needs your attention</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
        </Button>
      </div>

      {notifications.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-muted-foreground">
          <Bell className="h-10 w-10 opacity-40" />
          <p className="text-sm">You&apos;re all caught up</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => {
          const meta = TYPE_LABEL[notification.type] ?? { label: notification.type, variant: 'secondary' as const };
          return (
            <button
              key={notification._id}
              onClick={() => void markRead(notification)}
              className={cn(
                'block w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/40',
                !notification.readAt && 'border-primary/30',
              )}
            >
              <CardContent className="flex items-start gap-3 p-0">
                <div className="mt-0.5">
                  {notification.readAt ? (
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <BellRing className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{notification.title}</span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                  {notification.link && (
                    <Link href={notification.link} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                      View →
                    </Link>
                  )}
                </div>
              </CardContent>
            </button>
          );
        })}
      </div>
    </div>
  );
}
