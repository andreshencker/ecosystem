/**
 * Security-focused tests for UserInvitationsController.
 * Covers: POST /users/invite — invite hierarchy and targetCompanyId isolation.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { UserInvitationsController } from '../user-invitations.controller';
import { UserInvitationsService } from '../user-invitations.service';
import { UsersService } from '../../users/users.service';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

function fakeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    actorType: 'user',
    userId: 'u1',
    role: 'business_owner',
    scope: 'company',
    companyId: 'cmp_1',
    businessKey: 'c1',
    ...overrides,
  };
}

const platformCtx = fakeCtx({
  role: 'platform_admin',
  scope: 'global',
  companyId: 'plat_cmp',
  businessKey: 'invoice-app',
});
const ownerCtx = fakeCtx({ role: 'business_owner' });
const adminCtx = fakeCtx({ role: 'business_admin' });

const DEFAULT_SEND_RESULT = {
  userId: 'new_u',
  invitationId: 'inv1',
  emailDelivered: true,
  message: 'User created successfully. Invitation email sent to x@x.com.',
};

async function buildModule(actorDoc: Record<string, any>) {
  const usersServiceMock = {
    findByIdOrThrow: jest.fn().mockResolvedValue(actorDoc),
  };
  const userInvitationsMock = {
    sendInvitation: jest.fn().mockResolvedValue(DEFAULT_SEND_RESULT),
    createInvitationRecord: jest.fn().mockResolvedValue({ _id: 'inv1' }),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [UserInvitationsController],
    providers: [
      { provide: UsersService, useValue: usersServiceMock },
      { provide: UserInvitationsService, useValue: userInvitationsMock },
    ],
  }).compile();

  return {
    controller: module.get<UserInvitationsController>(
      UserInvitationsController,
    ),
    users: module.get(UsersService),
    userInvitations: module.get(UserInvitationsService),
  };
}

describe('UserInvitationsController — invite hierarchy', () => {
  describe('platform_admin actor', () => {
    let controller: UserInvitationsController;
    let userInvitations: any;

    beforeEach(async () => {
      const actorDoc = {
        _id: 'u1',
        role: 'platform_admin',
        scope: 'global',
        companyId: 'plat_cmp',
        businessKey: 'invoice-app',
      };
      ({ controller, userInvitations } = await buildModule(actorDoc));
    });

    it('can invite platform_admin', async () => {
      await controller.invite(platformCtx, {
        email: 'x@x.com',
        firstName: 'A',
        lastName: 'B',
        role: 'platform_admin',
      });
      expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          actorRole: 'platform_admin',
          targetRole: 'platform_admin',
          companyId: 'plat_cmp',
        }),
      );
    });

    it('cannot invite business_owner → 403', async () => {
      await expect(
        controller.invite(platformCtx, {
          email: 'x@x.com',
          firstName: 'A',
          lastName: 'B',
          role: 'business_owner' as any,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(userInvitations.sendInvitation).not.toHaveBeenCalled();
    });

    it('can invite business_admin with targetCompanyId', async () => {
      await controller.invite(platformCtx, {
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        role: 'business_admin',
        targetCompanyId: 'cmp_xyz',
        targetBusinessKey: 'xyz',
      });
      expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          actorRole: 'platform_admin',
          targetRole: 'business_admin',
          companyId: 'cmp_xyz',
        }),
      );
    });

    it('throws BadRequestException inviting business_admin without targetCompanyId', async () => {
      await expect(
        controller.invite(platformCtx, {
          email: 'x@x.com',
          firstName: 'A',
          lastName: 'B',
          role: 'business_admin',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(userInvitations.sendInvitation).not.toHaveBeenCalled();
    });

    it.each(['staff', 'viewer', 'accountant'] as const)(
      'cannot invite %s → 403',
      async (role) => {
        await expect(
          controller.invite(platformCtx, {
            email: 'x@x.com',
            firstName: 'A',
            lastName: 'B',
            role,
          }),
        ).rejects.toThrow(ForbiddenException);
      },
    );
  });

  describe('business_owner actor', () => {
    let controller: UserInvitationsController;
    let userInvitations: any;

    beforeEach(async () => {
      const actorDoc = {
        _id: 'u1',
        role: 'business_owner',
        scope: 'company',
        companyId: 'cmp_1',
        businessKey: 'c1',
      };
      ({ controller, userInvitations } = await buildModule(actorDoc));
    });

    it.each(['business_admin', 'accountant', 'staff', 'viewer'] as const)(
      'can invite %s',
      async (role) => {
        await controller.invite(ownerCtx, {
          email: 'x@x.com',
          firstName: 'A',
          lastName: 'B',
          role,
        });
        expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
          expect.objectContaining({
            actorRole: 'business_owner',
            targetRole: role,
            companyId: 'cmp_1',
          }),
        );
      },
    );

    it.each(['platform_admin', 'business_owner'] as const)(
      'cannot invite %s → 403',
      async (role) => {
        await expect(
          controller.invite(ownerCtx, {
            email: 'x@x.com',
            firstName: 'A',
            lastName: 'B',
            role: role as any,
          }),
        ).rejects.toThrow(ForbiddenException);
      },
    );

    it('targetCompanyId in body is ignored — actor companyId always used', async () => {
      await controller.invite(ownerCtx, {
        email: 'x@x.com',
        firstName: 'A',
        lastName: 'B',
        role: 'business_admin',
        targetCompanyId: 'MALICIOUS',
      });
      expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'cmp_1' }),
      );
    });
  });

  describe('business_admin actor', () => {
    let controller: UserInvitationsController;

    beforeEach(async () => {
      const actorDoc = {
        _id: 'u1',
        role: 'business_admin',
        scope: 'company',
        companyId: 'cmp_1',
        businessKey: 'c1',
      };
      ({ controller } = await buildModule(actorDoc));
    });

    it.each(['accountant', 'staff', 'viewer'] as const)(
      'can invite %s',
      async (role) => {
        await expect(
          controller.invite(adminCtx, {
            email: 'x@x.com',
            firstName: 'A',
            lastName: 'B',
            role,
          }),
        ).resolves.not.toThrow();
      },
    );

    it.each(['platform_admin', 'business_owner', 'business_admin'] as const)(
      'cannot invite %s → 403',
      async (role) => {
        await expect(
          controller.invite(adminCtx, {
            email: 'x@x.com',
            firstName: 'A',
            lastName: 'B',
            role: role as any,
          }),
        ).rejects.toThrow(ForbiddenException);
      },
    );
  });
});
