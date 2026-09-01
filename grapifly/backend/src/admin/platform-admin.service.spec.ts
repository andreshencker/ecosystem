import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service';

function buildModel() {
  return {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn().mockResolvedValue(undefined),
    updateOne: jest.fn().mockResolvedValue(undefined),
    create: jest.fn(),
    find: jest.fn(),
  };
}

describe('PlatformAdminService — invitation flow', () => {
  let admins: ReturnType<typeof buildModel>;
  let invitations: ReturnType<typeof buildModel>;
  let users: ReturnType<typeof buildModel>;
  let usersService: { findByEmail: jest.Mock; findByGrapiflyUserId: jest.Mock };
  let roleCatalog: { isValidRole: jest.Mock; rolesForFlow: jest.Mock };
  let config: { get: jest.Mock };
  let organizations: { findPlatformOrganizationSummary: jest.Mock };
  let relayNotifications: { sendEvent: jest.Mock };
  let service: PlatformAdminService;

  beforeEach(() => {
    admins = buildModel();
    invitations = buildModel();
    users = buildModel();
    usersService = { findByEmail: jest.fn(), findByGrapiflyUserId: jest.fn() };
    roleCatalog = {
      isValidRole: jest.fn((flow: string, role: string) => Promise.resolve(['ecosystem_super_admin', 'ecosystem_admin'].includes(role))),
      rolesForFlow: jest.fn().mockResolvedValue(['ecosystem_super_admin', 'ecosystem_admin']),
    };
    config = { get: jest.fn() };
    organizations = { findPlatformOrganizationSummary: jest.fn().mockResolvedValue({ organizationId: 'gpf_org_grapifly', name: 'Grapifly' }) };
    relayNotifications = { sendEvent: jest.fn().mockResolvedValue(undefined) };
    service = new PlatformAdminService(
      admins as any,
      invitations as any,
      users as any,
      usersService as any,
      roleCatalog as any,
      config as any,
      organizations as any,
      relayNotifications as any,
    );
  });

  describe('requireSuperAdmin', () => {
    it('allows an active ecosystem_super_admin through', async () => {
      admins.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_1', role: 'ecosystem_super_admin', status: 'active' }) });

      await expect(service.requireSuperAdmin('gpf_usr_1')).resolves.toMatchObject({ role: 'ecosystem_super_admin' });
    });

    it('rejects a plain ecosystem_admin (not super)', async () => {
      admins.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_2', role: 'ecosystem_admin', status: 'active' }) });

      await expect(service.requireSuperAdmin('gpf_usr_2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects someone with no admin row at all', async () => {
      admins.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await expect(service.requireSuperAdmin('gpf_usr_3')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('invite', () => {
    it('lets a super admin create a pending invitation with a valid level', async () => {
      admins.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_1', role: 'ecosystem_super_admin', status: 'active' }) });
      invitations.create.mockResolvedValue({ toObject: () => ({ invitationId: 'gpf_adm_inv_1', email: 'new-admin@example.com', level: 'ecosystem_admin' }) });

      const result = await service.invite('gpf_usr_1', 'New-Admin@Example.com', 'ecosystem_admin');

      expect(invitations.updateMany).toHaveBeenCalledWith({ email: 'new-admin@example.com', status: 'pending' }, { $set: { status: 'cancelled' } });
      expect(invitations.create).toHaveBeenCalled();
      expect(result.token).toEqual(expect.any(String));
      expect(result.invitation.tokenHash).toBeUndefined();
    });

    it('rejects an invalid admin level', async () => {
      admins.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_1', role: 'ecosystem_super_admin', status: 'active' }) });

      await expect(service.invite('gpf_usr_1', 'someone@example.com', 'made-up-level')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a non-super-admin trying to invite', async () => {
      admins.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_2', role: 'ecosystem_admin', status: 'active' }) });

      await expect(service.invite('gpf_usr_2', 'someone@example.com', 'ecosystem_admin')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('fires a fire-and-forget Relay notification against the platform organization', async () => {
      admins.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_1', role: 'ecosystem_super_admin', status: 'active' }) });
      invitations.create.mockResolvedValue({ toObject: () => ({ invitationId: 'gpf_adm_inv_1', email: 'new-admin@example.com', level: 'ecosystem_admin' }) });
      config.get.mockReturnValue('http://localhost:3100');

      await service.invite('gpf_usr_1', 'new-admin@example.com', 'ecosystem_admin');

      expect(organizations.findPlatformOrganizationSummary).toHaveBeenCalled();
      expect(relayNotifications.sendEvent).toHaveBeenCalledTimes(1);
      const call = relayNotifications.sendEvent.mock.calls[0][0];
      expect(call.organizationId).toBe('gpf_org_grapifly');
      expect(call.organizationName).toBe('Grapifly');
      expect(call.event).toBe('grapifly_admin_invitation');
      expect(call.email).toBe('new-admin@example.com');
      expect(call.payload.invitationUrl).toMatch(/^http:\/\/localhost:3100\/admin-invitations\/.+/);
      expect(call.payload.level).toBe('ecosystem_admin');
    });

    it('skips the Relay notification when the platform organization has not been provisioned yet', async () => {
      admins.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_1', role: 'ecosystem_super_admin', status: 'active' }) });
      invitations.create.mockResolvedValue({ toObject: () => ({ invitationId: 'gpf_adm_inv_1', email: 'new-admin@example.com', level: 'ecosystem_admin' }) });
      organizations.findPlatformOrganizationSummary.mockResolvedValue(null);

      const result = await service.invite('gpf_usr_1', 'new-admin@example.com', 'ecosystem_admin');

      expect(relayNotifications.sendEvent).not.toHaveBeenCalled();
      expect(result.token).toEqual(expect.any(String));
    });
  });

  describe('acceptInvitation', () => {
    it('grants the invited level and marks the user as internal', async () => {
      usersService.findByGrapiflyUserId.mockResolvedValue({ grapiflyUserId: 'gpf_usr_9', email: 'invitee@example.com' });
      const invitationDoc = {
        email: 'invitee@example.com',
        level: 'ecosystem_admin',
        expiresAt: new Date(Date.now() + 60_000),
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      invitations.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(invitationDoc) });
      admins.findOneAndUpdate.mockReturnValue({ returnDocument: 'after' });

      const result = await service.acceptInvitation('gpf_usr_9', 'valid-token');

      expect(result).toEqual({ level: 'ecosystem_admin' });
      expect(admins.findOneAndUpdate).toHaveBeenCalledWith(
        { email: 'invitee@example.com' },
        { $set: { grapiflyUserId: 'gpf_usr_9', role: 'ecosystem_admin', status: 'active' } },
        expect.anything(),
      );
      expect(users.updateOne).toHaveBeenCalledWith({ grapiflyUserId: 'gpf_usr_9' }, { $set: { tipo: 'internal' } });
      expect(invitationDoc.status).toBe('accepted');
    });

    it('rejects when the invitation email does not match the accepting user', async () => {
      usersService.findByGrapiflyUserId.mockResolvedValue({ grapiflyUserId: 'gpf_usr_9', email: 'someone-else@example.com' });
      invitations.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          email: 'invitee@example.com',
          level: 'ecosystem_admin',
          expiresAt: new Date(Date.now() + 60_000),
          status: 'pending',
        }),
      });

      await expect(service.acceptInvitation('gpf_usr_9', 'valid-token')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an expired invitation', async () => {
      usersService.findByGrapiflyUserId.mockResolvedValue({ grapiflyUserId: 'gpf_usr_9', email: 'invitee@example.com' });
      invitations.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          email: 'invitee@example.com',
          level: 'ecosystem_admin',
          expiresAt: new Date(Date.now() - 60_000),
          status: 'pending',
        }),
      });

      await expect(service.acceptInvitation('gpf_usr_9', 'valid-token')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
