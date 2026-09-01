import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

function buildModel() {
  const findChain = { sort: jest.fn().mockReturnThis(), lean: jest.fn() };
  const findOneChain = { lean: jest.fn() };
  const updateChain = { lean: jest.fn() };
  return {
    find: jest.fn().mockReturnValue(findChain),
    findOne: jest.fn().mockReturnValue(findOneChain),
    findOneAndUpdate: jest.fn().mockReturnValue(updateChain),
    updateMany: jest.fn().mockResolvedValue({}),
    create: jest.fn(),
    __findChain: findChain,
    __findOneChain: findOneChain,
    __updateChain: updateChain,
  };
}

describe('OrganizationsService — admin CRUD', () => {
  let organizations: ReturnType<typeof buildModel>;
  let memberships: ReturnType<typeof buildModel>;
  let memberApplications: ReturnType<typeof buildModel>;
  let organizationApplications: ReturnType<typeof buildModel>;
  let invitations: ReturnType<typeof buildModel>;
  let users: { findByGrapiflyUserId: jest.Mock; findByEmail: jest.Mock };
  let applications: { listAll: jest.Mock };
  let accessAssignments: { grantDefaultAccess: jest.Mock };
  let roleCatalog: { rolesForFlow: jest.Mock };
  let relayNotifications: { sendEvent: jest.Mock };
  let config: { get: jest.Mock };
  let service: OrganizationsService;

  beforeEach(() => {
    organizations = buildModel();
    memberships = buildModel();
    memberApplications = buildModel();
    organizationApplications = buildModel();
    invitations = buildModel();
    users = { findByGrapiflyUserId: jest.fn(), findByEmail: jest.fn() };
    applications = { listAll: jest.fn().mockResolvedValue([]) };
    accessAssignments = { grantDefaultAccess: jest.fn().mockResolvedValue([]) };
    roleCatalog = { rolesForFlow: jest.fn().mockResolvedValue([]) };
    relayNotifications = { sendEvent: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn() };
    service = new OrganizationsService(
      organizations as any,
      memberships as any,
      memberApplications as any,
      organizationApplications as any,
      invitations as any,
      users as any,
      applications as any,
      accessAssignments as any,
      roleCatalog as any,
      relayNotifications as any,
      config as any,
    );
  });

  describe('findPlatformOrganizationSummary', () => {
    it('returns the organization flagged isPlatform: true', async () => {
      const selectChain = { lean: jest.fn().mockResolvedValue({ organizationId: 'gpf_org_grapifly', name: 'Grapifly' }) };
      organizations.findOne.mockReturnValue({ select: jest.fn().mockReturnValue(selectChain) });

      const result = await service.findPlatformOrganizationSummary();

      expect(organizations.findOne).toHaveBeenCalledWith({ isPlatform: true });
      expect(result).toEqual({ organizationId: 'gpf_org_grapifly', name: 'Grapifly' });
    });

    it('returns null when no organization is flagged as platform yet', async () => {
      const selectChain = { lean: jest.fn().mockResolvedValue(null) };
      organizations.findOne.mockReturnValue({ select: jest.fn().mockReturnValue(selectChain) });

      const result = await service.findPlatformOrganizationSummary();

      expect(result).toBeNull();
    });
  });

  describe('listAllForAdmin', () => {
    it('returns every organization mapped to the response DTO, regardless of status', async () => {
      organizations.__findChain.lean.mockResolvedValue([
        { organizationId: 'gpf_org_1', name: 'Acme', slug: 'acme', createdBy: 'gpf_usr_1', entityType: 'company', status: 'archived', isPlatform: false, isDefault: false, _id: 'mongo-id' },
      ]);

      const result = await service.listAllForAdmin();

      expect(organizations.find).toHaveBeenCalledWith();
      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe('gpf_org_1');
      expect(result[0]).not.toHaveProperty('_id');
    });
  });

  describe('createForAdmin', () => {
    it('rejects when ownerEmail does not match an existing user', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(service.createForAdmin({ name: 'Acme', ownerEmail: 'ghost@example.com' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates the organization and its owner membership when the owner exists', async () => {
      users.findByEmail.mockResolvedValue({ grapiflyUserId: 'gpf_usr_1', email: 'owner@example.com' });
      organizations.create.mockImplementation((doc: any) => Promise.resolve({ toObject: () => doc }));
      memberships.create.mockResolvedValue({});

      const result = await service.createForAdmin({ name: 'Acme Corp', ownerEmail: 'owner@example.com', entityType: 'company' });

      expect(organizations.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Acme Corp', createdBy: 'gpf_usr_1', entityType: 'company' }));
      expect(memberships.create).toHaveBeenCalledWith(expect.objectContaining({ grapiflyUserId: 'gpf_usr_1', role: 'owner', status: 'active' }));
      expect(accessAssignments.grantDefaultAccess).toHaveBeenCalledWith('gpf_usr_1', expect.any(String));
      expect(result.name).toBe('Acme Corp');
    });
  });

  describe('updateProfileForAdmin', () => {
    it('updates profile fields without requiring organization membership', async () => {
      organizations.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_1', status: 'active', isPlatform: false, isDefault: false });
      organizations.__updateChain.lean.mockResolvedValue({ organizationId: 'gpf_org_1', name: 'New name', status: 'active' });

      const result = await service.updateProfileForAdmin('gpf_org_1', { name: 'New name' });

      expect(organizations.findOneAndUpdate).toHaveBeenCalledWith(
        { organizationId: 'gpf_org_1' },
        { $set: { name: 'New name' } },
        expect.anything(),
      );
      expect(result.name).toBe('New name');
    });

    it('cascades suspend/revoke/cancel when status changes to archived', async () => {
      organizations.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_1', status: 'active', isPlatform: false, isDefault: false });
      organizations.__updateChain.lean.mockResolvedValue({ organizationId: 'gpf_org_1', status: 'archived' });

      await service.updateProfileForAdmin('gpf_org_1', { status: 'archived' });

      expect(organizationApplications.updateMany).toHaveBeenCalledWith({ organizationId: 'gpf_org_1' }, { $set: { status: 'suspended' } });
      expect(memberApplications.updateMany).toHaveBeenCalledWith({ organizationId: 'gpf_org_1' }, { $set: { status: 'revoked' } });
      expect(invitations.updateMany).toHaveBeenCalledWith({ organizationId: 'gpf_org_1', status: 'pending' }, { $set: { status: 'cancelled' } });
      const patch = organizations.findOneAndUpdate.mock.calls[0][1].$set;
      expect(patch.status).toBe('archived');
    });

    it('rejects archiving the default organization', async () => {
      organizations.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_grapifly', status: 'active', isPlatform: false, isDefault: true });
      await expect(service.updateProfileForAdmin('gpf_org_grapifly', { status: 'archived' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects moving the platform organization out of active status', async () => {
      organizations.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_grapifly', status: 'active', isPlatform: true, isDefault: true });
      await expect(service.updateProfileForAdmin('gpf_org_grapifly', { status: 'suspended' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when the organization does not exist', async () => {
      organizations.__findOneChain.lean.mockResolvedValue(null);
      await expect(service.updateProfileForAdmin('ghost', { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('archiveForAdmin', () => {
    it('archives an existing organization', async () => {
      organizations.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_1', status: 'active', isPlatform: false, isDefault: false });
      organizations.__updateChain.lean.mockResolvedValue({ organizationId: 'gpf_org_1', status: 'archived' });

      const result = await service.archiveForAdmin('gpf_org_1');

      expect(result).toEqual({ organizationId: 'gpf_org_1', status: 'archived' });
    });
  });

  describe('listEnabledApplications', () => {
    it('joins enabled org apps with catalogue theme/branding and the caller\'s own access', async () => {
      memberships.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_1', grapiflyUserId: 'gpf_usr_1', role: 'member', status: 'active' });
      organizationApplications.__findChain.lean.mockResolvedValue([{ organizationId: 'gpf_org_1', applicationKey: 'relay', status: 'active', tier: 'free' }]);
      memberApplications.__findChain.lean.mockResolvedValue([{ organizationId: 'gpf_org_1', grapiflyUserId: 'gpf_usr_1', applicationKey: 'relay', role: 'operator', status: 'active' }]);
      applications.listAll.mockResolvedValue([{ key: 'relay', name: 'Relay', description: 'desc', launchUrl: 'https://relay', theme: { icon: '✦' }, defaultAccess: { tier: 'free' } }]);

      const result = await service.listEnabledApplications('gpf_usr_1', 'gpf_org_1');

      expect(result).toEqual([{ key: 'relay', name: 'Relay', description: 'desc', launchUrl: 'https://relay', theme: { icon: '✦' }, tier: 'free', memberRole: 'operator', memberStatus: 'active' }]);
    });

    it('skips org apps that no longer exist in the catalogue', async () => {
      memberships.__findOneChain.lean.mockResolvedValue({ organizationId: 'gpf_org_1', grapiflyUserId: 'gpf_usr_1', role: 'member', status: 'active' });
      organizationApplications.__findChain.lean.mockResolvedValue([{ organizationId: 'gpf_org_1', applicationKey: 'retired_app', status: 'active' }]);
      memberApplications.__findChain.lean.mockResolvedValue([]);
      applications.listAll.mockResolvedValue([]);

      const result = await service.listEnabledApplications('gpf_usr_1', 'gpf_org_1');

      expect(result).toEqual([]);
    });

    it('rejects a caller who is not a member of the organization', async () => {
      memberships.__findOneChain.lean.mockResolvedValue(null);
      await expect(service.listEnabledApplications('gpf_usr_ghost', 'gpf_org_1')).rejects.toThrow();
    });
  });

  describe('invite', () => {
    it('fires a fire-and-forget Relay notification with the invitation link for a new invitation', async () => {
      memberships.__findOneChain.lean.mockResolvedValueOnce({ role: 'owner' }); // requireManager
      users.findByEmail.mockResolvedValue(null);
      invitations.create.mockResolvedValue({
        toObject: () => ({ invitationId: 'gpf_inv_1', organizationId: 'gpf_org_acme', email: 'invitee@example.com' }),
      });
      const selectChain = { lean: jest.fn().mockResolvedValue({ organizationId: 'gpf_org_acme', name: 'Acme' }) };
      organizations.findOne.mockReturnValue({ select: jest.fn().mockReturnValue(selectChain) });
      config.get.mockReturnValue('http://localhost:3100');

      await service.invite('gpf_usr_1', 'gpf_org_acme', { email: 'invitee@example.com' });

      expect(relayNotifications.sendEvent).toHaveBeenCalledTimes(1);
      const call = relayNotifications.sendEvent.mock.calls[0][0];
      expect(call.organizationId).toBe('gpf_org_acme');
      expect(call.organizationName).toBe('Acme');
      expect(call.event).toBe('organization_invitation');
      expect(call.email).toBe('invitee@example.com');
      expect(call.payload.invitationUrl).toMatch(/^http:\/\/localhost:3100\/invitations\/.+/);
      expect(call.payload.role).toBe('member');
    });

    it('does not send a Relay notification when the invited email already has active access (no new invitation created)', async () => {
      memberships.__findOneChain.lean.mockResolvedValueOnce({ role: 'owner' }); // requireManager
      users.findByEmail.mockResolvedValue({ grapiflyUserId: 'gpf_usr_2', email: 'existing@example.com' });
      (memberships as any).exists = jest.fn().mockResolvedValue(true);

      const result = await service.invite('gpf_usr_1', 'gpf_org_acme', { email: 'existing@example.com' });

      expect(relayNotifications.sendEvent).not.toHaveBeenCalled();
      expect(result.accessGranted).toBe(true);
    });

    it('does not let a failing Relay notification affect the invitation response', async () => {
      memberships.__findOneChain.lean.mockResolvedValueOnce({ role: 'owner' }); // requireManager
      users.findByEmail.mockResolvedValue(null);
      invitations.create.mockResolvedValue({
        toObject: () => ({ invitationId: 'gpf_inv_1', organizationId: 'gpf_org_acme', email: 'invitee@example.com' }),
      });
      const selectChain = { lean: jest.fn().mockResolvedValue({ organizationId: 'gpf_org_acme', name: 'Acme' }) };
      organizations.findOne.mockReturnValue({ select: jest.fn().mockReturnValue(selectChain) });
      relayNotifications.sendEvent.mockRejectedValue(new Error('Relay unreachable'));

      const result = await service.invite('gpf_usr_1', 'gpf_org_acme', { email: 'invitee@example.com' });

      expect(result.token).toBeTruthy();
      expect(result.invitation).toBeTruthy();
    });
  });

  describe('updateApplicationMember', () => {
    it('updates the role and fires a Relay notification to the target member', async () => {
      memberships.__findOneChain.lean
        .mockResolvedValueOnce({ role: 'owner' }) // requireManager(actor)
        .mockResolvedValueOnce({ role: 'member' }); // requireMembership(target)
      roleCatalog.rolesForFlow.mockResolvedValue(['owner', 'admin', 'operator', 'viewer']);
      memberApplications.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ organizationId: 'gpf_org_acme', grapiflyUserId: 'gpf_usr_2', applicationKey: 'relay', role: 'admin' }),
      });
      const selectChain = { lean: jest.fn().mockResolvedValue({ organizationId: 'gpf_org_acme', name: 'Acme' }) };
      organizations.findOne.mockReturnValue({ select: jest.fn().mockReturnValue(selectChain) });
      users.findByGrapiflyUserId.mockResolvedValue({ grapiflyUserId: 'gpf_usr_2', email: 'member@example.com' });

      const result = await service.updateApplicationMember('gpf_usr_1', 'gpf_org_acme', 'relay', 'gpf_usr_2', { role: 'admin' });

      expect(result.role).toBe('admin');
      expect(relayNotifications.sendEvent).toHaveBeenCalledTimes(1);
      const call = relayNotifications.sendEvent.mock.calls[0][0];
      expect(call.organizationId).toBe('gpf_org_acme');
      expect(call.organizationName).toBe('Acme');
      expect(call.event).toBe('team_member_role_updated');
      expect(call.email).toBe('member@example.com');
      expect(call.payload.applicationKey).toBe('relay');
      expect(call.payload.role).toBe('admin');
    });

    it('does not fire a notification when only status changes, no role change', async () => {
      memberships.__findOneChain.lean
        .mockResolvedValueOnce({ role: 'owner' })
        .mockResolvedValueOnce({ role: 'member' });
      memberApplications.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ organizationId: 'gpf_org_acme', grapiflyUserId: 'gpf_usr_2', applicationKey: 'relay', status: 'suspended' }),
      });

      await service.updateApplicationMember('gpf_usr_1', 'gpf_org_acme', 'relay', 'gpf_usr_2', { status: 'suspended' });

      expect(relayNotifications.sendEvent).not.toHaveBeenCalled();
    });

    it('rejects a non-owner manager trying to change an owner\'s role, without sending a notification', async () => {
      memberships.__findOneChain.lean
        .mockResolvedValueOnce({ role: 'admin' }) // requireManager(actor) — admin passes the manager check
        .mockResolvedValueOnce({ role: 'owner' }); // requireMembership(target) — target is the owner

      await expect(
        service.updateApplicationMember('gpf_usr_1', 'gpf_org_acme', 'relay', 'gpf_usr_2', { role: 'admin' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(relayNotifications.sendEvent).not.toHaveBeenCalled();
    });
  });
});
