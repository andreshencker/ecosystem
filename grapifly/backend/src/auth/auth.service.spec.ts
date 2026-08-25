import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function buildModel() {
  const findChain = { sort: jest.fn().mockReturnThis(), lean: jest.fn() };
  const findOneChain = { lean: jest.fn() };
  const updateChain = { lean: jest.fn() };
  return {
    find: jest.fn().mockReturnValue(findChain),
    findOne: jest.fn().mockReturnValue(findOneChain),
    findOneAndUpdate: jest.fn().mockReturnValue(updateChain),
    create: jest.fn(),
    __findChain: findChain,
    __findOneChain: findOneChain,
    __updateChain: updateChain,
  };
}

describe('AuthService — generic SSO exchange', () => {
  let users: { findByGrapiflyUserId: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let ssoCodes: ReturnType<typeof buildModel>;
  let organizations: ReturnType<typeof buildModel>;
  let memberships: ReturnType<typeof buildModel>;
  let organizationApps: ReturnType<typeof buildModel>;
  let memberApps: ReturnType<typeof buildModel>;
  let applications: { findByKey: jest.Mock };
  let applicationAssignments: { assertAppClient: jest.Mock };
  let service: AuthService;

  const activeMembership = { organizationId: 'gpf_org_acme', role: 'owner', status: 'active' };
  const activeOrganization = { organizationId: 'gpf_org_acme', name: 'Acme', isPlatform: false, status: 'active' };

  beforeEach(() => {
    users = { findByGrapiflyUserId: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_1', email: 'owner@example.com' }) };
    jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    ssoCodes = buildModel();
    organizations = buildModel();
    memberships = buildModel();
    organizationApps = buildModel();
    memberApps = buildModel();
    applications = { findByKey: jest.fn() };
    applicationAssignments = { assertAppClient: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(
      users as any,
      jwt as any,
      ssoCodes as any,
      organizations as any,
      memberships as any,
      organizationApps as any,
      memberApps as any,
      applications as any,
      applicationAssignments as any,
    );
  });

  describe('assertActiveApplication', () => {
    it('returns the catalogue entry for a real, active appKey', async () => {
      applications.findByKey.mockResolvedValue({ key: 'business', ssoCallbackUrl: 'https://business.example.com/callback' });
      await expect(service.assertActiveApplication('business')).resolves.toMatchObject({ key: 'business' });
    });

    it('throws NotFoundException for an unknown or inactive appKey', async () => {
      applications.findByKey.mockResolvedValue(null);
      await expect(service.assertActiveApplication('nonexistent-app')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createSsoCode', () => {
    it('mints a code for any appKey the user has active access to (not just relay)', async () => {
      memberships.__findChain.lean.mockResolvedValue([activeMembership]);
      organizations.__findChain.lean.mockResolvedValue([activeOrganization]);
      organizationApps.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_acme', applicationKey: 'business', status: 'active' });
      memberApps.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_acme', applicationKey: 'business', role: 'owner', status: 'active' });
      ssoCodes.create.mockResolvedValue({});

      const code = await service.createSsoCode('business', 'gpf_usr_1');

      expect(code).toEqual(expect.any(String));
      expect(ssoCodes.create).toHaveBeenCalledWith(expect.objectContaining({ appKey: 'business', organizationId: 'gpf_org_acme' }));
    });

    it('rejects when the user has no active access to that app in any organization', async () => {
      memberships.__findChain.lean.mockResolvedValue([]);
      organizations.__findChain.lean.mockResolvedValue([]);

      await expect(service.createSsoCode('business', 'gpf_usr_1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('exchangeSsoCode', () => {
    it('rejects an invalid client secret via the shared per-app mechanism, without touching the code', async () => {
      applicationAssignments.assertAppClient.mockRejectedValue(new ForbiddenException('Invalid Grapifly application client'));

      await expect(service.exchangeSsoCode('a-code', 'business', 'wrong-secret')).rejects.toBeInstanceOf(ForbiddenException);
      expect(ssoCodes.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects an invalid or already-consumed code', async () => {
      ssoCodes.__updateChain.lean.mockResolvedValue(null);

      await expect(service.exchangeSsoCode('a-code', 'business', 'real-secret')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns a contract with no permissions field, and audience reflecting the requested appKey', async () => {
      ssoCodes.__updateChain.lean.mockResolvedValue({ grapiflyUserId: 'gpf_usr_1', organizationId: 'gpf_org_acme' });
      memberships.__findChain.lean.mockResolvedValue([activeMembership]);
      organizations.__findChain.lean.mockResolvedValue([activeOrganization]);
      organizationApps.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_acme', applicationKey: 'business', status: 'active' });
      memberApps.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_acme', applicationKey: 'business', role: 'owner', status: 'active' });

      const contract = await service.exchangeSsoCode('a-code', 'business', 'real-secret');

      expect(applicationAssignments.assertAppClient).toHaveBeenCalledWith('business', 'real-secret');
      expect(ssoCodes.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ appKey: 'business' }),
        expect.anything(),
        expect.anything(),
      );
      expect(contract.audience).toBe('business');
      expect(contract.access).toEqual({ organizationRole: 'owner', applicationRole: 'owner' });
      expect(contract.access).not.toHaveProperty('permissions');
    });
  });
});
