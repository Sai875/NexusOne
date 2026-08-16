'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiGet, apiPost } from './api';
import type { OrgSummary, Session, SessionUser } from './types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  orgs: OrgSummary[];
  currentOrg: OrgSummary | null;
  setSession: (session: Session) => void;
  logout: () => void;
  switchOrg: (orgId: string) => Promise<void>;
  refreshOrgData: () => Promise<void>;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      orgs: [],
      currentOrg: null,

      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
          orgs: session.orgs,
          currentOrg: session.currentOrg,
        }),

      logout: () => {
        void apiPost('/api/auth/logout').catch(() => undefined);
        set({ accessToken: null, refreshToken: null, user: null, orgs: [], currentOrg: null });
      },

      switchOrg: async (orgId) => {
        const session = await apiPost<Session>('/api/auth/switch-org', { orgId });
        get().setSession(session);
      },

      refreshOrgData: async () => {
        const me = await apiGet<{ user: SessionUser; orgs: OrgSummary[]; currentOrg: OrgSummary }>(
          '/api/auth/me',
        );
        set({ user: me.user, orgs: me.orgs, currentOrg: me.currentOrg });
      },

      isAdmin: () => {
        const roles = get().currentOrg?.roles ?? [];
        return roles.includes('ORG_ADMIN') || roles.includes('SUPER_ADMIN') || roles.includes('MANAGER');
      },
    }),
    { name: 'nexusone-auth' },
  ),
);
