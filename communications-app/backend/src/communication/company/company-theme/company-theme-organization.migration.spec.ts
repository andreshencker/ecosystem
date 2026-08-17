import { CompanyThemeOrganizationMigration } from './company-theme-organization.migration';

describe('CompanyThemeOrganizationMigration', () => {
  const organizations = [
    { _id: 'company-1', grapiflyOrganizationId: 'gpf_org_1' },
    { _id: 'company-2', grapiflyOrganizationId: 'gpf_org_2' },
  ];
  const companyQuery = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(organizations),
  };
  const companies = { find: jest.fn().mockReturnValue(companyQuery) };
  const themes = {
    updateMany: jest
      .fn()
      .mockResolvedValueOnce({ modifiedCount: 2 })
      .mockResolvedValueOnce({ modifiedCount: 1 }),
    countDocuments: jest.fn().mockResolvedValue(3),
  };

  beforeEach(() => jest.clearAllMocks());

  it('backfills canonical organization IDs without deleting legacy themes', async () => {
    const migration = new CompanyThemeOrganizationMigration(
      companies as any,
      themes as any,
    );

    await expect(migration.run()).resolves.toEqual({
      organizationsScanned: 2,
      themesMigrated: 3,
      legacyThemesWithoutOrganization: 3,
    });

    expect(themes.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ companyId: 'company-1' }),
      { $set: { grapiflyOrganizationId: 'gpf_org_1' } },
    );
    expect(themes).not.toHaveProperty('deleteMany');
  });
});
