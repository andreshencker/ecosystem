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
    updateOne: jest.fn().mockResolvedValue({}),
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
  let relayStorage: { uploadApplicationAsset: jest.Mock };
  let service: ApplicationsService;

  beforeEach(() => {
    applications = buildModel();
    config = buildConfig();
    relayStorage = { uploadApplicationAsset: jest.fn() };
    service = new ApplicationsService(applications as any, config as any, relayStorage as any);
  });

  it('seeds the 4 first-party apps on bootstrap, grapifly included', async () => {
    await service.onApplicationBootstrap();
    expect(applications.findOneAndUpdate).toHaveBeenCalledTimes(4);
    const keys = applications.findOneAndUpdate.mock.calls.map((call) => call[0].key);
    expect(keys).toEqual(['grapifly', 'relay', 'business', 'jtrade']);
    expect(applications.updateMany).toHaveBeenCalledWith({}, { $unset: { ownerRoles: '', providerRoles: '' } }, { strict: false });
  });

  it('only seeds grapifly as isPrimary on insert — other apps never claim it on bootstrap', async () => {
    await service.onApplicationBootstrap();
    const calls = applications.findOneAndUpdate.mock.calls;
    for (const call of calls) {
      expect(call[1].$setOnInsert.isPrimary).toBe(call[0].key === 'grapifly');
    }
  });

  it('backfills theme.light/dark.primaryContrastText per app on bootstrap, so pre-existing rows pick up the new field', async () => {
    await service.onApplicationBootstrap();
    expect(applications.updateOne).toHaveBeenCalledTimes(4);
    const calls = applications.updateOne.mock.calls;
    const jtradeCall = calls.find((call) => call[0].key === 'jtrade');
    expect(jtradeCall[0]).toEqual({ key: 'jtrade', 'theme.light.primaryContrastText': { $exists: false } });
    expect(jtradeCall[1].$set['theme.light.primaryContrastText']).toBe('#111116');
  });

  it('backfills isPrimary:false onto rows saved before the field existed', async () => {
    await service.onApplicationBootstrap();
    expect(applications.updateMany).toHaveBeenCalledWith({ isPrimary: { $exists: false } }, { $set: { isPrimary: false } });
  });

  describe('listAll', () => {
    it('maps entries to response DTOs, never exposing serviceSecretHash', async () => {
      applications.__findChain.lean.mockResolvedValue([
        { key: 'relay', name: 'Relay', description: 'desc', launchUrl: 'https://relay', ownership: 'first_party', status: 'active', displayOrder: 1, theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['client', 'provider', 'internal'], serviceSecretHash: 'should-not-leak' },
      ]);

      const result = await service.listAll();

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('serviceSecretHash');
      expect(result[0].key).toBe('relay');
    });
  });

  describe('getPublicConfig', () => {
    it('returns the public brand contract plus allowedFlows, so any app can derive its own signup UI generically', async () => {
      applications.__findOneChain.lean.mockResolvedValue({
        key: 'relay', name: 'Relay', description: 'desc', launchUrl: 'https://relay',
        status: 'active', theme: DEFAULT_THEME, allowedFlows: ['client', 'internal'], serviceSecretHash: 'never-return-this',
      });

      const result = await service.getPublicConfig('relay');

      expect(result).toEqual(expect.objectContaining({ contractVersion: 1, key: 'relay', theme: DEFAULT_THEME, allowedFlows: ['client', 'internal'] }));
      expect(result).not.toHaveProperty('serviceSecretHash');
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
        allowedFlows: ['client', 'provider', 'internal'],
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
      expect(createdDoc.theme.light.primaryContrastText).toBe(DEFAULT_THEME.light.primaryContrastText);
      expect(createdDoc.theme.dark).toEqual(DEFAULT_THEME.dark);
    });

    it('lets a partial theme patch override primaryContrastText independently of primaryColor', async () => {
      applications.exists.mockResolvedValue(false);
      applications.countDocuments.mockResolvedValue(0);
      applications.create.mockImplementation((doc: any) => Promise.resolve({ ...doc }));

      await service.createApplication({
        key: 'contrast_app', name: 'Contrast App', description: 'desc', launchUrl: 'https://contrast.app',
        theme: { light: { primaryContrastText: '#111116' } },
      });

      const createdDoc = applications.create.mock.calls[0][0];
      expect(createdDoc.theme.light.primaryContrastText).toBe('#111116');
      expect(createdDoc.theme.light.primaryColor).toBe(DEFAULT_THEME.light.primaryColor);
    });

    it('demotes the current primary before creating a new one with isPrimary:true', async () => {
      applications.exists.mockResolvedValue(false);
      applications.countDocuments.mockResolvedValue(0);
      applications.create.mockImplementation((doc: any) => Promise.resolve({ ...doc }));

      await service.createApplication({
        key: 'new_primary', name: 'New Primary', description: 'd', launchUrl: 'https://x', isPrimary: true,
      });

      expect(applications.updateMany).toHaveBeenCalledWith({ isPrimary: true, key: { $ne: 'new_primary' } }, { $set: { isPrimary: false } });
      expect(applications.create).toHaveBeenCalledWith(expect.objectContaining({ isPrimary: true }));
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
        allowedFlows: ['client', 'bogus' as any],
      })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid theme color', async () => {
      applications.exists.mockResolvedValue(false);
      applications.countDocuments.mockResolvedValue(0);
      await expect(service.createApplication({
        key: 'bad_theme', name: 'X', description: 'd', launchUrl: 'https://x',
        theme: { light: { primaryColor: 'orange' } },
      })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateApplication', () => {
    it('merges provided fields onto the existing document', async () => {
      applications.__findOneChain.lean.mockResolvedValue({
        key: 'relay', name: 'Relay', description: 'old', launchUrl: 'https://relay', ownership: 'first_party', status: 'active', displayOrder: 1,
        theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['client', 'provider', 'internal'],
      });
      applications.__updateChain.lean.mockResolvedValue({
        key: 'relay', name: 'Relay', description: 'new description', launchUrl: 'https://relay', ownership: 'first_party', status: 'active', displayOrder: 1,
        theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['client', 'provider', 'internal'],
      });

      const result = await service.updateApplication('relay', { description: 'new description' });

      expect(applications.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'relay' },
        { $set: { description: 'new description' } },
        expect.anything(),
      );
      expect(result.description).toBe('new description');
    });

    it('demotes the current primary before promoting a different app to isPrimary:true', async () => {
      applications.__findOneChain.lean.mockResolvedValue({
        key: 'jtrade', name: 'JTrade', description: 'd', launchUrl: 'https://jtrade', ownership: 'first_party', status: 'active', displayOrder: 3, isPrimary: false,
        theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['client', 'provider', 'internal'],
      });
      applications.__updateChain.lean.mockResolvedValue({});

      await service.updateApplication('jtrade', { isPrimary: true });

      expect(applications.updateMany).toHaveBeenCalledWith({ isPrimary: true, key: { $ne: 'jtrade' } }, { $set: { isPrimary: false } });
      const patch = applications.findOneAndUpdate.mock.calls[0][1].$set;
      expect(patch.isPrimary).toBe(true);
    });

    it('merges a partial countryRestriction patch onto the existing value', async () => {
      applications.__findOneChain.lean.mockResolvedValue({
        key: 'business', name: 'Business', description: 'd', launchUrl: 'https://business', ownership: 'first_party', status: 'active', displayOrder: 2,
        theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: { enabled: false, countries: [] }, allowedFlows: ['client', 'provider', 'internal'],
      });
      applications.__updateChain.lean.mockResolvedValue({});

      await service.updateApplication('business', { countryRestriction: { enabled: true, countries: ['AU', 'NZ'] } });

      const patch = applications.findOneAndUpdate.mock.calls[0][1].$set;
      expect(patch.countryRestriction).toEqual({ enabled: true, countries: ['AU', 'NZ'] });
    });

    it('clears theme.logoUrl to null when explicitly sent as null (not just dropped when omitted)', async () => {
      applications.__findOneChain.lean.mockResolvedValue({
        key: 'jtrade', name: 'JTrade', description: 'd', launchUrl: 'https://jtrade', ownership: 'first_party', status: 'active', displayOrder: 3,
        theme: { ...DEFAULT_THEME, logoUrl: 'https://cdn.example.com/logo.png' }, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['client', 'provider', 'internal'],
      });
      applications.__updateChain.lean.mockResolvedValue({});

      await service.updateApplication('jtrade', { theme: { logoUrl: null } as any });

      const patch = applications.findOneAndUpdate.mock.calls[0][1].$set;
      expect(patch.theme.logoUrl).toBeNull();
    });

    it('clears theme.logoUrlDark and theme.faviconUrl to null when explicitly sent as null', async () => {
      applications.__findOneChain.lean.mockResolvedValue({
        key: 'jtrade', name: 'JTrade', description: 'd', launchUrl: 'https://jtrade', ownership: 'first_party', status: 'active', displayOrder: 3,
        theme: { ...DEFAULT_THEME, logoUrlDark: 'https://cdn.example.com/logo-dark.png', faviconUrl: 'https://cdn.example.com/favicon.png' },
        defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['client', 'provider', 'internal'],
      });
      applications.__updateChain.lean.mockResolvedValue({});

      await service.updateApplication('jtrade', { theme: { logoUrlDark: null, faviconUrl: null } as any });

      const patch = applications.findOneAndUpdate.mock.calls[0][1].$set;
      expect(patch.theme.logoUrlDark).toBeNull();
      expect(patch.theme.faviconUrl).toBeNull();
    });

    it('throws when the application does not exist', async () => {
      applications.__findOneChain.lean.mockResolvedValue(null);
      await expect(service.updateApplication('ghost', { description: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('uploadThemeAsset', () => {
    const file = { originalname: 'logo.png', mimetype: 'image/png', buffer: Buffer.from('x') } as any;

    it.each([
      ['logo', 'logoUrl', 'https://cdn.example.com/logo.png'],
      ['logo-dark', 'logoUrlDark', 'https://cdn.example.com/logo-dark.png'],
      ['favicon', 'faviconUrl', 'https://cdn.example.com/favicon.png'],
    ] as const)('uploads a %s via RelayStorageService and sets theme.%s to the returned url', async (kind, themeField, url) => {
      applications.__findOneChain.lean.mockResolvedValueOnce({
        key: 'jtrade', name: 'JTrade', description: 'd', launchUrl: 'https://jtrade', ownership: 'first_party', status: 'active', displayOrder: 3,
        theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['client', 'provider', 'internal'],
      });
      relayStorage.uploadApplicationAsset.mockResolvedValue({ url });
      applications.__findOneChain.lean.mockResolvedValueOnce({
        key: 'jtrade', name: 'JTrade', description: 'd', launchUrl: 'https://jtrade', ownership: 'first_party', status: 'active', displayOrder: 3,
        theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['client', 'provider', 'internal'],
      });
      applications.__updateChain.lean.mockResolvedValue({
        key: 'jtrade', name: 'JTrade', description: 'd', launchUrl: 'https://jtrade', ownership: 'first_party', status: 'active', displayOrder: 3,
        theme: { ...DEFAULT_THEME, [themeField]: url }, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, allowedFlows: ['client', 'provider', 'internal'],
      });

      const result = await service.uploadThemeAsset('jtrade', file, kind);

      expect(relayStorage.uploadApplicationAsset).toHaveBeenCalledWith(file, 'jtrade', kind);
      expect(applications.findOneAndUpdate.mock.calls[0][1].$set.theme[themeField]).toBe(url);
      expect((result.theme as any)[themeField]).toBe(url);
    });

    it('throws when the application does not exist, without calling RelayStorageService', async () => {
      applications.__findOneChain.lean.mockResolvedValue(null);
      await expect(service.uploadThemeAsset('ghost', file, 'logo')).rejects.toBeInstanceOf(NotFoundException);
      expect(relayStorage.uploadApplicationAsset).not.toHaveBeenCalled();
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
