'use client';

import { Building2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function OrgSwitcher() {
  const orgs = useAuthStore((state) => state.orgs);
  const currentOrg = useAuthStore((state) => state.currentOrg);
  const switchOrg = useAuthStore((state) => state.switchOrg);

  if (!currentOrg) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent focus:outline-none">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[140px] truncate">{currentOrg.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => {
              if (org.id !== currentOrg.id) {
                void switchOrg(org.id)
                  .then(() => toast.success(`Switched to ${org.name}`))
                  .catch(() => toast.error('Could not switch organization'));
              }
            }}
          >
            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === currentOrg.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
