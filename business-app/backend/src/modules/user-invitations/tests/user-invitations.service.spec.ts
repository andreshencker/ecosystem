import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserInvitationsService } from '../user-invitations.service';
import { Invitation } from '../schemas/invitation.schema';
import { Business } from '../../business/schemas/business.schema';
import { UsersService } from '../../users/users.service';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { CommunicationsClientService } from '../../../integrations/communications/client/communications-client.service';

// ── Mock factory helpers ──────────────────────────────────────────────────────

function mockChain(resolveValue: any) {
  const q: any = {};
  q.select = () => q;
  q.sort = () => q;
  q.skip = () => q;
  q.limit = () => q;
  q.lean = () => q;
  q.exec = () => Promise.resolve(resolveValue);
  return q;
}

function buildInvitationModelMock(
  overrides: Partial<Record<string, any>> = {},
) {
  return {
    create: jest.fn(),
    find: jest.fn(() => mockChain([])),
    findOne: jest.fn(() => mockChain(null)),
    findById: jest.fn(() => mockChain(null)),
    findByIdAndUpdate: jest.fn(() => mockChain(null)),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    ...overrides,
  };
}

function buildCompanyModelMock(overrides: Partial<Record<string, any>> = {}) {
  return {
    findById: jest.fn(() => mockChain(null)),
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('UserInvitationsService', () => {
  let service: UserInvitationsService;
  let invitationModel: ReturnType<typeof buildInvitationModelMock>;
  let companyModel: ReturnType<typeof buildCompanyModelMock>;
  let usersServiceMock: Partial<Record<string, jest.Mock>>;
  let eventBusMock: Partial<Record<string, jest.Mock>>;

  async function buildModule(
    invOverrides: Partial<Record<string, any>> = {},
    companyOverrides: Partial<Record<string, any>> = {},
    usersOverrides: Partial<Record<string, jest.Mock>> = {},
    commClientOverrides: { notifyEvent?: jest.Mock } = {},
  ) {
    invitationModel = buildInvitationModelMock(invOverrides);
    companyModel = buildCompanyModelMock(companyOverrides);
    usersServiceMock = {
      createInvitedUser: jest.fn().mockResolvedValue({
        user: {
          _id: 'new_u',
          email: 'inv@x.com',
          toObject: () => ({ _id: 'new_u' }),
        },
        tempPassword: 'T3mpP@ss!',
      }),
      refreshTemporaryPassword: jest.fn().mockResolvedValue('NewT3mp!'),
      existsByEmail: jest.fn().mockResolvedValue(false),
      getPlatformCompanyId: jest.fn().mockResolvedValue('plat_cmp'),
      getCompanyDisplayName: jest.fn().mockResolvedValue('Acme Corp'),
      ...usersOverrides,
    };
    eventBusMock = { emit: jest.fn(), on: jest.fn() };

    const commClient = {
      notifyEvent: jest.fn().mockResolvedValue(true),
      ...commClientOverrides,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInvitationsService,
        { provide: getModelToken(Invitation.name), useValue: invitationModel },
        { provide: getModelToken(Business.name), useValue: companyModel },
        { provide: UsersService, useValue: usersServiceMock },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
        { provide: EventBusService, useValue: eventBusMock },
        { provide: CommunicationsClientService, useValue: commClient },
      ],
    }).compile();

    service = module.get<UserInvitationsService>(UserInvitationsService);
  }

  // ── sendInvitation — basic flow ───────────────────────────────────────────

  describe('sendInvitation', () => {
    const BASE_PARAMS = {
      invitedByUserId: 'admin1',
      email: 'inv@x.com',
      firstName: 'Inv',
      lastName: 'Ited',
      companyId: 'cmp_1',
      businessKey: 'c1',
    };

    beforeEach(async () => {
      await buildModule({
        create: jest.fn().mockResolvedValue({ _id: 'inv1' }),
      });
    });

    it('creates user and invitation record', async () => {
      const result = await service.sendInvitation({
        ...BASE_PARAMS,
        actorRole: 'business_owner',
        targetRole: 'staff',
      });
      expect(usersServiceMock.createInvitedUser).toHaveBeenCalled();
      expect(result.userId).toBe('new_u');
    });

    it('sets status=pending_delivery when notification delivery fails', async () => {
      const createMock = jest.fn().mockResolvedValue({ _id: 'inv1' });
      await buildModule(
        { create: createMock },
        {},
        {},
        { notifyEvent: jest.fn().mockResolvedValue(false) },
      );
      await service.sendInvitation({
        ...BASE_PARAMS,
        actorRole: 'business_owner',
        targetRole: 'staff',
      });
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending_delivery' }),
      );
    });
  });

  // ── sendInvitation — duplicate guards ────────────────────────────────────

  describe('sendInvitation — duplicate guards', () => {
    const BASE_PARAMS = {
      invitedByUserId: 'admin1',
      email: 'inv@x.com',
      firstName: 'Inv',
      lastName: 'Ited',
      companyId: 'cmp_1',
      businessKey: 'c1',
      actorRole: 'business_owner' as const,
      targetRole: 'staff' as const,
    };

    it('throws BadRequestException when a user with that email already exists', async () => {
      await buildModule(
        { create: jest.fn().mockResolvedValue({ _id: 'inv1' }) },
        {},
        { existsByEmail: jest.fn().mockResolvedValue(true) },
      );
      await expect(service.sendInvitation(BASE_PARAMS)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not call createInvitedUser when user already exists', async () => {
      await buildModule(
        { create: jest.fn().mockResolvedValue({ _id: 'inv1' }) },
        {},
        { existsByEmail: jest.fn().mockResolvedValue(true) },
      );
      await expect(service.sendInvitation(BASE_PARAMS)).rejects.toThrow(
        BadRequestException,
      );
      expect(usersServiceMock.createInvitedUser).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when a pending invitation already exists for that email', async () => {
      await buildModule({
        create: jest.fn().mockResolvedValue({ _id: 'inv1' }),
        findOne: jest.fn(() =>
          mockChain({ _id: 'old_inv', status: 'pending' }),
        ),
      });
      await expect(service.sendInvitation(BASE_PARAMS)).rejects.toThrow(
        'There is already a pending invitation for this email.',
      );
    });

    it('allows new invitation when previous was cancelled and no user exists', async () => {
      const createMock = jest.fn().mockResolvedValue({ _id: 'inv_new' });
      await buildModule({
        create: createMock,
        findOne: jest.fn(() => mockChain(null)),
      });
      await expect(service.sendInvitation(BASE_PARAMS)).resolves.not.toThrow();
      expect(usersServiceMock.createInvitedUser).toHaveBeenCalled();
    });
  });

  // ── sendInvitation — invited user account properties ─────────────────────

  describe('sendInvitation — invited user account properties', () => {
    const BASE_PARAMS = {
      invitedByUserId: 'admin1',
      email: 'new@x.com',
      firstName: 'New',
      lastName: 'User',
      companyId: 'cmp_1',
      businessKey: 'c1',
      actorRole: 'business_owner' as const,
      targetRole: 'staff' as const,
    };

    it('createInvitedUser is called with normalised email (lowercased, trimmed)', async () => {
      await buildModule({
        create: jest.fn().mockResolvedValue({ _id: 'inv1' }),
      });
      await service.sendInvitation({ ...BASE_PARAMS, email: '  New@X.COM  ' });
      expect(usersServiceMock.createInvitedUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@x.com' }),
      );
    });
  });

  // ── resendInvitation ──────────────────────────────────────────────────────

  describe('resendInvitation', () => {
    it('throws NotFoundException when invitation not found', async () => {
      await buildModule({ findById: jest.fn(() => mockChain(null)) });
      await expect(
        service.resendInvitation('inv_ghost', {
          scope: 'global',
          companyId: null,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for cancelled invitation', async () => {
      const inv = {
        _id: 'inv1',
        status: 'cancelled',
        userId: 'u1',
        companyId: 'cmp_1',
        expiresAt: new Date(Date.now() + 999999),
      };
      await buildModule({ findById: jest.fn(() => mockChain(inv)) });
      await expect(
        service.resendInvitation('inv1', { scope: 'global', companyId: null }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for accepted invitation', async () => {
      const inv = {
        _id: 'inv1',
        status: 'accepted',
        userId: 'u1',
        companyId: 'cmp_1',
        expiresAt: new Date(Date.now() + 999999),
      };
      await buildModule({ findById: jest.fn(() => mockChain(inv)) });
      await expect(
        service.resendInvitation('inv1', { scope: 'global', companyId: null }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when company actor tries to resend another company invitation', async () => {
      const inv = {
        _id: 'inv1',
        status: 'pending',
        userId: 'u1',
        companyId: 'cmp_other',
        expiresAt: new Date(Date.now() + 999999),
        email: 'x@x.com',
        firstName: 'X',
        role: 'staff',
      };
      await buildModule({ findById: jest.fn(() => mockChain(inv)) });
      await expect(
        service.resendInvitation('inv1', {
          scope: 'company',
          companyId: 'cmp_mine',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns emailDelivered=false (notifications stubbed) on success', async () => {
      const inv = {
        _id: 'inv1',
        status: 'pending',
        userId: 'u1',
        companyId: 'cmp_1',
        expiresAt: new Date(Date.now() + 999999),
        email: 'x@x.com',
        firstName: 'X',
        role: 'staff',
        invitationScope: 'company',
      };
      await buildModule({ findById: jest.fn(() => mockChain(inv)) });
      const result = await service.resendInvitation('inv1', {
        scope: 'global',
        companyId: null,
      });
      expect(result.invitationEmail).toBe('x@x.com');
    });
  });

  // ── createInvitationRecord ────────────────────────────────────────────────

  describe('createInvitationRecord', () => {
    it('creates record with provided fields', async () => {
      const inv = { _id: 'inv1', email: 'x@x.com', status: 'pending' };
      const createMock = jest.fn().mockResolvedValue(inv);
      await buildModule({ create: createMock });
      await service.createInvitationRecord({
        userId: 'u1',
        email: 'x@x.com',
        firstName: 'X',
        lastName: 'Y',
        role: 'staff',
        companyId: 'cmp_1',
        businessKey: 'c1',
        invitedByUserId: 'admin',
        invitationScope: 'company',
        status: 'pending',
      });
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'x@x.com', role: 'staff' }),
      );
    });
  });

  // ── listInvitations ───────────────────────────────────────────────────────

  describe('listInvitations', () => {
    it('filters by companyId for company-scoped actor', async () => {
      const findMock = jest.fn(() => mockChain([]));
      await buildModule({ find: findMock });
      await service.listInvitations('company', 'cmp_1');
      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'cmp_1' }),
      );
    });

    it('filters by invitationScope=modules for global actor', async () => {
      const findMock = jest.fn(() => mockChain([]));
      await buildModule({ find: findMock });
      await service.listInvitations('global', null);
      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({ invitationScope: 'platform' }),
      );
    });
  });

  // ── getCompanyName ────────────────────────────────────────────────────────

  describe('getCompanyName', () => {
    it('returns displayName when company exists', async () => {
      await buildModule(
        {},
        { findById: jest.fn(() => mockChain({ businessName: 'Test Corp' })) },
      );
      expect(await service.getCompanyName('cmp_1')).toBe('Test Corp');
    });

    it('returns companyId as fallback when company is not found', async () => {
      await buildModule({}, { findById: jest.fn(() => mockChain(null)) });
      expect(await service.getCompanyName('cmp_missing')).toBe('cmp_missing');
    });
  });

  // ── cancelInvitation ──────────────────────────────────────────────────────

  describe('cancelInvitation', () => {
    it('throws NotFoundException when invitation not found', async () => {
      await buildModule({ findById: jest.fn(() => mockChain(null)) });
      await expect(
        service.cancelInvitation('ghost', { scope: 'global', companyId: null }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when already cancelled', async () => {
      await buildModule({
        findById: jest.fn(() =>
          mockChain({ status: 'cancelled', companyId: 'cmp_1' }),
        ),
      });
      await expect(
        service.cancelInvitation('inv1', { scope: 'global', companyId: null }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when company actor cancels another company invitation', async () => {
      await buildModule({
        findById: jest.fn(() =>
          mockChain({ status: 'pending', companyId: 'cmp_other' }),
        ),
      });
      await expect(
        service.cancelInvitation('inv1', {
          scope: 'company',
          companyId: 'cmp_mine',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── acceptInvitationsByEmail ──────────────────────────────────────────────

  describe('acceptInvitationsByEmail', () => {
    it('calls updateMany with correct filter and status', async () => {
      const updateManyMock = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      await buildModule({ updateMany: updateManyMock });
      await service.acceptInvitationsByEmail('user@example.com');
      expect(updateManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@example.com' }),
        expect.objectContaining({ $set: { status: 'accepted' } }),
      );
    });
  });

  // ── onModuleInit — event listener registration ────────────────────────────

  describe('onModuleInit', () => {
    it('registers a listener for USER_INVITATION_PASSWORD_COMPLETED', async () => {
      await buildModule();
      service.onModuleInit();
      expect(eventBusMock.on).toHaveBeenCalledWith(
        'user.invitation-password-completed',
        expect.any(Function),
      );
    });
  });
});
