'use client';

import { create } from 'zustand';
import type { Channel, Message } from './types';

interface ChatState {
  channels: Channel[];
  activeChannelId: string | null;
  messagesByChannel: Record<string, Message[]>;
  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (channelId: string | null) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  prependMessages: (channelId: string, older: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  channels: [],
  activeChannelId: null,
  messagesByChannel: {},

  setChannels: (channels) => set({ channels }),

  setActiveChannel: (activeChannelId) => set({ activeChannelId }),

  setMessages: (channelId, messages) =>
    set((state) => ({ messagesByChannel: { ...state.messagesByChannel, [channelId]: messages } })),

  prependMessages: (channelId, older) =>
    set((state) => {
      const existing = state.messagesByChannel[channelId] ?? [];
      const known = new Set(existing.map((m) => String(m._id)));
      const merged = [...older.filter((m) => !known.has(String(m._id))), ...existing];
      return { messagesByChannel: { ...state.messagesByChannel, [channelId]: merged } };
    }),

  addMessage: (message) =>
    set((state) => {
      const channelId = message.channelId;
      const existing = state.messagesByChannel[channelId] ?? [];
      if (existing.some((m) => String(m._id) === String(message._id))) return state;
      return {
        messagesByChannel: { ...state.messagesByChannel, [channelId]: [...existing, message] },
      };
    }),

  updateMessage: (message) =>
    set((state) => {
      const channelId = message.channelId;
      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [channelId]: (state.messagesByChannel[channelId] ?? []).map((m) =>
            String(m._id) === String(message._id) ? message : m,
          ),
        },
      };
    }),

  removeMessage: (messageId) =>
    set((state) => {
      const next: Record<string, Message[]> = {};
      for (const [channelId, messages] of Object.entries(state.messagesByChannel)) {
        next[channelId] = messages.filter((m) => String(m._id) !== messageId);
      }
      return { messagesByChannel: next };
    }),

  reset: () => set({ channels: [], activeChannelId: null, messagesByChannel: {} }),
}));

export function selectChannelMessages(state: ChatState, channelId: string): Message[] {
  return state.messagesByChannel[channelId] ?? [];
}
