import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { UsersService } from '../../users/users.service';
import { CommunicationsClientService } from '../../../integrations/communications/client/communications-client.service';
import { ProvisioningService } from '../../provisioning/provisioning.service';

// Valid 24-char hex ObjectId strings to satisfy BSON validation.
const OBJECT_ID = '507f1f77bcf86cd799439011';
const PLATFORM_OBJECT_ID = '507f1f77bcf86cd799439022';

function mockChain(value: any) {
  const q: any = { lean: () => q, exec: () => Promise.resolve(value) };
  return q;
}

describe('AuthService', () => {
  let service: AuthService;
  let usersServiceMock: Partial<Record<string, jest.Mock>>;
  let tokenModelMock: Partial<Record<string, jest.Mock>>;

  async function buildModule(
    userOverrides: Partial<Record<string, jest.Mock>> = {},
  ) {
    usersServiceMock = {
      findByEmailWithPassword: jest.fn().mockResolvedValue(null),
      findByEmailVerificationToken: jest.fn().mockResolvedValue(null),
      findByPasswordResetToken: jest.fn().mockResolvedValue(null),
      setEmailVerificationToken: jest.fn().mockResolvedValue(undefined),
      setPasswordResetToken: jest.fn().mockResolvedValue(undefined),
      setPasswordHash: jest.fn().mockResolvedValue(undefined),
      setEmailVerified: jest.fn().mockResolvedValue(undefined),
      createCompanyOwnerWithCompany: jest.fn().mockResolvedValue({
        company: { _id: PLATFORM_OBJECT_ID },
        user: {
          _id: OBJECT_ID,
          email: 'owner@x.com',
          firstName: 'Owner',
          scope: 'company',
          companyId: PLATFORM_OBJECT_ID,
        },
      }),
      getPlatformCompanyId: jest.fn().mockResolvedValue('plat_cmp'),
      getCompanyDisplayName: jest.fn().mockResolvedValue('Acme Corp'),
      ...userOverrides,
    };

    tokenModelMock = {
      create: jest.fn().mockResolvedValue({ _id: 'tok_1' }),
      findOne: jest.fn(() => mockChain(null)),
      findOneAndUpdate: jest.fn(() => mockChain(null)),
      findByIdAndUpdate: jest.fn(() => mockChain(null)),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('jwt_token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
        { provide: getModelToken(RefreshToken.name), useValue: tokenModelMock },
        {
          provide: CommunicationsClientService,
          useValue: { notifyEvent: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: ProvisioningService,
          useValue: {
            provisionBusiness: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  }

  describe('register()', () => {
    it('creates company+user and returns success message', async () => {
      await buildModule();
      const result = await service.register({
        businessName: 'Acme',
        email: 'owner@x.com',
        password: 'P@ssw0rd!',
        firstName: 'Owner',
        lastName: 'User',
      });
      expect(result.message).toContain('Registration successful');
    });
  });

  describe('forgotPassword()', () => {
    it('returns safe response when user not found', async () => {
      await buildModule();
      const result = await service.forgotPassword('notfound@x.com');
      expect(result.message).toContain('If an account with that email exists');
    });

    it('returns safe response when user found', async () => {
      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        firstName: 'User',
        scope: 'company',
        companyId: 'cmp_1',
        passwordHash: 'hash',
      };
      await buildModule({
        findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      });
      const result = await service.forgotPassword('user@x.com');
      expect(result.message).toContain('If an account with that email exists');
    });
  });

  describe('resetPassword()', () => {
    it('throws BadRequestException on invalid token', async () => {
      await buildModule({
        findByPasswordResetToken: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.resetPassword('bad_token', 'NewP@ss!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('resets password and returns success message', async () => {
      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        firstName: 'User',
        scope: 'company',
        companyId: 'cmp_1',
      };
      await buildModule({
        findByPasswordResetToken: jest.fn().mockResolvedValue(user),
      });
      const result = await service.resetPassword('valid_token', 'NewP@ss!');
      expect(result.message).toContain('Password reset successfully');
    });
  });

  describe('login()', () => {
    it('throws UnauthorizedException on unknown email', async () => {
      await buildModule({
        findByEmailWithPassword: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.login({ email: 'nobody@x.com', password: 'P@ssw0rd!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const user = {
        _id: 'u1',
        email: 'user@x.com',
        passwordHash: 'WILL_NOT_MATCH',
        isEmailVerified: true,
        isActive: true,
      };
      await buildModule({
        findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      });
      await expect(
        service.login({ email: 'user@x.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws EMAIL_NOT_VERIFIED when email is not verified', async () => {
      const passwordHash = await bcrypt.hash('P@ssw0rd!', 4);
      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        passwordHash,
        isEmailVerified: false,
        isActive: true,
        scope: 'company',
        companyId: 'cmp_1',
      };
      await buildModule({
        findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      });
      await expect(
        service.login({ email: 'user@x.com', password: 'P@ssw0rd!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ACCOUNT_INACTIVE for deactivated account', async () => {
      const passwordHash = await bcrypt.hash('P@ssw0rd!', 4);
      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        passwordHash,
        isEmailVerified: true,
        isActive: false,
        scope: 'company',
        companyId: 'cmp_1',
      };
      await buildModule({
        findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      });
      await expect(
        service.login({ email: 'user@x.com', password: 'P@ssw0rd!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns accessToken, refreshToken and user on successful login', async () => {
      const passwordHash = await bcrypt.hash('P@ssw0rd!', 4);
      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        passwordHash,
        isEmailVerified: true,
        isActive: true,
        role: 'business_owner',
        scope: 'company',
        companyId: PLATFORM_OBJECT_ID,
        businessKey: 'acme',
        firstName: 'Alice',
        lastName: 'Smith',
        avatarUrl: null,
        mustChangePassword: false,
        createdAt: new Date(),
      };
      await buildModule({
        findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      });
      tokenModelMock.create = jest.fn().mockResolvedValue({ _id: 'tok_1' });

      const result = await service.login({
        email: 'user@x.com',
        password: 'P@ssw0rd!',
      });

      expect(result.accessToken).toBe('jwt_token');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.user.email).toBe('user@x.com');
      expect(result.user.id).toBeDefined();
      // Must not include password hash in the response
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('JWT payload carries sub and type fields', async () => {
      const passwordHash = await bcrypt.hash('P@ssw0rd!', 4);
      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        passwordHash,
        isEmailVerified: true,
        isActive: true,
        role: 'business_owner',
        scope: 'company',
        companyId: PLATFORM_OBJECT_ID,
        businessKey: 'acme',
        firstName: 'Alice',
        lastName: 'Smith',
        avatarUrl: null,
        mustChangePassword: false,
        createdAt: new Date(),
      };

      let capturedPayload: any;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: UsersService, useValue: { ...usersServiceMock, findByEmailWithPassword: jest.fn().mockResolvedValue(user) } },
          {
            provide: JwtService,
            useValue: {
              signAsync: jest.fn().mockImplementation((payload: any) => {
                capturedPayload = payload;
                return Promise.resolve('jwt_token');
              }),
            },
          },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') } },
          { provide: getModelToken(RefreshToken.name), useValue: { ...tokenModelMock, create: jest.fn().mockResolvedValue({ _id: 'tok_1' }) } },
          { provide: CommunicationsClientService, useValue: { notifyEvent: jest.fn().mockResolvedValue(true) } },
          { provide: ProvisioningService, useValue: { provisionBusiness: jest.fn().mockResolvedValue(undefined) } },
        ],
      }).compile();

      const svc = module.get<AuthService>(AuthService);
      await svc.login({ email: 'user@x.com', password: 'P@ssw0rd!' });

      expect(capturedPayload.sub).toBe(OBJECT_ID);
      expect(capturedPayload.type).toBe('access');
      expect(capturedPayload.password).toBeUndefined();
      expect(capturedPayload.role).toBeUndefined();
    });
  });

  // ── Platform event contract ─────────────────────────────────────────────────

  describe('platform event contract', () => {
    let notifyMock: jest.Mock;

    async function buildModuleCapturingNotify(
      userOverrides: Partial<Record<string, jest.Mock>> = {},
    ) {
      notifyMock = jest.fn().mockResolvedValue(true);
      await buildModule({
        ...userOverrides,
      });
      // Re-create with a capturing notifyEvent mock
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: UsersService, useValue: { ...usersServiceMock, ...userOverrides } },
          { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('jwt_token') } },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:3003') } },
          { provide: getModelToken(RefreshToken.name), useValue: tokenModelMock },
          { provide: CommunicationsClientService, useValue: { notifyEvent: notifyMock } },
          { provide: ProvisioningService, useValue: { provisionBusiness: jest.fn().mockResolvedValue(undefined) } },
        ],
      }).compile();
      return module.get<AuthService>(AuthService);
    }

    it('register() sends type=platform without businessId', async () => {
      const svc = await buildModuleCapturingNotify();
      await svc.register({
        businessName: 'Acme',
        email: 'owner@x.com',
        password: 'P@ssw0rd!',
        firstName: 'Owner',
        lastName: 'User',
      });

      // Allow fire-and-forget to settle
      await new Promise((r) => setTimeout(r, 50));

      expect(notifyMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'platform', event: 'security.company_verify_email' }),
      );
      // businessId must NOT appear in a platform event
      const call = notifyMock.mock.calls[0][0];
      expect(call).not.toHaveProperty('businessId');
    });

    it('forgotPassword() sends type=platform without businessId', async () => {
      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        firstName: 'User',
        scope: 'company',
        companyId: 'cmp_1',
        passwordHash: 'hash',
      };
      const svc = await buildModuleCapturingNotify({
        findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      });

      await svc.forgotPassword('user@x.com');

      expect(notifyMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'platform', event: 'security.company_forgot_password' }),
      );
      const call = notifyMock.mock.calls[0][0];
      expect(call).not.toHaveProperty('businessId');
    });

    it("forgotPassword() uses user's companyId only as data — not for credential resolution", async () => {
      const userA = {
        _id: OBJECT_ID,
        email: 'a@x.com',
        firstName: 'Alice',
        scope: 'company',
        companyId: 'company_A',
        passwordHash: 'hash',
      };
      const svc = await buildModuleCapturingNotify({
        findByEmailWithPassword: jest.fn().mockResolvedValue(userA),
      });

      await svc.forgotPassword('a@x.com');

      // type must be 'platform' — businessId must be absent
      const call = notifyMock.mock.calls[0][0];
      expect(call.type).toBe('platform');
      expect(call).not.toHaveProperty('businessId');
    });

    it('resetPassword() sends type=platform without businessId', async () => {
      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        firstName: 'User',
        scope: 'company',
        companyId: 'cmp_1',
      };
      const svc = await buildModuleCapturingNotify({
        findByPasswordResetToken: jest.fn().mockResolvedValue(user),
      });
      tokenModelMock.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });

      await svc.resetPassword('valid_token', 'NewP@ss!');
      await new Promise((r) => setTimeout(r, 50));

      expect(notifyMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'platform', event: 'security.company_password_changed' }),
      );
      const call = notifyMock.mock.calls[0][0];
      expect(call).not.toHaveProperty('businessId');
    });

    it('forgotPassword() returns safe response when platform connection is missing (delivered=false)', async () => {
      notifyMock = jest.fn().mockResolvedValue(false); // no active connection
      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        firstName: 'User',
        scope: 'company',
        companyId: 'cmp_1',
        passwordHash: 'hash',
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: UsersService, useValue: { ...usersServiceMock, findByEmailWithPassword: jest.fn().mockResolvedValue(user) } },
          { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('jwt_token') } },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:3003') } },
          { provide: getModelToken(RefreshToken.name), useValue: tokenModelMock },
          { provide: CommunicationsClientService, useValue: { notifyEvent: notifyMock } },
          { provide: ProvisioningService, useValue: { provisionBusiness: jest.fn().mockResolvedValue(undefined) } },
        ],
      }).compile();
      const svc = module.get<AuthService>(AuthService);

      const result = await svc.forgotPassword('user@x.com');
      // Public response must always be the safe enumeration-proof message
      expect(result.message).toContain('If an account with that email exists');
    });

    it('no raw token URLs appear in log output', async () => {
      const logLines: string[] = [];
      jest.spyOn(require('@nestjs/common').Logger.prototype, 'log')
        .mockImplementation((msg: string) => { logLines.push(msg); });
      jest.spyOn(require('@nestjs/common').Logger.prototype, 'warn')
        .mockImplementation((msg: string) => { logLines.push(msg); });

      const user = {
        _id: OBJECT_ID,
        email: 'user@x.com',
        firstName: 'User',
        scope: 'company',
        companyId: 'cmp_1',
        passwordHash: 'hash',
      };
      const svc = await buildModuleCapturingNotify({
        findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      });
      await svc.forgotPassword('user@x.com');

      const combined = logLines.join('\n');
      // Must not contain anything that looks like a hex token (64 hex chars)
      expect(combined).not.toMatch(/[0-9a-f]{64}/);
      // Must not contain resetUrl query param
      expect(combined).not.toContain('?token=');
      // Must not contain verificationUrl
      expect(combined).not.toContain('verify-email?token');

      jest.restoreAllMocks();
    });
  });
});
