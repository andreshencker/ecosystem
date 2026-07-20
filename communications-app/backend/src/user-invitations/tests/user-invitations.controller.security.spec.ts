/**
 * Security-focused tests for UserInvitationsController.
 * Covers: POST /users/invite — DEC-009 §4 Rev-1 invite hierarchy and targetCompanyId isolation.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { UserInvitationsController } from '../user-invitations.controller';
import { UserInvitationsService } from '../user-invitations.service';
import { UsersService } from '../../users/users.service';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

function fakeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    actorType: 'user', userId: 'u1', role: 'company_owner',
    scope: 'company', companyId: 'cmp_1', companyKey: 'c1', ...overrides,
  };
}

const platformCtx = fakeCtx({ role: 'platform_admin', scope: 'global', companyId: 'plat_cmp', companyKey: 'grapifly' });
const ownerCtx    = fakeCtx({ role: 'company_owner' });
const adminCtx    = fakeCtx({ role: 'company_admin' });

const DEFAULT_SEND_RESULT = {
  userId: 'new_u', invitationId: 'inv1', emailDelivered: true,
  message: 'User created successfully. Invitation email sent to x@x.com.',
};

async function buildModule(actorDoc: Record<string, any>) {
  const usersServiceMock = { findByIdOrThrow: jest.fn().mockResolvedValue(actorDoc) };
  const userInvitationsMock = {
    sendInvitation:         jest.fn().mockResolvedValue(DEFAULT_SEND_RESULT),
    createInvitationRecord: jest.fn().mockResolvedValue({ _id: 'inv1' }),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [UserInvitationsController],
    providers: [
      { provide: UsersService,           useValue: usersServiceMock    },
      { provide: UserInvitationsService, useValue: userInvitationsMock },
    ],
  }).compile();

  return {
    controller:      module.get<UserInvitationsController>(UserInvitationsController),
    users:           module.get(UsersService) as jest.Mocked<UsersService>,
    userInvitations: module.get(UserInvitationsService) as jest.Mocked<UserInvitationsService>,
  };
}

describe('UserInvitationsController — invite hierarchy (DEC-009 §4 Rev-1)', () => {
  describe('platform_admin actor', () => {
    let controller: UserInvitationsController;
    let userInvitations: any;

    beforeEach(async () => {
      const actorDoc = { _id: 'u1', role: 'platform_admin', scope: 'global', companyId: 'plat_cmp', companyKey: 'grapifly' };
      ({ controller, userInvitations } = await buildModule(actorDoc));
    });

    it('can invite platform_admin — delegates to sendInvitation with platform_admin_invitation scenario', async () => {
      await controller.invite(platformCtx, { email: 'x@x.com', firstName: 'A', lastName: 'B', role: 'platform_admin' });
      expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ actorRole: 'platform_admin', targetRole: 'platform_admin', companyId: 'plat_cmp' }),
      );
    });

    it('cannot invite company_owner → 403', async () => {
      await expect(controller.invite(platformCtx, { email: 'x@x.com', firstName: 'A', lastName: 'B', role: 'company_owner' as any })).rejects.toThrow(ForbiddenException);
      expect(userInvitations.sendInvitation).not.toHaveBeenCalled();
    });

    it('can invite company_admin with targetCompanyId — delegates with company_admin_invitation scenario', async () => {
      await controller.invite(platformCtx, { email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'company_admin', targetCompanyId: 'cmp_xyz', targetCompanyKey: 'xyz' });
      expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ actorRole: 'platform_admin', targetRole: 'company_admin', companyId: 'cmp_xyz' }),
      );
    });

    it('throws BadRequestException inviting company_admin without targetCompanyId', async () => {
      await expect(controller.invite(platformCtx, { email: 'x@x.com', firstName: 'A', lastName: 'B', role: 'company_admin' })).rejects.toThrow(BadRequestException);
      expect(userInvitations.sendInvitation).not.toHaveBeenCalled();
    });

    it.each(['operator', 'viewer'] as const)('cannot invite %s → 403', async (role) => {
      await expect(controller.invite(platformCtx, { email: 'x@x.com', firstName: 'A', lastName: 'B', role })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('company_owner actor', () => {
    let controller: UserInvitationsController;
    let userInvitations: any;

    beforeEach(async () => {
      const actorDoc = { _id: 'u1', role: 'company_owner', scope: 'company', companyId: 'cmp_1', companyKey: 'c1' };
      ({ controller, userInvitations } = await buildModule(actorDoc));
    });

    it.each(['company_admin', 'operator', 'viewer'] as const)('can invite %s — delegates with company_user_invitation scenario', async (role) => {
      await controller.invite(ownerCtx, { email: 'x@x.com', firstName: 'A', lastName: 'B', role });
      expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ actorRole: 'company_owner', targetRole: role, companyId: 'cmp_1' }),
      );
    });

    it.each(['platform_admin', 'company_owner'])('cannot invite %s → 403', async (role) => {
      await expect(controller.invite(ownerCtx, { email: 'x@x.com', firstName: 'A', lastName: 'B', role: role as any })).rejects.toThrow(ForbiddenException);
    });

    it('targetCompanyId in body is ignored — actor companyId always used', async () => {
      await controller.invite(ownerCtx, { email: 'x@x.com', firstName: 'A', lastName: 'B', role: 'company_admin', targetCompanyId: 'MALICIOUS' });
      expect(userInvitations.sendInvitation).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'cmp_1' }));
    });
  });

  describe('company_admin actor', () => {
    let controller: UserInvitationsController;

    beforeEach(async () => {
      const actorDoc = { _id: 'u1', role: 'company_admin', scope: 'company', companyId: 'cmp_1', companyKey: 'c1' };
      ({ controller } = await buildModule(actorDoc));
    });

    it.each(['operator', 'viewer'] as const)('can invite %s', async (role) => {
      await expect(controller.invite(adminCtx, { email: 'x@x.com', firstName: 'A', lastName: 'B', role })).resolves.not.toThrow();
    });

    it.each(['platform_admin', 'company_owner', 'company_admin'])('cannot invite %s → 403', async (role) => {
      await expect(controller.invite(adminCtx, { email: 'x@x.com', firstName: 'A', lastName: 'B', role: role as any })).rejects.toThrow(ForbiddenException);
    });
  });
});
