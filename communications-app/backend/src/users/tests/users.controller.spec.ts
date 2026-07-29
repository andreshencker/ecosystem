import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { NotificationService } from '../../communication/notifications/notification.service';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { RolesGuard } from '../../infrastructure/security/guards/roles.guard';
import { UserResponseDto } from '../dto/user-response.dto';
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
) {
  const defaultActor = fakeUserDoc();

  const usersServiceMock: Partial<Record<string, jest.Mock>> = {
    findByIdOrThrow: jest.fn().mockResolvedValue(defaultActor),
    findById: jest.fn(),
    listPlatformUsers: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 }),
    listByCompanyId: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 }),
    update: jest.fn(),
    changePassword: jest.fn(),
    deleteById: jest.fn(),
    setUserActive: jest.fn(),
    getCompanyDisplayName: jest.fn().mockResolvedValue('Acme Corp'),
    ...usersServiceOverrides,
  };

  const eventBusMock = { emit: jest.fn(), on: jest.fn() };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [UsersController],
    providers: [
      { provide: UsersService, useValue: usersServiceMock },
      { provide: EventBusService, useValue: eventBusMock },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
      },
      {
        provide: NotificationService,
        useValue: {
          notifyEvent: jest.fn().mockResolvedValue({
            eventKey: 'company_password_changed',
            companyId: 'plat_cmp',
            results: [
              {
                channel: 'EMAIL',
                provider: 'gmail',
                success: true,
                error: null,
              },
            ],
          }),
        },
      },
      RolesGuard,
      Reflector,
    ],
  }).compile();

  return {
    controller: module.get<UsersController>(UsersController),
    usersService: module.get(UsersService),
    eventBus: module.get(EventBusService),
    notification: module.get(NotificationService),
  };
}

// ── RolesGuard unit tests ─────────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  function mockContext(role: string | undefined): ExecutionContext {
    const request: any = {
      authContext: role ? { actorType: 'user', role } : {},
    };
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;
  }

  it('returns true when no roles are required', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined as any);
    expect(guard.canActivate(mockContext('operator'))).toBe(true);
  });

  it('throws ForbiddenException when operator tries to access admin route', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([
        'platform_admin',
        'company_owner',
        'company_admin',
      ] as any);
    expect(() => guard.canActivate(mockContext('operator'))).toThrow(
      ForbiddenException,
    );
  });

  it('returns true when platform_admin accesses admin route', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([
        'platform_admin',
        'company_owner',
        'company_admin',
      ] as any);
    expect(guard.canActivate(mockContext('platform_admin'))).toBe(true);
  });

  it('returns true when company_admin accesses admin route', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([
        'platform_admin',
        'company_owner',
        'company_admin',
      ] as any);
    expect(guard.canActivate(mockContext('company_admin'))).toBe(true);
  });

  it('throws ForbiddenException when viewer tries to access admin route', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([
        'platform_admin',
        'company_owner',
        'company_admin',
      ] as any);
    expect(() => guard.canActivate(mockContext('viewer'))).toThrow(
      ForbiddenException,
    );
  });
});

// ── UsersController — GET /users ──────────────────────────────────────────────

describe('UsersController — GET /users', () => {
  it('calls listPlatformUsers for platform_admin with no companyId filter', async () => {
    const { controller, usersService } = await buildModule();
    await controller.list(
      fakeAuthContext({ role: 'platform_admin', scope: 'global' }),
      '1',
      '25',
    );
    expect(usersService.listPlatformUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 25 }),
    );
  });

  it('calls listByCompanyId when platform_admin provides companyId query param', async () => {
    const { controller, usersService } = await buildModule();
    await controller.list(
      fakeAuthContext({ role: 'platform_admin', scope: 'global' }),
      '1',
      '25',
      undefined,
      'cmp_xyz',
    );
    expect(usersService.listByCompanyId).toHaveBeenCalledWith(
      'cmp_xyz',
      expect.objectContaining({ page: 1, limit: 25 }),
    );
  });

  it('calls listByCompanyId scoped to actor companyId for company_admin', async () => {
    const actorDoc = fakeUserDoc({
      role: 'company_admin',
      scope: 'company',
      companyId: 'cmp_1',
    });
    const { controller, usersService } = await buildModule({
      findByIdOrThrow: jest.fn().mockResolvedValue(actorDoc),
    });
    await controller.list(
      fakeAuthContext({
        role: 'company_admin',
        scope: 'company',
        companyId: 'cmp_1',
      }),
      '1',
      '25',
    );
    expect(usersService.listByCompanyId).toHaveBeenCalledWith(
      'cmp_1',
      expect.objectContaining({ page: 1, limit: 25 }),
    );
  });

  it('parses page and limit as integers and clamps limit to 100', async () => {
    const { controller, usersService } = await buildModule();
    await controller.list(fakeAuthContext(), '2', '200');
    expect(usersService.listPlatformUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 100 }),
    );
  });
});

// ── UsersController — GET /users/me ──────────────────────────────────────────

describe('UsersController — GET /users/me', () => {
  it('returns UserResponseDto for the current user', async () => {
    const doc = fakeUserDoc();
    const { controller } = await buildModule({
      findByIdOrThrow: jest.fn().mockResolvedValue(doc),
    });
    const result = await controller.getMe(fakeAuthContext());
    expect(result).toBeInstanceOf(UserResponseDto);
    expect(result.id).toBe('u1');
  });
});

// ── UsersController — PATCH /users/me ────────────────────────────────────────

describe('UsersController — PATCH /users/me', () => {
  it('forwards only allowed fields to UsersService.update', async () => {
    const updated = fakeUserDoc({ firstName: 'Updated' });
    const { controller, usersService } = await buildModule({
      update: jest.fn().mockResolvedValue(updated),
    });
    await controller.updateMe(fakeAuthContext(), {
      firstName: 'Updated',
      lastName: 'Name',
    });
    expect(usersService.update).toHaveBeenCalledWith('admin1', {
      firstName: 'Updated',
      lastName: 'Name',
    });
  });
});

// ── UsersController — PATCH /users/me/password ───────────────────────────────

describe('UsersController — PATCH /users/me/password', () => {
  it('emits USER_INVITATION_PASSWORD_COMPLETED event when wasMustChange was true', async () => {
    const actorDoc = fakeUserDoc({
      mustChangePassword: true,
      scope: 'company',
      companyId: 'cmp_1',
    });
    const { controller, usersService, eventBus } = await buildModule({
      findByIdOrThrow: jest.fn().mockResolvedValue(actorDoc),
      changePassword: jest
        .fn()
        .mockResolvedValue({ ...actorDoc, mustChangePassword: false }),
    });
    await controller.changePassword(fakeAuthContext(), {
      currentPassword: 'old',
      newPassword: 'newPass!1',
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      'user.invitation-password-completed',
      { email: actorDoc.email },
    );
  });

  it('does not emit event when mustChangePassword was false', async () => {
    const actorDoc = fakeUserDoc({
      mustChangePassword: false,
      scope: 'company',
      companyId: 'cmp_1',
    });
    const { controller, usersService, eventBus } = await buildModule({
      findByIdOrThrow: jest.fn().mockResolvedValue(actorDoc),
      changePassword: jest.fn().mockResolvedValue(actorDoc),
    });
    await controller.changePassword(fakeAuthContext(), {
      currentPassword: 'old',
      newPassword: 'newPass!1',
    });
    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});
