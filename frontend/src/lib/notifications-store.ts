'use client';

import { create } from 'zustand';

interface NotificationsState {
  unread: number;
  setUnread: (count: number) => void;
  increment: () => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  unread: 0,
  setUnread: (unread) => set({ unread }),
  increment: () => set((state) => ({ unread: state.unread + 1 })),
  clear: () => set({ unread: 0 }),
}));
