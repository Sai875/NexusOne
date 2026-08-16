'use client';

import Link from 'next/link';
import { Bell, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/auth-store';
import { useNotificationsStore } from '@/lib/notifications-store';
import { initials } from '@/lib/utils';
import { OrgSwitcher } from './org-switcher';

export function Topbar() {
  const user = useAuthStore((state) => state.user);
  const currentOrg = useAuthStore((state) => state.currentOrg);
  const logout = useAuthStore((state) => state.logout);
  const unread = useNotificationsStore((state) => state.unread);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden sm:block">
          <OrgSwitcher />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/notifications" className="relative">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]">
                {unread > 99 ? '99+' : unread}
              </Badge>
            )}
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(user?.name ?? '?')}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="truncate text-sm font-semibold">{user?.name}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">{user?.email}</div>
              <div className="mt-1 truncate text-[11px] text-muted-foreground">
                {currentOrg?.name} · {(currentOrg?.roles ?? []).join(', ')}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info('Profile editing arrives in a later milestone')}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
