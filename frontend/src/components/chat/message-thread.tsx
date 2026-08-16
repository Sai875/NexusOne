'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';
import { useChatStore } from '@/lib/chat-store';
import { apiGet } from '@/lib/api';
import { getSocket } from '@/lib/ws';
import { cn, formatDateTime, initials } from '@/lib/utils';
import type { Message } from '@/lib/types';

const EMOJIS = ['👍', '❤️', '🎉', '👀', '✅'];

interface MessageThreadProps {
  channelId: string;
  onThreadOpen: (message: Message) => void;
}

export function MessageThread({ channelId, onThreadOpen }: MessageThreadProps) {
  const user = useAuthStore((state) => state.user);
  const messages = useChatStore((state) => state.messagesByChannel[channelId] ?? []);
  const setMessages = useChatStore((state) => state.setMessages);
  const prependMessages = useChatStore((state) => state.prependMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    void apiGet<Message[]>(`/api/channels/${channelId}/messages?limit=50`)
      .then((data) => setMessages(channelId, data))
      .catch(() => undefined);
  }, [channelId, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const older = await apiGet<Message[]>(
        `/api/channels/${channelId}/messages?limit=30&before=${encodeURIComponent(oldest.createdAt)}`,
      );
      if (older.length) prependMessages(channelId, older);
    } finally {
      setLoadingOlder(false);
    }
  }

  function toggleReaction(messageId: string, emoji: string) {
    getSocket()?.emit('reaction:toggle', { messageId, emoji });
  }

  function deleteMessage(messageId: string) {
    getSocket()?.emit('message:delete', { messageId });
    toast.success('Message deleted');
  }

  function saveEdit(message: Message) {
    getSocket()?.emit('message:edit', { messageId: String(message._id), text: editText });
    setEditingId(null);
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <MessageSquare className="h-8 w-8 opacity-40" />
        <p className="text-sm">No messages yet — say hello!</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-4 scrollbar-thin">
      {messages.length >= 50 && (
        <div className="mb-2 text-center">
          <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? 'Loading…' : 'Load older messages'}
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-4">
        {messages.map((message) => {
          const isMine = message.authorId === user?.id;
          return (
            <div key={String(message._id)} className="group flex gap-3">
              <Avatar className="mt-0.5 h-8 w-8">
                <AvatarFallback>{initials(message.authorId === user?.id ? user?.name ?? 'You' : 'U')}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{isMine ? 'You' : 'Colleague'}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(message.createdAt)}</span>
                  {message.editedAt && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                  <div className="ml-auto hidden items-center gap-1 group-hover:flex">
                    {isMine && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingId(String(message._id));
                          setEditText(message.text);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {isMine && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMessage(String(message._id))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onThreadOpen(message)}>
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {editingId === String(message._id) ? (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-md border px-2 py-1 text-sm"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <Button size="sm" onClick={() => saveEdit(message)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                ) : (
                  <p className={cn('whitespace-pre-wrap break-words text-sm', message.deletedAt && 'italic text-muted-foreground')}>
                    {message.text}
                  </p>
                )}
                {(message.reactions ?? []).filter((reaction) => reaction.userIds.length > 0).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {message.reactions
                      ?.filter((reaction) => reaction.userIds.length > 0)
                      .map((reaction) => (
                        <button
                          key={reaction.emoji}
                          onClick={() => toggleReaction(String(message._id), reaction.emoji)}
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-xs',
                            reaction.userIds.includes(user?.id ?? '') && 'border-primary bg-primary/10',
                          )}
                        >
                          {reaction.emoji} {reaction.userIds.length}
                        </button>
                      ))}
                  </div>
                )}
                <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className="rounded p-0.5 text-xs hover:bg-muted"
                      onClick={() => toggleReaction(String(message._id), emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
