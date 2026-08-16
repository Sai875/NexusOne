'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bell,
  Bot,
  CalendarDays,
  FolderOpen,
  KanbanSquare,
  MessageSquare,
  Shield,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useOrgStore } from '@/lib/org-store';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Activity, moduleKey: 'ANALYTICS' },
  { href: '/chat', label: 'Chat', icon: MessageSquare, moduleKey: 'CHAT' },
  { href: '/projects', label: 'Projects', icon: KanbanSquare, moduleKey: 'PROJECTS' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, moduleKey: 'CALENDAR' },
  { href: '/files', label: 'Files', icon: FolderOpen, moduleKey: 'DRIVE' },
  { href: '/notifications', label: 'Activity', icon: Bell, moduleKey: 'NOTIFICATIONS' },
  { href: '/copilot', label: 'Copilot', icon: Bot, moduleKey: 'COPILOT' },
  { href: '/admin', label: 'Admin', icon: Shield, moduleKey: 'ANALYTICS', adminOnly: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isEnabled = useOrgStore((state) => state.isEnabled);

  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r bg-muted/30 py-3 md:flex lg:w-56 lg:items-stretch lg:px-3">
      <div className="mb-2 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-5 w-5" />
        </div>
        <div className="hidden lg:block">
          <div className="text-sm font-bold leading-tight">NexusOne</div>
          <div className="text-[11px] leading-tight text-muted-foreground">Enterprise workspace</div>
        </div>
      </div>
      <nav className="flex flex-col items-center gap-1 lg:items-stretch">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
          .filter((item) => isEnabled(item.moduleKey))
          .map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'flex items-center justify-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors lg:justify-start',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
      </nav>
      <div className="mt-auto hidden text-center text-[10px] text-muted-foreground lg:block">
        v1.0 · MVP
      </div>
    </aside>
  );
}
