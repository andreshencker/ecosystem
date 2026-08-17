import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RelayTenantContextService } from './relay-tenant-context.service';
import type { AuthContext } from '../types/auth-context.types';

describe('RelayTenantContextService', () => {
  const company = {
    _id: '64b000000000000000000001',
    companyKey: 'acme',
    grapiflyOrganizationId: 'gpf_org_acme',
    isActive: true,
  };
  let exec: jest.Mock;
  let companyModel: { findOne: jest.Mock };
  let service: RelayTenantContextService;

  const auth: AuthContext = {
    actorType: 'user',
    userId: 'relay-user-id',
    companyId: company._id,
    companyKey: company.companyKey,
    grapiflyOrganizationId: company.grapiflyOrganizationId,
    role: 'company_owner',
    scope: 'company',
    permissions: ['relay.use', 'relay.organization.manage'],
  };

  beforeEach(() => {
    exec = jest.fn().mockResolvedValue(company);
    companyModel = {
      findOne: jest.fn().mockReturnValue({
        lean: () => ({ exec }),
      }),
    };
    service = new RelayTenantContextService(companyModel as any);
  });

  it('resolves the Relay company only when both tenant identifiers match', async () => {
    await expect(service.resolve(auth)).resolves.toMatchObject({
      companyId: company._id,
      companyKey: 'acme',
      grapiflyOrganizationId: 'gpf_org_acme',
      role: 'company_owner',
    });
    expect(companyModel.findOne).toHaveBeenCalledWith({
      _id: company._id,
      grapiflyOrganizationId: 'gpf_org_acme',
      isActive: true,
    });
  });

  it('rejects sessions that do not carry a Grapifly organization', async () => {
    await expect(
      service.resolve({ ...auth, grapiflyOrganizationId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(companyModel.findOne).not.toHaveBeenCalled();
  });

  it('rejects machine actors on portal tenant resolution', async () => {
    await expect(
      service.resolve({ actorType: 'apikey', companyId: company._id }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('enforces the permission required by the calling service', async () => {
    await expect(
      service.resolve(auth, 'relay.credentials.manage'),
    ).rejects.toThrow('Missing Grapifly permission: relay.credentials.manage');
    expect(companyModel.findOne).not.toHaveBeenCalled();
  });

  it('rejects a company not linked to the organization in the session', async () => {
    exec.mockResolvedValue(null);
    await expect(service.resolve(auth)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
