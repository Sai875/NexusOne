import { EntitlementsService } from '../src/org/entitlements.service';
import { ALL_MODULES, DEFAULT_ENABLED_MODULES } from '../src/org/modules.constants';

type Entitlement = { orgId: string; module: string; enabled: boolean };

function makeRepo(initial: Record<string, boolean> = {}) {
  const state = new Map<string, boolean>(Object.entries(initial));
  const repo = {
    findBy: jest.fn(async (): Promise<Entitlement[]> =>
      [...state.entries()].map(([module, enabled]) => ({ orgId: 'org-1', module, enabled })),
    ),
    findOneBy: jest.fn(
      async ({ module }: { module: string }): Promise<Entitlement | null> =>
        state.has(module) ? { orgId: 'org-1', module, enabled: state.get(module) as boolean } : null,
    ),
    save: jest.fn(async (entity: Entitlement): Promise<Entitlement> => {
      state.set(entity.module, entity.enabled);
      return entity;
    }),
    create: jest.fn((entity: Entitlement): Entitlement => entity),
  };
  return repo;
}

describe('EntitlementsService', () => {
  it('returns the canonical module set with defaults for a new org', async () => {
    const service = new EntitlementsService(makeRepo() as never);
    const list = await service.list('org-1');
    expect(list).toHaveLength(ALL_MODULES.length);
    for (const entry of list) {
      expect(entry.enabled).toBe(DEFAULT_ENABLED_MODULES.includes(entry.module as never));
    }
  });

  it('persists module toggles', async () => {
    const service = new EntitlementsService(makeRepo({ CHAT: true }) as never);
    const updated = await service.setMany('org-1', [{ module: 'CHAT', enabled: false }]);
    expect(updated.find((e) => e.module === 'CHAT')?.enabled).toBe(false);
  });

  it('ignores unknown module keys', async () => {
    const service = new EntitlementsService(makeRepo() as never);
    const updated = await service.setMany('org-1', [{ module: 'NOT_A_MODULE', enabled: true }]);
    expect(updated.find((e) => e.module === 'NOT_A_MODULE')).toBeUndefined();
  });
});
