import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommunicationTokensService } from './communication-tokens.service';

function buildModel() {
  const findChain = { sort: jest.fn().mockReturnThis(), lean: jest.fn() };
  const findOneChain = { select: jest.fn().mockReturnThis(), lean: jest.fn() };
  const updateChain = { lean: jest.fn() };
  return {
    find: jest.fn().mockReturnValue(findChain),
    findOne: jest.fn().mockReturnValue(findOneChain),
    findOneAndUpdate: jest.fn().mockReturnValue(updateChain),
    findOneAndDelete: jest.fn().mockReturnValue(updateChain),
    updateOne: jest.fn().mockResolvedValue({}),
    create: jest.fn(),
    __findChain: findChain,
    __findOneChain: findOneChain,
    __updateChain: updateChain,
  };
}

describe('CommunicationTokensService', () => {
  let tokens: ReturnType<typeof buildModel>;
  let organizations: { requireManager: jest.Mock; findOrganizationSummary: jest.Mock };
  let service: CommunicationTokensService;

  beforeEach(() => {
    tokens = buildModel();
    organizations = { requireManager: jest.fn().mockResolvedValue({ role: 'owner' }), findOrganizationSummary: jest.fn() };
    service = new CommunicationTokensService(tokens as any, organizations as any);
  });

  describe('createForOrganization', () => {
    it('requires owner/admin access, generates a token, and returns it once', async () => {
      tokens.create.mockImplementation((doc: any) => Promise.resolve(doc));

      const result = await service.createForOrganization('gpf_usr_1', 'gpf_org_1', { name: 'Business App' });

      expect(organizations.requireManager).toHaveBeenCalledWith('gpf_usr_1', 'gpf_org_1');
      expect(tokens.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: 'gpf_org_1', name: 'Business App', status: 'active', createdBy: 'gpf_usr_1',
      }));
      expect(result.token).toMatch(/^gpf_comm_[0-9a-f]{48}$/);
      expect(result.tokenPrefix).toBe(result.token.slice(0, 'gpf_comm_'.length + 8));
      expect(result).not.toHaveProperty('tokenHash');
    });

    it('rejects a missing name', async () => {
      await expect(service.createForOrganization('gpf_usr_1', 'gpf_org_1', { name: '  ' })).rejects.toThrow();
    });

    it('propagates the permission error when the caller is not a manager', async () => {
      organizations.requireManager.mockRejectedValue(new Error('Organization administrator access required'));
      await expect(service.createForOrganization('gpf_usr_2', 'gpf_org_1', { name: 'X' })).rejects.toThrow();
    });
  });

  describe('listForOrganization', () => {
    it('lists tokens without ever exposing the hash', async () => {
      tokens.__findChain.lean.mockResolvedValue([
        { tokenId: 'gpf_ctok_1', organizationId: 'gpf_org_1', name: 'X', description: '', tokenPrefix: 'gpf_comm_a1b2c3d4', status: 'active', lastUsedAt: null, expiresAt: null, createdBy: 'gpf_usr_1' },
      ]);
      const result = await service.listForOrganization('gpf_usr_1', 'gpf_org_1');
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('tokenHash');
    });
  });

  describe('revoke', () => {
    it('sets status to revoked', async () => {
      tokens.__updateChain.lean.mockResolvedValue({ tokenId: 'gpf_ctok_1', status: 'revoked' });
      const result = await service.revoke('gpf_usr_1', 'gpf_org_1', 'gpf_ctok_1');
      expect(tokens.findOneAndUpdate).toHaveBeenCalledWith(
        { tokenId: 'gpf_ctok_1', organizationId: 'gpf_org_1' },
        { $set: { status: 'revoked' } },
        expect.anything(),
      );
      expect(result.status).toBe('revoked');
    });

    it('throws when the token does not exist', async () => {
      tokens.__updateChain.lean.mockResolvedValue(null);
      await expect(service.revoke('gpf_usr_1', 'gpf_org_1', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes an existing token', async () => {
      tokens.__updateChain.lean.mockResolvedValue({ tokenId: 'gpf_ctok_1' });
      const result = await service.remove('gpf_usr_1', 'gpf_org_1', 'gpf_ctok_1');
      expect(result).toEqual({ tokenId: 'gpf_ctok_1', deleted: true });
    });

    it('throws when the token does not exist', async () => {
      tokens.__updateChain.lean.mockResolvedValue(null);
      await expect(service.remove('gpf_usr_1', 'gpf_org_1', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('validate', () => {
    it('resolves a valid, active, non-expired token', async () => {
      tokens.__findOneChain.lean.mockResolvedValue({ tokenId: 'gpf_ctok_1', organizationId: 'gpf_org_1', status: 'active', expiresAt: null });
      organizations.findOrganizationSummary.mockResolvedValue({ organizationId: 'gpf_org_1', name: 'Acme' });

      const result = await service.validate('gpf_comm_abc123');

      expect(result).toEqual({ organizationId: 'gpf_org_1', organizationName: 'Acme', tokenId: 'gpf_ctok_1' });
      expect(tokens.updateOne).toHaveBeenCalledWith({ tokenId: 'gpf_ctok_1' }, { $set: { lastUsedAt: expect.any(Date) } });
    });

    it('rejects an unknown token', async () => {
      tokens.__findOneChain.lean.mockResolvedValue(null);
      await expect(service.validate('gpf_comm_ghost')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a revoked token', async () => {
      tokens.__findOneChain.lean.mockResolvedValue({ tokenId: 'gpf_ctok_1', organizationId: 'gpf_org_1', status: 'revoked', expiresAt: null });
      await expect(service.validate('gpf_comm_abc123')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an expired token', async () => {
      tokens.__findOneChain.lean.mockResolvedValue({ tokenId: 'gpf_ctok_1', organizationId: 'gpf_org_1', status: 'active', expiresAt: new Date('2020-01-01') });
      await expect(service.validate('gpf_comm_abc123')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an empty token', async () => {
      await expect(service.validate('')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
