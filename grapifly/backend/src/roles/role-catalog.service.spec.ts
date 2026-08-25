import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RoleCatalogService } from './role-catalog.service';

function buildModel() {
  const chain = { sort: jest.fn().mockReturnThis(), lean: jest.fn() };
  const updateChain = { lean: jest.fn() };
  return {
    find: jest.fn().mockReturnValue(chain),
    findOneAndUpdate: jest.fn().mockReturnValue(updateChain),
    findOneAndDelete: jest.fn().mockReturnValue(updateChain),
    exists: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    __chain: chain,
    __updateChain: updateChain,
  };
}

describe('RoleCatalogService', () => {
  let entries: ReturnType<typeof buildModel>;
  let service: RoleCatalogService;

  beforeEach(() => {
    entries = buildModel();
    service = new RoleCatalogService(entries as any);
  });

  it('seeds exactly 4 roles for owner, 4 for provider, 2 for internal', async () => {
    await service.onApplicationBootstrap();
    expect(entries.findOneAndUpdate).toHaveBeenCalledTimes(10);
    const flows = entries.findOneAndUpdate.mock.calls.map((call) => call[0].flow);
    expect(flows.filter((f) => f === 'owner')).toHaveLength(4);
    expect(flows.filter((f) => f === 'provider')).toHaveLength(4);
    expect(flows.filter((f) => f === 'internal')).toHaveLength(2);
  });

  it('rolesForFlow returns only the roles for that flow', async () => {
    entries.__chain.lean.mockResolvedValue([
      { flow: 'internal', roleKey: 'ecosystem_super_admin', displayOrder: 1 },
      { flow: 'internal', roleKey: 'ecosystem_admin', displayOrder: 2 },
    ]);

    const roles = await service.rolesForFlow('internal');

    expect(entries.find).toHaveBeenCalledWith({ flow: 'internal' });
    expect(roles).toEqual(['ecosystem_super_admin', 'ecosystem_admin']);
  });

  describe('isValidRole', () => {
    it('accepts a role that exists for that flow', async () => {
      entries.exists.mockResolvedValue(true);

      await expect(service.isValidRole('owner', 'admin')).resolves.toBe(true);
      expect(entries.exists).toHaveBeenCalledWith({ flow: 'owner', roleKey: 'admin' });
    });

    it('rejects a role that does not exist for that flow', async () => {
      entries.exists.mockResolvedValue(null);

      await expect(service.isValidRole('internal', 'owner')).resolves.toBe(false);
    });
  });

  describe('createRole', () => {
    it('creates a new role, normalizing the key and assigning the next displayOrder', async () => {
      entries.exists.mockResolvedValue(false);
      entries.countDocuments.mockResolvedValue(2);
      entries.create.mockResolvedValue({ flow: 'owner', roleKey: 'billing_manager', description: 'Maneja facturación', displayOrder: 3 });

      await service.createRole('owner', '  Billing Manager  ', 'Maneja facturación');

      expect(entries.create).toHaveBeenCalledWith({ flow: 'owner', roleKey: 'billing_manager', description: 'Maneja facturación', displayOrder: 3 });
    });

    it('rejects a duplicate role for the same flow', async () => {
      entries.exists.mockResolvedValue(true);

      await expect(service.createRole('owner', 'admin', 'ya existe')).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects an empty roleKey', async () => {
      await expect(service.createRole('owner', '   ', 'algo')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid flow', async () => {
      await expect(service.createRole('bogus' as any, 'role', 'desc')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateRole', () => {
    it('updates the description of an existing role', async () => {
      entries.__updateChain.lean.mockResolvedValue({ flow: 'owner', roleKey: 'admin', description: 'Nueva descripción' });

      const result = await service.updateRole('owner', 'admin', 'Nueva descripción');

      expect(entries.findOneAndUpdate).toHaveBeenCalledWith(
        { flow: 'owner', roleKey: 'admin' },
        { $set: { description: 'Nueva descripción' } },
        expect.anything(),
      );
      expect(result).toMatchObject({ description: 'Nueva descripción' });
    });

    it('throws when the role does not exist', async () => {
      entries.__updateChain.lean.mockResolvedValue(null);

      await expect(service.updateRole('owner', 'ghost', 'algo')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteRole', () => {
    it('deletes an existing role', async () => {
      entries.__updateChain.lean.mockResolvedValue({ flow: 'owner', roleKey: 'viewer' });

      const result = await service.deleteRole('owner', 'viewer');

      expect(entries.findOneAndDelete).toHaveBeenCalledWith({ flow: 'owner', roleKey: 'viewer' });
      expect(result).toEqual({ flow: 'owner', roleKey: 'viewer', deleted: true });
    });

    it('throws when the role does not exist', async () => {
      entries.__updateChain.lean.mockResolvedValue(null);

      await expect(service.deleteRole('owner', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
