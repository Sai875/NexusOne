'use client';

import { create } from 'zustand';
import type { OrgMember, OrgModule } from './types';

interface OrgState {
  modules: OrgModule[];
  members: OrgMember[];
  setModules: (modules: OrgModule[]) => void;
  setMembers: (members: OrgMember[]) => void;
  isEnabled: (key: string) => boolean;
}

export const useOrgStore = create<OrgState>()((set, get) => ({
  modules: [],
  members: [],
  setModules: (modules) => set({ modules }),
  setMembers: (members) => set({ members }),
  isEnabled: (key) => get().modules.find((m) => m.key === key)?.enabled ?? true,
}));
