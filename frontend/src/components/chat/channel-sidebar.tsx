'use client';

import { useState } from 'react';
import { Hash, Lock, Megaphone, MessageSquare, Plus, Search } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api';
import { useChatStore } from '@/lib/chat-store';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Channel } from '@/lib/types';

function ChannelIcon({ type }: { type: Channel['type'] }) {
  if (type === 'private' || type === 'dm') return <Lock className="h-4 w-4" />;
  if (type === 'announcement') return <Megaphone className="h-4 w-4" />;
  return <Hash className="h-4 w-4" />;
}

export function ChannelSidebar() {
  const user = useAuthStore((state) => state.user);
  const channels = useChatStore((state) => state.channels);
  const activeChannelId = useChatStore((state) => state.activeChannelId);
  const setChannels = useChatStore((state) => state.setChannels);
  const setActiveChannel = useChatStore((state) => state.setActiveChannel);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', type: 'public', description: '' });

  useSWR('channels', () =>
    apiGet<Channel[]>('/api/channels').then((data) => {
      setChannels(data);
      return data;
    }),
  );

  const visible = channels.filter((channel) => channel.name.toLowerCase().includes(query.toLowerCase()));

  async function createChannel() {
    try {
      const channel = await apiPost<Channel>('/api/channels', form);
      setChannels([...channels, channel]);
      setActiveChannel(channel._id);
      setOpen(false);
      setForm({ name: '', type: 'public', description: '' });
      toast.success(`#${channel.name} created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create channel');
    }
  }

  const grouped: { label: string; channels: Channel[] }[] = [
    { label: 'Channels', channels: visible.filter((c) => c.type !== 'dm') },
    { label: 'Direct messages', channels: visible.filter((c) => c.type === 'dm') },
  ];

  return (
    <div className="flex w-full flex-col border-r bg-muted/20 md:w-64">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels"
            className="pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 scrollbar-thin">
        {grouped.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </div>
            {group.channels.map((channel) => (
              <button
                key={channel._id}
                onClick={() => setActiveChannel(channel._id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  activeChannelId === channel._id
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <ChannelIcon type={channel.type} />
                <span className="flex-1 truncate">{channel.name}</span>
              </button>
            ))}
            {group.channels.length === 0 && (
              <div className="px-2 text-xs text-muted-foreground/60">None yet</div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t p-2">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Create channel
        </Button>
        <div className="mt-1 flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" /> Signed in as {user?.name}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a channel</DialogTitle>
            <DialogDescription>Channels organize conversations around a topic or team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. platform-team" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(type) => setForm({ ...form, type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="announcement">Announcements (post-only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createChannel} disabled={!form.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
