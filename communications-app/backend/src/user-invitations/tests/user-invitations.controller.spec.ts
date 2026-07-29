import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserInvitationsController } from '../user-invitations.controller';
import { UserInvitationsService } from '../user-invitations.service';
import { UsersService } from '../../users/users.service';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fakeUserDoc(overrides: Partial<Record<string, any>> = {}) {
  return {
    _id: 'u1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'platform_admin',
    scope: 'global',
    companyId: 'plat_cmp',
    companyKey: 'grapifly',
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

function fakeAuthContext(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    actorType: 'user',
    userId: 'admin1',
    role: 'platform_admin',
    scope: 'global',
    companyId: 'plat_cmp',
    companyKey: 'grapifly',
    ...overrides,
  };
}

async function buildModule(
  usersServiceOverrides: Partial<Record<string, jest.Mock>> = {},
  userInvitationsOverrides: Partial<Record<string, jest.Mock>> = {},
) {
  const defaultActor = fakeUserDoc();

  const usersServiceMock: Partial<Record<string, jest.Mock>> = {
    findByIdOrThrow: jest.fn().mockResolvedValue(defaultActor),
    ...usersServiceOverrides,
  };

  const userInvitationsMock: Partial<Record<string, jest.Mock>> = {
    sendInvitation: jest.fn().mockResolvedValue({
      userId: 'new_u',
      invitationId: 'inv1',
      emailDelivered: true,
      message: 'User created successfully. Invitation email sent to new@x.com.',
    }),
    listInvitations: jest.fn().mockResolvedValue([]),
    resendInvitation: jest.fn().mockResolvedValue({
      emailDelivered: true,
      invitationEmail: 'existing@x.com',
      message: 'Invitation resent to existing@x.com.',
    }),
    cancelInvitation: jest.fn().mockResolvedValue(undefined),
    ...userInvitationsOverrides,
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
    usersService: module.get(UsersService),
    userInvitations: module.get(UserInvitationsService),
  };
}

// ── POST /users/invite ────────────────────────────────────────────────────────

describe('UserInvitationsController — POST /users/invite', () => {
  it('delegates to userInvitations.sendInvitation() with resolved companyId', async () => {
    const actorDoc = fakeUserDoc({
      role: 'company_owner',
      scope: 'company',
      companyId: 'cmp_1',
      companyKey: 'c1',
    });
    const { controller, userInvitations } = await buildModule({
      findByIdOrThrow: jest.fn().mockResolvedValue(actorDoc),
    });

    await controller.invite(
      fakeAuthContext({
        role: 'company_owner',
        scope: 'company',
        companyId: 'cmp_1',
        companyKey: 'c1',
      }),
      {
        email: 'newbie@example.com',
        firstName: 'New',
        lastName: 'Bie',
        role: 'company_admin',
      },
    );

    expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newbie@example.com',
        targetRole: 'company_admin',
        companyId: 'cmp_1',
        actorRole: 'company_owner',
      }),
    );
  });

  it('rejects platform_admin → company_owner (hierarchy check in controller)', async () => {
    const { controller } = await buildModule();
    await expect(
      controller.invite(fakeAuthContext(), {
        email: 'x@x.com',
        firstName: 'A',
        lastName: 'B',
        role: 'company_owner' as any,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects platform_admin → company_admin without targetCompanyId', async () => {
    const { controller } = await buildModule();
    await expect(
      controller.invite(fakeAuthContext(), {
        email: 'x@x.com',
        firstName: 'A',
        lastName: 'B',
        role: 'company_admin',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses targetCompanyId for platform_admin → company_admin', async () => {
    const { controller, userInvitations } = await buildModule();
    await controller.invite(fakeAuthContext(), {
      email: 'cadmin@x.com',
      firstName: 'C',
      lastName: 'A',
      role: 'company_admin',
      targetCompanyId: 'cmp_xyz',
      targetCompanyKey: 'xyz',
    });
    expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'cmp_xyz',
        companyKey: 'xyz',
        targetRole: 'company_admin',
        actorRole: 'platform_admin',
      }),
    );
  });

  it('uses actor companyId for platform_admin → platform_admin', async () => {
    const { controller, userInvitations } = await buildModule();
    await controller.invite(fakeAuthContext(), {
      email: 'admin2@x.com',
      firstName: 'A',
      lastName: 'B',
      role: 'platform_admin',
    });
    expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'plat_cmp',
        actorRole: 'platform_admin',
        targetRole: 'platform_admin',
      }),
    );
  });

  it('ignores targetCompanyId for company_owner (uses actor companyId)', async () => {
    const actorDoc = fakeUserDoc({
      role: 'company_owner',
      scope: 'company',
      companyId: 'cmp_1',
      companyKey: 'c1',
    });
    const { controller, userInvitations } = await buildModule({
      findByIdOrThrow: jest.fn().mockResolvedValue(actorDoc),
    });
    await controller.invite(
      fakeAuthContext({
        role: 'company_owner',
        scope: 'company',
        companyId: 'cmp_1',
        companyKey: 'c1',
      }),
      {
        email: 'x@x.com',
        firstName: 'A',
        lastName: 'B',
        role: 'company_admin',
        targetCompanyId: 'MALICIOUS',
      },
    );
    expect(userInvitations.sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'cmp_1' }),
    );
  });

  it('returns composed response from service result', async () => {
    const { controller } = await buildModule();
    const resp = await controller.invite(fakeAuthContext(), {
      email: 'padmin@x.com',
      firstName: 'P',
      lastName: 'A',
      role: 'platform_admin',
    });
    expect(resp.email).toBe('padmin@x.com');
    expect(resp.role).toBe('platform_admin');
    expect(resp.emailDelivered).toBe(true);
  });
});

// ── GET /users/invitations ────────────────────────────────────────────────────

describe('UserInvitationsController — GET /users/invitations', () => {
  it('returns items array from service', async () => {
    const { controller } = await buildModule();
    const result = await controller.getInvitations(fakeAuthContext());
    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
  });
});

// ── POST /users/invitations/:id/resend ────────────────────────────────────────

describe('UserInvitationsController — POST /users/invitations/:id/resend', () => {
  it('passes actor scope to resendInvitation service method', async () => {
    const actorDoc = fakeUserDoc({ scope: 'company', companyId: 'cmp_1' });
    const { controller, userInvitations } = await buildModule({
      findByIdOrThrow: jest.fn().mockResolvedValue(actorDoc),
    });
    await controller.resendInvitation(
      'inv1',
      fakeAuthContext({ scope: 'company', companyId: 'cmp_1' }),
    );
    expect(userInvitations.resendInvitation).toHaveBeenCalledWith('inv1', {
      scope: 'company',
      companyId: 'cmp_1',
    });
  });

  it('returns emailDelivered and message from service', async () => {
    const { controller } = await buildModule();
    const result = await controller.resendInvitation('inv1', fakeAuthContext());
    expect(result).toEqual({
      emailDelivered: true,
      message: 'Invitation resent to existing@x.com.',
    });
  });
});
