/**
 * Fixed demo identity data (idempotent bootstrap on service start).
 * These UUIDs are referenced by database/postgres/seed.sql so the full
 * demo dataset stays consistent whether seeded by SQL or by the service.
 */
export const DEMO_ORG = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Nexus Labs',
  slug: 'nexus-labs',
};

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'ORG_ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'GUEST';
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Alice Admin',
    email: 'alice.admin@nexuslabs.io',
    password: 'Admin@123',
    role: 'ORG_ADMIN',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Bob Manager',
    email: 'bob.manager@nexuslabs.io',
    password: 'Manager@123',
    role: 'MANAGER',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Carol Developer',
    email: 'carol.dev@nexuslabs.io',
    password: 'Carol@123',
    role: 'EMPLOYEE',
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Dave Developer',
    email: 'dave.dev@nexuslabs.io',
    password: 'Dave@123',
    role: 'EMPLOYEE',
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Erin Guest',
    email: 'erin.guest@nexuslabs.io',
    password: 'Guest@123',
    role: 'GUEST',
  },
];
