import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entitlement } from './entities/entitlement.entity';
import {
  ALL_MODULES,
  DEFAULT_DISABLED_MODULES,
  DEFAULT_ENABLED_MODULES,
  ModuleKeyName,
} from './modules.constants';

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(@InjectRepository(Entitlement) private readonly repo: Repository<Entitlement>) {}

  async ensureDefaults(orgId: string): Promise<void> {
    const existing = await this.repo.findBy({ orgId });
    if (existing.length > 0) return;

    const rows = ALL_MODULES.map((module) =>
      this.repo.create({
        orgId,
        module,
        enabled: DEFAULT_ENABLED_MODULES.includes(module as ModuleKeyName),
      }),
    );
    await this.repo.save(rows);
    this.logger.log(`Seeded ${rows.length} entitlement rows for org ${orgId}`);
  }

  async list(orgId: string): Promise<{ module: string; enabled: boolean }[]> {
    await this.ensureDefaults(orgId);
    const rows = await this.repo.findBy({ orgId });
    // Always return the canonical module set, filling gaps with defaults.
    const byModule = new Map(rows.map((r) => [r.module, r.enabled]));
    return ALL_MODULES.map((module) => ({
      module,
      enabled: byModule.get(module) ?? DEFAULT_ENABLED_MODULES.includes(module as ModuleKeyName),
    }));
  }

  async setMany(
    orgId: string,
    changes: { module: string; enabled: boolean }[],
  ): Promise<{ module: string; enabled: boolean }[]> {
    await this.ensureDefaults(orgId);
    for (const change of changes) {
      if (!ALL_MODULES.includes(change.module as ModuleKeyName)) continue;
      const existing = await this.repo.findOneBy({ orgId, module: change.module });
      if (existing) {
        existing.enabled = change.enabled;
        await this.repo.save(existing);
      } else {
        await this.repo.save(
          this.repo.create({ orgId, module: change.module, enabled: change.enabled }),
        );
      }
    }
    return this.list(orgId);
  }

  async isEnabled(orgId: string, module: ModuleKeyName): Promise<boolean> {
    const entitlements = await this.list(orgId);
    return entitlements.find((e) => e.module === module)?.enabled ?? false;
  }
}
