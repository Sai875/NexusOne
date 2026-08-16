'use client';

import { useState } from 'react';
import { CornerDownRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getSocket } from '@/lib/ws';

interface MessageComposerProps {
  channelId: string;
  parentId?: string;
  onReplied?: () => void;
}

export function MessageComposer({ channelId, parentId, onReplied }: MessageComposerProps) {
  const [text, setText] = useState('');

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    getSocket()?.emit('message:send', { channelId, text: trimmed, parentId });
    setText('');
    onReplied?.();
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        {parentId && (
          <div className="mb-1 text-xs text-muted-foreground">
            <CornerDownRight className="mr-1 inline h-3 w-3" /> Replying to thread
          </div>
        )}
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={parentId ? 'Write a reply…' : 'Message #channel (Enter to send)'}
          className="max-h-32 min-h-10"
          rows={1}
        />
        <Button size="icon" onClick={send} disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
