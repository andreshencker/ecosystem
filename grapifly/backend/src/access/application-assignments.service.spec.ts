import { ForbiddenException } from '@nestjs/common';
import { ApplicationAssignmentsService } from './application-assignments.service';

function buildModel() {
  return {
    findOneAndUpdate: jest.fn().mockReturnValue({}),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
    exists: jest.fn(),
  };
}

describe('ApplicationAssignmentsService', () => {
  let assignments: ReturnType<typeof buildModel>;
  let organizationApplications: ReturnType<typeof buildModel>;
  let memberApplications: ReturnType<typeof buildModel>;
  let users: ReturnType<typeof buildModel>;
  let applications: { listAll: jest.Mock; findByKeyWithSecret: jest.Mock; hashSecret: jest.Mock };
  let service: ApplicationAssignmentsService;

  beforeEach(() => {
    assignments = buildModel();
    organizationApplications = buildModel();
    memberApplications = buildModel();
    users = buildModel();
    applications = {
      listAll: jest.fn(),
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
        { key: 'relay', status: 'active', defaultAccess: { autoGrantOnSignup: true } },
        { key: 'business', status: 'active', defaultAccess: { autoGrantOnSignup: false } },
        { key: 'jtrade', status: 'active', defaultAccess: { autoGrantOnSignup: true } },
        { key: 'inactive-app', status: 'inactive', defaultAccess: { autoGrantOnSignup: true } },
      ]);

      const granted = await service.grantDefaultAccess('gpf_usr_1', 'gpf_org_1');

      expect(granted.sort()).toEqual(['jtrade', 'relay']);
      expect(organizationApplications.findOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(memberApplications.findOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(organizationApplications.findOneAndUpdate).toHaveBeenCalledWith(
        { organizationId: 'gpf_org_1', applicationKey: 'relay' },
        expect.objectContaining({ $set: { status: 'active', enabledBy: 'gpf_usr_1' } }),
        expect.anything(),
      );
    });

    it('grants nothing when no app is marked as default', async () => {
      applications.listAll.mockResolvedValue([
        { key: 'business', status: 'active', defaultAccess: { autoGrantOnSignup: false } },
      ]);

      const granted = await service.grantDefaultAccess('gpf_usr_1', 'gpf_org_1');

      expect(granted).toEqual([]);
      expect(organizationApplications.findOneAndUpdate).not.toHaveBeenCalled();
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
