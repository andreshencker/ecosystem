import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { UsersService } from '../../users/users.service';
import { NotificationService } from '../../communication/notifications/notification.service';
import { CompanyProvisioningService } from '../../communication/company/provisioning/company-provisioning.service';

// Valid 24-char hex ObjectId strings to satisfy BSON validation.
const OBJECT_ID = '507f1f77bcf86cd799439011';
const PLATFORM_OBJECT_ID = '507f1f77bcf86cd799439022';

// ── Mock helpers ──────────────────────────────────────────────────────────────

function mockChain(value: any) {
  const q: any = { lean: () => q, exec: () => Promise.resolve(value) };
  return q;
}

const FAKE_NOTIFY_SUCCESS = { results: [{ success: true, error: null }] };
const FAKE_NOTIFY_FAIL    = { results: [{ success: false, error: 'no channel' }] };

// ── Test suite ────────────────────────────────────────────────────────────────

describe('AuthService — notification helpers', () => {
  let service: AuthService;
  let notificationMock: { notifyEvent: jest.Mock };
  let usersServiceMock: Partial<Record<string, jest.Mock>>;
  let tokenModelMock: Partial<Record<string, jest.Mock>>;

  async function buildModule(
    userOverrides: Partial<Record<string, jest.Mock>> = {},
    notifyOverrides: Partial<Record<string, jest.Mock>> = {},
    tokenOverrides: Partial<Record<string, jest.Mock>> = {},
  ) {
    usersServiceMock = {
      findByEmailWithPassword:    jest.fn().mockResolvedValue(null),
      findByEmailVerificationToken: jest.fn().mockResolvedValue(null),
      findByPasswordResetToken:   jest.fn().mockResolvedValue(null),
      setEmailVerificationToken:  jest.fn().mockResolvedValue(undefined),
      setPasswordResetToken:      jest.fn().mockResolvedValue(undefined),
      setPasswordHash:            jest.fn().mockResolvedValue(undefined),
      setEmailVerified:           jest.fn().mockResolvedValue(undefined),
      createCompanyOwnerWithCompany: jest.fn().mockResolvedValue({
        company: { _id: PLATFORM_OBJECT_ID },
        user:    { _id: OBJECT_ID, email: 'owner@x.com', firstName: 'Owner', scope: 'company', companyId: PLATFORM_OBJECT_ID },
      }),
      getPlatformCompanyId:    jest.fn().mockResolvedValue('plat_cmp'),
      getCompanyDisplayName:   jest.fn().mockResolvedValue('Acme Corp'),
      ...userOverrides,
    };

    notificationMock = {
      notifyEvent: jest.fn().mockResolvedValue(FAKE_NOTIFY_SUCCESS),
      ...notifyOverrides,
    };

    tokenModelMock = {
      create:           jest.fn().mockResolvedValue({ _id: 'tok_1' }),
      findOne:          jest.fn(() => mockChain(null)),
      findOneAndUpdate: jest.fn(() => mockChain(null)),
      findByIdAndUpdate:jest.fn(() => mockChain(null)),
      updateMany:       jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      ...tokenOverrides,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService,             useValue: usersServiceMock  },
        { provide: NotificationService,      useValue: notificationMock  },
        { provide: CompanyProvisioningService, useValue: { provisionCompany: jest.fn().mockResolvedValue({}) } },
        { provide: JwtService,               useValue: { signAsync: jest.fn().mockResolvedValue('jwt_token') } },
        { provide: ConfigService,            useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') } },
        { provide: getModelToken(RefreshToken.name), useValue: tokenModelMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  }

  // ── register → notifyVerifyEmail → security.company_verify_email ─────────

  describe('register()', () => {
    it('fires security.company_verify_email via modules company', async () => {
      await buildModule();

      await service.register({
        companyName: 'Acme', email: 'owner@x.com',
        password: 'P@ssw0rd!', firstName: 'Owner', lastName: 'User',
      });

      // Allow the fire-and-forget to settle
      await new Promise((r) => setImmediate(r));

      expect(notificationMock.notifyEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'plat_cmp',
          event:     'security.company_verify_email',
          email:     'owner@x.com',
        }),
      );
    });

    it('fires verify email with verificationUrl, expiresAt, loginUrl and email in payload', async () => {
      await buildModule();
      await service.register({
        companyName: 'Acme', email: 'owner@x.com',
        password: 'P@ssw0rd!', firstName: 'Owner', lastName: 'User',
      });
      await new Promise((r) => setImmediate(r));

      const call = notificationMock.notifyEvent.mock.calls[0][0];
      expect(call.payload.data).toMatchObject({
        email:     'owner@x.com',
        firstName: 'Owner',
        loginUrl:  expect.stringContaining('/auth/login'),
        verificationUrl: expect.stringContaining('/auth/verify-email?token='),
        expiresAt: expect.any(String),
      });
    });

    it('skips notification and logs warning when modules company is not found', async () => {
      await buildModule({ getPlatformCompanyId: jest.fn().mockResolvedValue(null) });
      await service.register({
        companyName: 'Acme', email: 'owner@x.com',
        password: 'P@ssw0rd!', firstName: 'Owner', lastName: 'User',
      });
      await new Promise((r) => setImmediate(r));
      expect(notificationMock.notifyEvent).not.toHaveBeenCalled();
    });
  });

  // ── forgotPassword (company) → security.company_forgot_password ──────────

  describe('forgotPassword() — company user', () => {
    const companyUser = {
      _id: OBJECT_ID, email: 'user@company.com', firstName: 'User',
      scope: 'company', companyId: 'cmp_1', passwordHash: 'hash',
    };

    it('fires security.company_forgot_password routed via modules companyId', async () => {
      await buildModule({ findByEmailWithPassword: jest.fn().mockResolvedValue(companyUser) });
      await service.forgotPassword('user@company.com');
      await new Promise((r) => setImmediate(r));

      expect(notificationMock.notifyEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'plat_cmp',
          event:     'security.company_forgot_password',
          email:     'user@company.com',
        }),
      );
    });

    it('fires with resetUrl, expiresAt, firstName, email in payload', async () => {
      await buildModule({ findByEmailWithPassword: jest.fn().mockResolvedValue(companyUser) });
      await service.forgotPassword('user@company.com');
      await new Promise((r) => setImmediate(r));

      const call = notificationMock.notifyEvent.mock.calls[0][0];
      expect(call.payload.data).toMatchObject({
        firstName: 'User',
        email:     'user@company.com',
        resetUrl:  expect.stringContaining('/auth/reset-password?token='),
        expiresAt: expect.any(String),
      });
    });

    it('always routes through modules company — exactly one notification call', async () => {
      await buildModule(
        { findByEmailWithPassword: jest.fn().mockResolvedValue(companyUser) },
        { notifyEvent: jest.fn().mockResolvedValue(FAKE_NOTIFY_FAIL) },
      );
      await service.forgotPassword('user@company.com');
      await new Promise((r) => setImmediate(r));

      // Single call always through modules company — no primary/fallback split
      expect(notificationMock.notifyEvent).toHaveBeenCalledTimes(1);
      const [call] = notificationMock.notifyEvent.mock.calls;
      expect(call[0].companyId).toBe('plat_cmp');
      expect(call[0].event).toBe('security.company_forgot_password');
    });

    it('does not double-fire fallback when primary succeeds', async () => {
      await buildModule({ findByEmailWithPassword: jest.fn().mockResolvedValue(companyUser) });
      await service.forgotPassword('user@company.com');
      await new Promise((r) => setImmediate(r));
      expect(notificationMock.notifyEvent).toHaveBeenCalledTimes(1);
    });

    it('returns safe response regardless of notification outcome', async () => {
      await buildModule({ findByEmailWithPassword: jest.fn().mockResolvedValue(null) });
      const result = await service.forgotPassword('notfound@x.com');
      expect(result.message).toContain('If an account with that email exists');
    });
  });

  // ── forgotPassword (modules) → security.platform_forgot_password ────────

  describe('forgotPassword() — modules user', () => {
    const platformUser = {
      _id: OBJECT_ID, email: 'admin@grapifly.com', firstName: 'Admin',
      scope: 'global', companyId: 'plat_cmp', passwordHash: 'hash',
    };

    it('fires security.platform_forgot_password via modules companyId', async () => {
      await buildModule({ findByEmailWithPassword: jest.fn().mockResolvedValue(platformUser) });
      await service.forgotPassword('admin@grapifly.com');
      await new Promise((r) => setImmediate(r));

      expect(notificationMock.notifyEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'plat_cmp',
          event:     'security.platform_forgot_password',
        }),
      );
    });

    it('resolves modules company from UsersService when companyId is null', async () => {
      const platformUser2 = { _id: OBJECT_ID, email: 'admin@grapifly.com', firstName: 'Admin', scope: 'global', companyId: null, passwordHash: 'hash' };
      const userNoCompany = platformUser2;
      await buildModule({ findByEmailWithPassword: jest.fn().mockResolvedValue(userNoCompany) });
      await service.forgotPassword('admin@grapifly.com');
      await new Promise((r) => setImmediate(r));

      expect(notificationMock.notifyEvent).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'plat_cmp', event: 'security.platform_forgot_password' }),
      );
    });
  });

  // ── resetPassword (company) → security.company_password_changed ──────────

  describe('resetPassword() — company user', () => {
    const companyUser = {
      _id: OBJECT_ID, email: 'user@company.com', firstName: 'User',
      scope: 'company', companyId: 'cmp_1',
    };

    it('fires security.company_password_changed routed via modules companyId', async () => {
      await buildModule({
        findByPasswordResetToken: jest.fn().mockResolvedValue(companyUser),
      });
      await service.resetPassword('valid_token', 'NewP@ss!');
      await new Promise((r) => setImmediate(r));

      expect(notificationMock.notifyEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'plat_cmp',
          event:     'security.company_password_changed',
        }),
      );
    });

    it('fires with firstName, email, when, changedAt in payload', async () => {
      await buildModule({ findByPasswordResetToken: jest.fn().mockResolvedValue(companyUser) });
      await service.resetPassword('valid_token', 'NewP@ss!');
      await new Promise((r) => setImmediate(r));

      const call = notificationMock.notifyEvent.mock.calls[0][0];
      expect(call.payload.data).toMatchObject({
        firstName: 'User',
        email:     'user@company.com',
        when:      expect.any(String),      // backward compat alias
        changedAt: expect.any(String),      // semantic name
      });
    });

    it('throws BadRequestException on invalid token', async () => {
      await buildModule({ findByPasswordResetToken: jest.fn().mockResolvedValue(null) });
      await expect(service.resetPassword('bad_token', 'NewP@ss!')).rejects.toThrow(BadRequestException);
    });
  });

  // ── resetPassword (modules) → security.platform_password_changed ────────

  describe('resetPassword() — modules user', () => {
    const platformUser = {
      _id: OBJECT_ID, email: 'admin@grapifly.com', firstName: 'Admin',
      scope: 'global', companyId: 'plat_cmp',
    };

    it('fires security.platform_password_changed via modules companyId', async () => {
      await buildModule({ findByPasswordResetToken: jest.fn().mockResolvedValue(platformUser) });
      await service.resetPassword('valid_token', 'NewP@ss!');
      await new Promise((r) => setImmediate(r));

      expect(notificationMock.notifyEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'plat_cmp',
          event:     'security.platform_password_changed',
        }),
      );
    });
  });

  // ── fireNotification: logs but never throws ───────────────────────────────

  describe('fireNotification (via register)', () => {
    it('logs and continues when notifyEvent throws', async () => {
      await buildModule(
        {},
        { notifyEvent: jest.fn().mockRejectedValue(new Error('SMTP error')) },
      );
      // Should NOT throw despite notification failure
      await expect(
        service.register({
          companyName: 'Acme', email: 'owner@x.com',
          password: 'P@ssw0rd!', firstName: 'Owner', lastName: 'User',
        }),
      ).resolves.not.toThrow();
    });
  });

  // ── login — no notification ───────────────────────────────────────────────

  describe('login()', () => {
    it('does not fire any notification', async () => {
      const user = {
        _id: 'u1', email: 'user@x.com', passwordHash: 'WILL_NOT_MATCH',
        isEmailVerified: true, isActive: true, scope: 'company', companyId: 'cmp_1',
      };
      await buildModule({ findByEmailWithPassword: jest.fn().mockResolvedValue(user) });

      // Password won't match — UnauthorizedException is expected
      await expect(service.login({ email: 'user@x.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(notificationMock.notifyEvent).not.toHaveBeenCalled();
    });

    it('throws EMAIL_NOT_VERIFIED when email is not verified', async () => {
      // Hash of 'P@ssw0rd!' with 4 rounds (fast for tests).
      const passwordHash = await bcrypt.hash('P@ssw0rd!', 4);
      const user = {
        _id: OBJECT_ID, email: 'user@x.com', passwordHash,
        isEmailVerified: false, isActive: true, scope: 'company', companyId: 'cmp_1',
      };
      await buildModule({ findByEmailWithPassword: jest.fn().mockResolvedValue(user) });
      await expect(
        service.login({ email: 'user@x.com', password: 'P@ssw0rd!' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
