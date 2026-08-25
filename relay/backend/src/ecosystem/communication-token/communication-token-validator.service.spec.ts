import { UnauthorizedException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { CommunicationTokenValidatorService } from './communication-token-validator.service';

function buildCompanyModel() {
  const findOneChain = { select: jest.fn().mockReturnThis(), lean: jest.fn() };
  return {
    findOne: jest.fn().mockReturnValue(findOneChain),
    __findOneChain: findOneChain,
  };
}

describe('CommunicationTokenValidatorService', () => {
  let http: { post: jest.Mock };
  let config: { get: jest.Mock };
  let identity: { resolveGrapiflyCompanyByOrganization: jest.Mock };
  let companyModel: ReturnType<typeof buildCompanyModel>;
  let service: CommunicationTokenValidatorService;

  beforeEach(() => {
    http = { post: jest.fn() };
    config = { get: jest.fn().mockReturnValue('http://grapifly-backend:3101') };
    identity = { resolveGrapiflyCompanyByOrganization: jest.fn() };
    companyModel = buildCompanyModel();
    service = new CommunicationTokenValidatorService(http as any, config as any, identity as any, companyModel as any);
  });

  describe('resolveCompanyByToken', () => {
    it('validates against Grapifly and resolves the local Company, matching the old return shape', async () => {
      http.post.mockReturnValue(of({ data: { organizationId: 'gpf_org_1', organizationName: 'Acme', tokenId: 'gpf_ctok_1' } }));
      identity.resolveGrapiflyCompanyByOrganization.mockResolvedValue({ _id: 'relay-company-id', companyKey: 'acme', displayName: 'Acme' });

      const result = await service.resolveCompanyByToken('gpf_comm_abc');

      expect(http.post).toHaveBeenCalledWith(
        'http://grapifly-backend:3101/internal/communication-tokens/validate',
        { token: 'gpf_comm_abc' },
        expect.objectContaining({ timeout: 5000 }),
      );
      expect(identity.resolveGrapiflyCompanyByOrganization).toHaveBeenCalledWith({ organizationId: 'gpf_org_1', name: 'Acme' });
      expect(result).toEqual({ companyId: 'relay-company-id', companyKey: 'acme', companyName: 'Acme' });
    });

    it('rejects when Grapifly rejects the token', async () => {
      http.post.mockReturnValue(throwError(() => new Error('401')));
      await expect(service.resolveCompanyByToken('gpf_comm_bad')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(identity.resolveGrapiflyCompanyByOrganization).not.toHaveBeenCalled();
    });
  });

  describe('resolvePlatformCompany', () => {
    it('returns the platform company shape', async () => {
      companyModel.__findOneChain.lean.mockResolvedValue({ _id: 'platform-id', companyKey: 'grapifly', displayName: 'Grapifly' });
      const result = await service.resolvePlatformCompany();
      expect(companyModel.findOne).toHaveBeenCalledWith({ isPlatformCompany: true });
      expect(result).toEqual({ companyId: 'platform-id', companyKey: 'grapifly', companyName: 'Grapifly', isPlatformCompany: true });
    });

    it('returns null when no platform company exists', async () => {
      companyModel.__findOneChain.lean.mockResolvedValue(null);
      const result = await service.resolvePlatformCompany();
      expect(result).toBeNull();
    });
  });
});
