import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { DEFAULT_ACCESS, DEFAULT_COUNTRY_RESTRICTION, DEFAULT_THEME } from './schemas/application.schema';

function buildModel() {
  const findChain = { sort: jest.fn().mockReturnThis(), lean: jest.fn() };
  const findOneChain = { lean: jest.fn() };
  const updateChain = { lean: jest.fn() };
  return {
    find: jest.fn().mockReturnValue(findChain),
    findOne: jest.fn().mockReturnValue(findOneChain),
    findOneAndUpdate: jest.fn().mockReturnValue(updateChain),
    findOneAndDelete: jest.fn().mockReturnValue(updateChain),
    updateMany: jest.fn().mockResolvedValue({}),
    exists: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    __findChain: findChain,
    __findOneChain: findOneChain,
    __updateChain: updateChain,
  };
}

function buildConfig(values: Record<string, string> = {}) {
  return { get: jest.fn((key: string) => values[key]) };
}

describe('ApplicationsService', () => {
  let applications: ReturnType<typeof buildModel>;
  let config: ReturnType<typeof buildConfig>;
  let service: ApplicationsService;

  beforeEach(() => {
    applications = buildModel();
    config = buildConfig();
    service = new ApplicationsService(applications as any, config as any);
  });

  it('seeds the 3 first-party apps on bootstrap', async () => {
    await service.onApplicationBootstrap();
    expect(applications.findOneAndUpdate).toHaveBeenCalledTimes(3);
    const keys = applications.findOneAndUpdate.mock.calls.map((call) => call[0].key);
    expect(keys).toEqual(['relay', 'business', 'jtrade']);
    expect(applications.updateMany).toHaveBeenCalledWith({}, { $unset: { ownerRoles: '', providerRoles: '' } }, { strict: false });
  });

  describe('listAll', () => {
    it('maps entries to response DTOs, never exposing serviceSecretHash', async () => {
      applications.__findChain.lean.mockResolvedValue([
        { key: 'relay', name: 'Relay', description: 'desc', launchUrl: 'https://relay', ownership: 'first_party', status: 'active', displayOrder: 1, theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['owner', 'provider', 'internal'], serviceSecretHash: 'should-not-leak' },
      ]);

      const result = await service.listAll();

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('serviceSecretHash');
      expect(result[0].key).toBe('relay');
    });
  });

  describe('createApplication', () => {
    it('creates an app, normalizes the key, generates and hashes a secret, returns the plaintext secret once', async () => {
      applications.exists.mockResolvedValue(false);
      applications.countDocuments.mockResolvedValue(3);
      applications.create.mockImplementation((doc: any) => Promise.resolve({ ...doc }));

      const result = await service.createApplication({
        key: '  New App  ',
        name: 'New App',
        description: 'A new app',
        launchUrl: 'https://new.app',
      });

      expect(applications.create).toHaveBeenCalledWith(expect.objectContaining({
        key: 'new_app',
        displayOrder: 4,
        ownership: 'first_party',
        status: 'active',
        theme: DEFAULT_THEME,
        defaultAccess: DEFAULT_ACCESS,
        countryRestriction: DEFAULT_COUNTRY_RESTRICTION,
        allowedFlows: ['owner', 'provider', 'internal'],
      }));
      expect(result.serviceSecret).toEqual(expect.any(String));
      expect(result.serviceSecret.length).toBeGreaterThan(20);
      expect(result).not.toHaveProperty('serviceSecretHash');
    });

    it('merges a partial theme onto the defaults instead of dropping unset fields', async () => {
      applications.exists.mockResolvedValue(false);
      applications.countDocuments.mockResolvedValue(0);
      applications.create.mockImplementation((doc: any) => Promise.resolve({ ...doc }));

      await service.createApplication({
        key: 'themed_app',
        name: 'Themed App',
        description: 'desc',
        launchUrl: 'https://themed.app',
        theme: { icon: '🚀', light: { primaryColor: '#000000' } },
      });

      const createdDoc = applications.create.mock.calls[0][0];
      expect(createdDoc.theme.icon).toBe('🚀');
      expect(createdDoc.theme.light.primaryColor).toBe('#000000');
      expect(createdDoc.theme.light.backgroundColor).toBe(DEFAULT_THEME.light.backgroundColor);
      expect(createdDoc.theme.dark).toEqual(DEFAULT_THEME.dark);
    });

    it('rejects a duplicate key', async () => {
      applications.exists.mockResolvedValue(true);
      await expect(service.createApplication({ key: 'relay', name: 'Relay', description: 'd', launchUrl: 'https://x' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a missing required field', async () => {
      await expect(service.createApplication({ key: '', name: 'X', description: 'd', launchUrl: 'https://x' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid allowedFlows value', async () => {
      applications.exists.mockResolvedValue(false);
      applications.countDocuments.mockResolvedValue(0);
      await expect(service.createApplication({
        key: 'bad_flow_app', name: 'X', description: 'd', launchUrl: 'https://x',
        allowedFlows: ['owner', 'bogus' as any],
      })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateApplication', () => {
    it('merges provided fields onto the existing document', async () => {
      applications.__findOneChain.lean.mockResolvedValue({
        key: 'relay', name: 'Relay', description: 'old', launchUrl: 'https://relay', ownership: 'first_party', status: 'active', displayOrder: 1,
        theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['owner', 'provider', 'internal'],
      });
      applications.__updateChain.lean.mockResolvedValue({
        key: 'relay', name: 'Relay', description: 'new description', launchUrl: 'https://relay', ownership: 'first_party', status: 'active', displayOrder: 1,
        theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['owner', 'provider', 'internal'],
      });

      const result = await service.updateApplication('relay', { description: 'new description' });

      expect(applications.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'relay' },
        { $set: { description: 'new description' } },
        expect.anything(),
      );
      expect(result.description).toBe('new description');
    });

    it('merges a partial countryRestriction patch onto the existing value', async () => {
      applications.__findOneChain.lean.mockResolvedValue({
        key: 'business', name: 'Business', description: 'd', launchUrl: 'https://business', ownership: 'first_party', status: 'active', displayOrder: 2,
        theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: { enabled: false, countries: [] }, allowedFlows: ['owner', 'provider', 'internal'],
      });
      applications.__updateChain.lean.mockResolvedValue({});

      await service.updateApplication('business', { countryRestriction: { enabled: true, countries: ['AU', 'NZ'] } });

      const patch = applications.findOneAndUpdate.mock.calls[0][1].$set;
      expect(patch.countryRestriction).toEqual({ enabled: true, countries: ['AU', 'NZ'] });
    });

    it('throws when the application does not exist', async () => {
      applications.__findOneChain.lean.mockResolvedValue(null);
      await expect(service.updateApplication('ghost', { description: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteApplication', () => {
    it('deletes an existing application', async () => {
      applications.__updateChain.lean.mockResolvedValue({ key: 'jtrade' });
      const result = await service.deleteApplication('jtrade');
      expect(applications.findOneAndDelete).toHaveBeenCalledWith({ key: 'jtrade' });
      expect(result).toEqual({ key: 'jtrade', deleted: true });
    });

    it('throws when the application does not exist', async () => {
      applications.__updateChain.lean.mockResolvedValue(null);
      await expect(service.deleteApplication('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
