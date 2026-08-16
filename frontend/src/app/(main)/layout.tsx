'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Topbar } from '@/components/layout/topbar';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useChatStore } from '@/lib/chat-store';
import { useNotificationsStore } from '@/lib/notifications-store';
import { useOrgStore } from '@/lib/org-store';
import { connectSocket, disconnectSocket } from '@/lib/ws';
import type { AnalyticsSummary, AppNotification, OrgMember, OrgModule } from '@/lib/types';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshOrgData = useAuthStore((state) => state.refreshOrgData);
  const setModules = useOrgStore((state) => state.setModules);
  const setMembers = useOrgStore((state) => state.setMembers);
  const setUnread = useNotificationsStore((state) => state.setUnread);
  const incrementUnread = useNotificationsStore((state) => state.increment);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }

    void refreshOrgData().catch(() => undefined);
    void apiGet<{ modules: OrgModule[] }>('/api/orgs/me')
      .then((data) => setModules(data.modules))
      .catch(() => undefined);
    void apiGet<OrgMember[]>('/api/admin/members')
      .then(setMembers)
      .catch(() => undefined);
    void apiGet<{ count: number }>('/api/notifications/unread-count')
      .then((data) => setUnread(data.count))
      .catch(() => undefined);

    // Live presence + chat via Socket.IO
    connectSocket(accessToken);
    const socket = connectSocket(accessToken);

    // Live notifications via SSE (token as query param — EventSource limitation)
    const source = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(accessToken)}`);
    source.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as AppNotification;
        incrementUnread();
        toast(notification.title, { description: notification.body });
      } catch {
        // ignore malformed payloads
      }
    };
    source.onerror = () => {
      // EventSource reconnects automatically; nothing to do here.
    };

    return () => {
      source.close();
      disconnectSocket();
      useChatStore.getState().reset();
    };
  }, [accessToken, router, refreshOrgData, setModules, setMembers, setUnread, incrementUnread]);

  if (!accessToken) return null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="flex items-center justify-around border-t bg-background py-2 md:hidden">
        {[
          { href: '/dashboard', label: 'Home' },
          { href: '/chat', label: 'Chat' },
          { href: '/projects', label: 'Tasks' },
          { href: '/copilot', label: 'AI' },
        ].map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="px-4 py-1 text-xs font-medium text-muted-foreground"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
