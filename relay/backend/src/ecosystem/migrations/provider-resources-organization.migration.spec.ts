import { ProviderResourcesOrganizationMigration } from './provider-resources-organization.migration';

describe('ProviderResourcesOrganizationMigration', () => {
  const companyQuery = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest
      .fn()
      .mockResolvedValue([
        { _id: 'company-1', grapiflyOrganizationId: 'gpf_org_1' },
      ]),
  };
  const providerQuery = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([{ _id: 'provider-config-1' }]),
  };
  const companies = { find: jest.fn().mockReturnValue(companyQuery) };
  const providers = {
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
    find: jest.fn().mockReturnValue(providerQuery),
    countDocuments: jest.fn().mockResolvedValue(4),
  };
  const credentials = {
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
    countDocuments: jest.fn().mockResolvedValue(5),
  };

  beforeEach(() => jest.clearAllMocks());

  it('migrates provider ownership without reading encrypted credentials', async () => {
    const migration = new ProviderResourcesOrganizationMigration(
      companies as any,
      providers as any,
      credentials as any,
    );

    await expect(migration.run()).resolves.toEqual({
      organizationsScanned: 1,
      providerConfigurationsMigrated: 2,
      credentialsMigrated: 3,
      unlinkedProviderConfigurations: 4,
      unlinkedCredentials: 5,
    });

    expect(credentials.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        companyChannelProviderId: { $in: ['provider-config-1'] },
      }),
      { $set: { grapiflyOrganizationId: 'gpf_org_1' } },
    );
    expect(credentials).not.toHaveProperty('find');
  });
});
