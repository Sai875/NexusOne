/**
 * Canonical roles (SRS Section 3). SUPER_ADMIN is the platform operator;
 * the rest are org-scoped. Department/Team admin privileges are granted to
 * MANAGER in the MVP (documented in docs/architecture.md).
 */
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  GUEST: 'GUEST',
} as const;

export type RoleName = (typeof Role)[keyof typeof Role];

export const ROLE_RANK: Record<RoleName, number> = {
  SUPER_ADMIN: 100,
  ORG_ADMIN: 80,
  MANAGER: 60,
  EMPLOYEE: 40,
  GUEST: 10,
};
