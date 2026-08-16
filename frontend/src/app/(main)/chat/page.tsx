'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { ChannelSidebar } from '@/components/chat/channel-sidebar';
import { MessageComposer } from '@/components/chat/message-composer';
import { MessageThread } from '@/components/chat/message-thread';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { useChatStore } from '@/lib/chat-store';
import { getSocket } from '@/lib/ws';
import type { Message } from '@/lib/types';

export default function ChatPage() {
  const params = useSearchParams();
  const channels = useChatStore((state) => state.channels);
  const activeChannelId = useChatStore((state) => state.activeChannelId);
  const setActiveChannel = useChatStore((state) => state.setActiveChannel);
  const [thread, setThread] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);

  const activeChannel = channels.find((channel) => channel._id === activeChannelId);

  // Support deep links like /chat?channel=<id>
  useEffect(() => {
    const channelId = params.get('channel');
    if (channelId) setActiveChannel(channelId);
  }, [params, setActiveChannel]);

  useEffect(() => {
    if (!activeChannelId) return;
    getSocket()?.emit('channel:join', activeChannelId);
    return () => {
      getSocket()?.emit('channel:leave', activeChannelId);
    };
  }, [activeChannelId]);

  async function openThread(message: Message) {
    setThread(message);
    const data = await apiGet<Message[]>(`/api/channels/${message.channelId}/thread/${message._id}`).catch(
      () => [],
    );
    setReplies(data);
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex h-2/5 shrink-0 md:h-auto md:w-64">
        <ChannelSidebar />
      </div>

      {activeChannel ? (
        <>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <span className="text-sm font-semibold"># {activeChannel.name}</span>
              <span className="truncate text-xs text-muted-foreground">{activeChannel.description}</span>
            </div>
            <div className="min-h-0 flex-1">
              <MessageThread channelId={activeChannel._id} onThreadOpen={openThread} />
            </div>
            <MessageComposer channelId={activeChannel._id} />
          </div>

          {thread && (
            <div className="flex w-full shrink-0 flex-col border-l bg-muted/10 md:w-80">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">Thread replies</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setThread(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-3 scrollbar-thin">
                <div className="mb-3 rounded-md border bg-background p-2 text-xs">{thread.text}</div>
                {replies.map((reply) => (
                  <div key={String(reply._id)} className="mb-2 rounded-md border bg-background p-2 text-sm">
                    {reply.text}
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(reply.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <MessageComposer
                channelId={activeChannel._id}
                parentId={String(thread._id)}
                onReplied={() => void openThread(thread)}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Select a channel to start chatting
        </div>
      )}
    </div>
  );
}
