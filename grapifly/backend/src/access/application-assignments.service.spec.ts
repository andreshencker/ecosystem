import { ForbiddenException } from '@nestjs/common';
import { ApplicationAssignmentsService } from './application-assignments.service';

function buildModel() {
  return {
    findOneAndUpdate: jest.fn().mockReturnValue({}),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn() }),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
    exists: jest.fn(),
  };
}

describe('ApplicationAssignmentsService', () => {
  let assignments: ReturnType<typeof buildModel>;
  let organizationApplications: ReturnType<typeof buildModel>;
  let memberApplications: ReturnType<typeof buildModel>;
  let users: ReturnType<typeof buildModel>;
  let applications: { listAll: jest.Mock; findByKey: jest.Mock; findByKeyWithSecret: jest.Mock; hashSecret: jest.Mock };
  let service: ApplicationAssignmentsService;

  beforeEach(() => {
    assignments = buildModel();
    organizationApplications = buildModel();
    memberApplications = buildModel();
    users = buildModel();
    applications = {
      listAll: jest.fn(),
      findByKey: jest.fn(),
      findByKeyWithSecret: jest.fn(),
      hashSecret: jest.fn((value: string) => `hashed:${value}`),
    };
    service = new ApplicationAssignmentsService(
      assignments as any,
      organizationApplications as any,
      memberApplications as any,
      users as any,
      applications as any,
    );
  });

  describe('grantDefaultAccess', () => {
    it('grants exactly the apps marked autoGrantOnSignup=true in the catalogue, not a hardcoded app', async () => {
      applications.listAll.mockResolvedValue([
        { key: 'relay', status: 'active', defaultAccess: { autoGrantOnSignup: true, tier: 'free' } },
        { key: 'business', status: 'active', defaultAccess: { autoGrantOnSignup: false, tier: 'free' } },
        { key: 'jtrade', status: 'active', defaultAccess: { autoGrantOnSignup: true, tier: 'trial' } },
        { key: 'inactive-app', status: 'inactive', defaultAccess: { autoGrantOnSignup: true, tier: 'free' } },
      ]);

      const granted = await service.grantDefaultAccess('gpf_usr_1', 'gpf_org_1');

      expect(granted.sort()).toEqual(['jtrade', 'relay']);
      expect(organizationApplications.findOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(memberApplications.findOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(organizationApplications.findOneAndUpdate).toHaveBeenCalledWith(
        { organizationId: 'gpf_org_1', applicationKey: 'relay' },
        expect.objectContaining({ $set: { status: 'active', tier: 'free', enabledBy: 'gpf_usr_1' } }),
        expect.anything(),
      );
    });

    it('grants nothing when no app is marked as default', async () => {
      applications.listAll.mockResolvedValue([
        { key: 'business', status: 'active', defaultAccess: { autoGrantOnSignup: false, tier: 'free' } },
      ]);

      const granted = await service.grantDefaultAccess('gpf_usr_1', 'gpf_org_1');

      expect(granted).toEqual([]);
      expect(organizationApplications.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('grantProviderSignup', () => {
    it('lands as pending when the app requires approval', async () => {
      applications.findByKey.mockResolvedValue({
        key: 'jtrade',
        allowedFlows: ['client', 'provider', 'internal'],
        defaultAccess: { tier: 'trial', requiresApproval: true },
      });

      await service.grantProviderSignup('gpf_usr_1', 'gpf_org_1', 'jtrade');

      expect(assignments.findOneAndUpdate).toHaveBeenCalledWith(
        { grapiflyUserId: 'gpf_usr_1', applicationKey: 'jtrade' },
        expect.objectContaining({ $set: { status: 'pending' } }),
        expect.anything(),
      );
    });

    it('lands as active when the app has no approval requirement', async () => {
      applications.findByKey.mockResolvedValue({
        key: 'jtrade',
        allowedFlows: ['client', 'provider', 'internal'],
        defaultAccess: { tier: 'trial', requiresApproval: false },
      });

      await service.grantProviderSignup('gpf_usr_1', 'gpf_org_1', 'jtrade');

      expect(assignments.findOneAndUpdate).toHaveBeenCalledWith(
        { grapiflyUserId: 'gpf_usr_1', applicationKey: 'jtrade' },
        expect.objectContaining({ $set: { status: 'active' } }),
        expect.anything(),
      );
    });

    it('does nothing when the app does not allow the provider flow', async () => {
      applications.findByKey.mockResolvedValue({
        key: 'business',
        allowedFlows: ['client', 'internal'],
        defaultAccess: { tier: 'free', requiresApproval: false },
      });

      await service.grantProviderSignup('gpf_usr_1', 'gpf_org_1', 'business');

      expect(assignments.findOneAndUpdate).not.toHaveBeenCalled();
      expect(organizationApplications.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('updates the assignment status and returns it', async () => {
      assignments.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'a1', status: 'active' }) });

      const result = await service.updateStatus('a1', 'active');

      expect(assignments.findByIdAndUpdate).toHaveBeenCalledWith('a1', { $set: { status: 'active' } }, { new: true });
      expect(result).toEqual({ _id: 'a1', status: 'active' });
    });

    it('throws when the assignment does not exist', async () => {
      assignments.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await expect(service.updateStatus('missing', 'active')).rejects.toThrow('Assignment not found');
    });
  });

  describe('assertAppClient', () => {
    it('accepts a secret that matches the requested app', async () => {
      applications.findByKeyWithSecret.mockResolvedValue({ key: 'relay', serviceSecretHash: 'hashed:correct-secret' });

      await expect(service.assertAppClient('relay', 'correct-secret')).resolves.toBeUndefined();
    });

    it('rejects a secret that does not match the requested app', async () => {
      applications.findByKeyWithSecret.mockResolvedValue({ key: 'relay', serviceSecretHash: 'hashed:correct-secret' });

      await expect(service.assertAppClient('relay', 'wrong-secret')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects a secret presented for a different app than it belongs to", async () => {
      // business's own secret must not validate against relay's client check.
      applications.findByKeyWithSecret.mockResolvedValue({ key: 'relay', serviceSecretHash: 'hashed:relay-secret' });

      await expect(service.assertAppClient('relay', 'business-secret')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when no secret is provided', async () => {
      applications.findByKeyWithSecret.mockResolvedValue({ key: 'relay', serviceSecretHash: 'hashed:correct-secret' });

      await expect(service.assertAppClient('relay', undefined)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the app is not registered in the catalogue', async () => {
      applications.findByKeyWithSecret.mockResolvedValue(null);

      await expect(service.assertAppClient('unknown-app', 'anything')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
