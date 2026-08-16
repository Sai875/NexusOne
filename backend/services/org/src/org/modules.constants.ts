/**
 * Every functional module is a licensable, independently toggleable unit per
 * organization (SRS Section 2.3). The gateway enforces these flags in the
 * frontend shell and (in production) at the API edge; services also check the
 * entitlement before serving module data when it matters (admin).
 */
export const ModuleKey = {
  CHAT: 'CHAT',
  MEETINGS: 'MEETINGS',
  PROJECTS: 'PROJECTS',
  FILES: 'FILES',
  CALENDAR: 'CALENDAR',
  NOTIFICATIONS: 'NOTIFICATIONS',
  DOCUMENTS: 'DOCUMENTS',
  DRIVE: 'DRIVE',
  HR: 'HR',
  TICKETING: 'TICKETING',
  WORKFLOW: 'WORKFLOW',
  ANALYTICS: 'ANALYTICS',
  COPILOT: 'COPILOT',
} as const;

export type ModuleKeyName = (typeof ModuleKey)[keyof typeof ModuleKey];

/** Enabled by default for every new organization (MVP scope). */
export const DEFAULT_ENABLED_MODULES: ModuleKeyName[] = [
  ModuleKey.CHAT,
  ModuleKey.PROJECTS,
  ModuleKey.FILES,
  ModuleKey.CALENDAR,
  ModuleKey.NOTIFICATIONS,
  ModuleKey.DOCUMENTS,
  ModuleKey.DRIVE,
  ModuleKey.ANALYTICS,
  ModuleKey.COPILOT,
];

/** Recognized modules gated OFF by default (designed, not built in the MVP). */
export const DEFAULT_DISABLED_MODULES: ModuleKeyName[] = [
  ModuleKey.MEETINGS,
  ModuleKey.HR,
  ModuleKey.TICKETING,
  ModuleKey.WORKFLOW,
];

export const ALL_MODULES: ModuleKeyName[] = [
  ...DEFAULT_ENABLED_MODULES,
  ...DEFAULT_DISABLED_MODULES,
];
