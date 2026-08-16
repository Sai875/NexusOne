export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  GUEST: 'GUEST',
} as const;

export const ROLE_RANK: Record<string, number> = {
  SUPER_ADMIN: 100,
  ORG_ADMIN: 80,
  MANAGER: 60,
  EMPLOYEE: 40,
  GUEST: 10,
};
