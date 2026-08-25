import { Types } from 'mongoose';
import { CompanyThemeService } from './company-theme.service';

describe('CompanyThemeService tenant isolation', () => {
  const companyId = new Types.ObjectId().toHexString();
  const service = new CompanyThemeService({} as any);

  it('uses only the local projection for non-Grapifly machine contexts', () => {
    expect((service as any).tenantFilter({ companyId })).toEqual({
      companyId: new Types.ObjectId(companyId),
    });
  });

  it('prefers the canonical organization while limiting legacy fallback to its bound company', () => {
    expect(
      (service as any).tenantFilter({
        companyId,
        grapiflyOrganizationId: 'gpf_org_acme',
      }),
    ).toEqual({
      $or: [
        { grapiflyOrganizationId: 'gpf_org_acme' },
        {
          companyId: new Types.ObjectId(companyId),
          $or: [
            { grapiflyOrganizationId: null },
            { grapiflyOrganizationId: { $exists: false } },
          ],
        },
      ],
    });
  });
});
