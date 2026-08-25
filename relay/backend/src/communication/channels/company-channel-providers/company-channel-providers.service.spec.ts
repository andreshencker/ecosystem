import { Types } from 'mongoose';
import { CompanyChannelProvidersService } from './company-channel-providers.service';

describe('CompanyChannelProvidersService tenant isolation', () => {
  const companyId = new Types.ObjectId();
  const service = new CompanyChannelProvidersService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  it('uses canonical ownership with a legacy fallback limited to the bound company', () => {
    expect(
      (service as any).tenantFilter({
        companyId,
        grapiflyOrganizationId: 'gpf_org_acme',
      }),
    ).toEqual({
      $or: [
        { grapiflyOrganizationId: 'gpf_org_acme' },
        {
          companyId,
          $or: [
            { grapiflyOrganizationId: null },
            { grapiflyOrganizationId: { $exists: false } },
          ],
        },
      ],
    });
  });

  it('keeps unlinked machine tenants scoped to their local projection', () => {
    expect(
      (service as any).tenantFilter({
        companyId,
        grapiflyOrganizationId: null,
      }),
    ).toEqual({ companyId });
  });
});
