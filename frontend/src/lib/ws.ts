'use client';

import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useChatStore } from './chat-store';
import type { Message } from './types';

let socket: Socket | null = null;

const WS_URL =
  process.env.NEXT_PUBLIC_CHAT_WS_URL || 'http://localhost:3003';

export function connectSocket(token: string): Socket {
  if (socket) return socket;
  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
  });

  socket.on('message:new', (message: Message) => {
    useChatStore.getState().addMessage(message);
    const state = useChatStore.getState();
    if (state.activeChannelId && String(state.activeChannelId) !== String(message.channelId)) {
      toast.info('New message', { description: message.text.slice(0, 80) });
    }
  });

  socket.on('message:updated', (message: Message) => {
    useChatStore.getState().updateMessage(message);
  });

  socket.on('message:deleted', (payload: { messageId: string }) => {
    useChatStore.getState().removeMessage(payload.messageId);
  });

  socket.on('reaction:updated', (message: Message) => {
    useChatStore.getState().updateMessage(message);
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error', err.message);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
