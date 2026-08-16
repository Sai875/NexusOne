import { NotFoundException } from '@nestjs/common';
import { FilesService } from '../src/files/files.service';
import { ShareLink } from '../src/files/entities/share-link.entity';

const user = {
  sub: '22222222-2222-4222-8222-222222222222',
  email: 'a@x.io',
  name: 'Alice',
  orgId: 'org-1',
  orgName: 'Org',
  orgSlug: 'org',
  roles: ['ORG_ADMIN'],
  type: 'access' as const,
};

function makeService(overrides: { share?: Partial<ShareLink> | null; file?: Record<string, unknown> | null } = {}) {
  const share: ShareLink = {
    id: 'share-1',
    orgId: 'org-1',
    fileId: 'file-1',
    token: 'tok-123',
    permission: 'view',
    expiresAt: null,
    createdBy: user.sub,
    createdAt: new Date(),
    ...overrides.share,
  };
  const file = {
    id: 'file-1',
    orgId: 'org-1',
    storageKey: 'org-1/disk.bin',
    originalName: 'doc.pdf',
    mimeType: 'application/pdf',
    ...overrides.file,
  };
  const shareRepo = {
    findOneBy: jest.fn().mockResolvedValue(share),
    save: jest.fn((entity) => Promise.resolve(entity)),
    create: jest.fn((entity) => entity),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const fileRepo = {
    findOneBy: jest.fn().mockResolvedValue(file),
    save: jest.fn((entity) => Promise.resolve(entity)),
    create: jest.fn((entity) => entity),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    find: jest.fn().mockResolvedValue([]),
  };
  const folderRepo = { find: jest.fn().mockResolvedValue([]) };
  const storage = {
    put: jest.fn(async (key: string) => ({ key, size: 0 })),
    get: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const config = { get: jest.fn((_k: string, d?: unknown) => d) };

  const service = new FilesService(
    fileRepo as never,
    folderRepo as never,
    shareRepo as never,
    storage as never,
    config as never,
  );
  return { service, shareRepo, fileRepo, storage };
}

describe('FilesService', () => {
  it('rejects an expired share link', async () => {
    const { service } = makeService({
      share: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(service.resolveShare('tok-123')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates share links with expiry', async () => {
    const { service, shareRepo } = makeService();
    shareRepo.findOneBy.mockResolvedValue(null); // create path
    const result = await service.createShareLink('org-1', 'file-1', user, 'download', 24);
    expect(result.expiresAt).not.toBeNull();
    expect(shareRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ permission: 'download', orgId: 'org-1' }),
    );
  });

  it('removes storage object when a file is deleted', async () => {
    const { service, fileRepo, storage } = makeService();
    await service.deleteFile('org-1', 'file-1');
    expect(fileRepo.delete).toHaveBeenCalledWith('file-1');
    expect(storage.remove).toHaveBeenCalledWith('org-1/disk.bin');
  });
});
