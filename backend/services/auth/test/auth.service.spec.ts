import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/auth/auth.service';

type Mock = jest.Mock;

function repo(): Record<string, Mock> {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn((entity: unknown) => Promise.resolve({ id: 'new-id', ...(entity as object) })),
    create: jest.fn((entity: unknown) => entity),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
  };
}

function makeService() {
  const usersRepo = repo();
  const orgsRepo = repo();
  const membershipsRepo = repo();
  const invitationsRepo = repo();
  const refreshTokensRepo = repo();

  const usersService = {
    findByEmail: jest.fn(),
    findWithPassword: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
  };
  const config = { get: jest.fn((_key: string, fallback?: unknown) => fallback) };
  const events = { publish: jest.fn().mockResolvedValue(undefined) };

  const service = new AuthService(
    usersRepo as never,
    orgsRepo as never,
    membershipsRepo as never,
    invitationsRepo as never,
    refreshTokensRepo as never,
    usersService as never,
    jwt as never,
    config as never,
    events as never,
  );

  return { service, usersRepo, orgsRepo, membershipsRepo, invitationsRepo, refreshTokensRepo, usersService, jwt, events };
}

describe('AuthService', () => {
  describe('register', () => {
    it('creates a user, an organization and an ORG_ADMIN membership', async () => {
      const { service, orgsRepo, membershipsRepo, usersService, events } = makeService();
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({ id: 'user-1', name: 'Jane Doe', email: 'jane@acme.io' });
      orgsRepo.findOneBy.mockResolvedValue({ id: 'org-1', name: 'Acme', slug: 'acme' });
      orgsRepo.save.mockResolvedValue({ id: 'org-1', name: 'Acme', slug: 'acme' });
      membershipsRepo.find.mockResolvedValue([
        { id: 'm-1', userId: 'user-1', orgId: 'org-1', roles: ['ORG_ADMIN'] },
      ]);

      const session = await service.register({
        name: 'Jane Doe',
        email: 'jane@acme.io',
        password: 'Password1',
        orgName: 'Acme',
      });

      expect(usersService.create).toHaveBeenCalled();
      expect(session.accessToken).toBe('signed-token');
      expect(session.currentOrg.name).toBe('Acme');
      expect(membershipsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ roles: ['ORG_ADMIN'] }),
      );
      expect(events.publish).toHaveBeenCalledWith('org.created', 'org-1', expect.anything());
    });

    it('rejects a duplicate email', async () => {
      const { service, usersService } = makeService();
      usersService.findByEmail.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({ name: 'Jane', email: 'jane@acme.io', password: 'Password1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('rejects a wrong password', async () => {
      const { service, usersService } = makeService();
      usersService.findWithPassword.mockResolvedValue({
        id: 'user-1',
        email: 'jane@acme.io',
        passwordHash: bcrypt.hashSync('Correct123', 4),
        isActive: true,
      });
      await expect(
        service.login({ email: 'jane@acme.io', password: 'Wrong123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns a session for valid credentials', async () => {
      const { service, usersService, membershipsRepo, orgsRepo, refreshTokensRepo } = makeService();
      usersService.findWithPassword.mockResolvedValue({
        id: 'user-1',
        email: 'jane@acme.io',
        passwordHash: bcrypt.hashSync('Correct123', 4),
        isActive: true,
      });
      membershipsRepo.findOne.mockResolvedValue({
        id: 'm-1',
        userId: 'user-1',
        orgId: 'org-1',
        roles: ['EMPLOYEE'],
      });
      membershipsRepo.find.mockResolvedValue([
        { id: 'm-1', userId: 'user-1', orgId: 'org-1', roles: ['EMPLOYEE'] },
      ]);
      orgsRepo.findOneBy.mockResolvedValue({ id: 'org-1', name: 'Acme', slug: 'acme' });

      const session = await service.login({ email: 'jane@acme.io', password: 'Correct123' });

      expect(session.accessToken).toBe('signed-token');
      expect(refreshTokensRepo.save).toHaveBeenCalled();
      expect(session.currentOrg.name).toBe('Acme');
    });
  });

  describe('refresh', () => {
    it('rejects a revoked refresh token', async () => {
      const { service, jwt, refreshTokensRepo } = makeService();
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        jti: 'jti-1',
        orgId: 'org-1',
        type: 'refresh',
      });
      refreshTokensRepo.findOneBy.mockResolvedValue({
        jti: 'jti-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });

      await expect(
        service.refresh({ refreshToken: 'stale-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rotates the token pair', async () => {
      const { service, jwt, refreshTokensRepo, usersService, membershipsRepo, orgsRepo } = makeService();
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        jti: 'jti-1',
        orgId: 'org-1',
        type: 'refresh',
      });
      refreshTokensRepo.findOneBy.mockResolvedValue({
        id: 'rt-1',
        jti: 'jti-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      usersService.findById.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        name: 'Jane',
        email: 'jane@acme.io',
      });
      membershipsRepo.findOneBy.mockResolvedValue({
        id: 'm-1',
        userId: 'user-1',
        orgId: 'org-1',
        roles: ['EMPLOYEE'],
      });
      membershipsRepo.find.mockResolvedValue([
        { id: 'm-1', userId: 'user-1', orgId: 'org-1', roles: ['EMPLOYEE'] },
      ]);
      orgsRepo.findOneBy.mockResolvedValue({ id: 'org-1', name: 'Acme', slug: 'acme' });

      const session = await service.refresh({ refreshToken: 'old-token' });

      expect(refreshTokensRepo.update).toHaveBeenCalledWith('rt-1', { revokedAt: expect.any(Date) });
      expect(session.accessToken).toBe('signed-token');
    });
  });

  describe('switchOrg', () => {
    it('rejects switching to an organization without membership', async () => {
      const { service, usersService } = makeService();
      usersService.findById.mockResolvedValue({ id: 'user-1' });
      await expect(service.switchOrg('user-1', 'unknown-org')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
