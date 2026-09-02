import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersBootstrapService } from '../users-bootstrap.service';
import { User } from '../schemas/user.schema';
import { Business } from '../../business/schemas/business.schema';
import * as bcrypt from 'bcryptjs';

// ── Mock helpers ──────────────────────────────────────────────────────────────

function chain(value: any) {
  const q: any = {};
  q.lean = () => q;
  q.exec = () => Promise.resolve(value);
  return q;
}

const PLATFORM_ID = '507f1f77bcf86cd799439011';
const PLATFORM_BIZ = {
  _id: PLATFORM_ID,
  businessKey: 'invoice-app',
  businessName: 'Invoice App',
  isPlatformCompany: true,
  isActive: true,
};
const VALID_HASH = '$2b$12$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // format-valid, not real

const CORRECTLY_LINKED_ADMIN = {
  _id: PLATFORM_ID,
  email: 'admin@invoiceapp.com',
  role: 'platform_admin',
  scope: 'global',
  companyId: PLATFORM_ID,
  businessKey: 'invoice-app',
  passwordHash: VALID_HASH,
};

async function buildAndRun(
  userOverrides: Partial<Record<string, any>> = {},
  bizOverrides: Partial<Record<string, any>> = {},
): Promise<{
  userModel: any;
  bizModel: any;
}> {
  const userModel = {
    findOne: jest.fn(() => chain(null)),
    find: jest.fn(() => chain([])),
    create: jest.fn().mockResolvedValue({ _id: 'u1' }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    ...userOverrides,
  };

  const bizModel = {
    findOne: jest.fn(() => chain(PLATFORM_BIZ)),
    findById: jest.fn(() => chain(PLATFORM_BIZ)),
    create: jest.fn().mockResolvedValue({ _id: 'new_biz', businessKey: 'key' }),
    ...bizOverrides,
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      UsersBootstrapService,
      { provide: getModelToken(User.name), useValue: userModel },
      { provide: getModelToken(Business.name), useValue: bizModel },
    ],
  }).compile();

  const service = module.get<UsersBootstrapService>(UsersBootstrapService);
  await service.onApplicationBootstrap();

  return { userModel, bizModel };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UsersBootstrapService', () => {
  describe('first run — no existing data', () => {
    it('creates platform company when none exists', async () => {
      const { bizModel } = await buildAndRun(
        {
          findOne: jest.fn(() => chain(null)),
          create: jest.fn().mockResolvedValue({ _id: 'u1' }),
        },
        {
          findOne: jest.fn(() => chain(null)),
          findById: jest.fn(() => chain(null)),
          create: jest.fn().mockResolvedValue(PLATFORM_BIZ),
        },
      );

      expect(bizModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          businessKey: 'invoice-app',
          isPlatformCompany: true,
        }),
      );
    });

    it('creates platform_admin user when user does not exist', async () => {
      const { userModel } = await buildAndRun(
        {
          findOne: jest.fn(() => chain(null)),
          find: jest.fn(() => chain([])),
          create: jest.fn().mockResolvedValue({ _id: 'u1' }),
        },
        {},
      );

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'platform_admin',
          scope: 'global',
          isActive: true,
          isEmailVerified: true,
          mustChangePassword: false,
        }),
      );
    });

    it('does not log plaintext password during bootstrap', async () => {
      const noop = () => {};
      const warnSpy = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation(noop as any);
      const logLines: string[] = [];
      const loggerLogSpy = jest
        .spyOn(require('@nestjs/common').Logger.prototype, 'log')
        .mockImplementation((msg: string) => {
          logLines.push(msg);
        });
      const loggerWarnSpy = jest
        .spyOn(require('@nestjs/common').Logger.prototype, 'warn')
        .mockImplementation((msg: string) => {
          logLines.push(msg);
        });

      await buildAndRun(
        {
          findOne: jest.fn(() => chain(null)),
          create: jest.fn().mockResolvedValue({ _id: 'u1' }),
        },
        {},
      );

      const combined = logLines.join('\n');
      expect(combined).not.toContain('InvoiceApp123!');
      expect(combined).not.toContain('@Grapifly1');
      // Does not contain any string that looks like a password hash ($2b$...)
      expect(combined).not.toMatch(/\$2[ab]\$/);

      warnSpy.mockRestore();
      loggerLogSpy.mockRestore();
      loggerWarnSpy.mockRestore();
    });
  });

  describe('repeated run — records already exist', () => {
    it('does not call company.create when platform company already exists', async () => {
      const { bizModel } = await buildAndRun(
        {
          findOne: jest.fn(() => chain(CORRECTLY_LINKED_ADMIN)),
          find: jest.fn(() => chain([])),
        },
        {
          findOne: jest.fn(() => chain(PLATFORM_BIZ)),
          findById: jest.fn(() => chain(PLATFORM_BIZ)),
          create: jest.fn(),
        },
      );

      expect(bizModel.create).not.toHaveBeenCalled();
    });

    it('does not call user.create or user.updateOne when admin is already correct', async () => {
      const { userModel } = await buildAndRun(
        {
          findOne: jest.fn(() => chain(CORRECTLY_LINKED_ADMIN)),
          find: jest.fn(() => chain([])),
        },
        {
          findOne: jest.fn(() => chain(PLATFORM_BIZ)),
          findById: jest.fn(() => chain(PLATFORM_BIZ)),
          create: jest.fn(),
        },
      );

      expect(userModel.create).not.toHaveBeenCalled();
      expect(userModel.updateOne).not.toHaveBeenCalled();
    });

    it('does not overwrite a valid existing password hash on normal restart', async () => {
      const adminWithDifferentValidHash = {
        ...CORRECTLY_LINKED_ADMIN,
        passwordHash:
          '$2b$12$differentHashAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      };

      const { userModel } = await buildAndRun(
        {
          findOne: jest.fn(() => chain(adminWithDifferentValidHash)),
          find: jest.fn(() => chain([])),
        },
        {
          findOne: jest.fn(() => chain(PLATFORM_BIZ)),
          findById: jest.fn(() => chain(PLATFORM_BIZ)),
        },
      );

      // All fields are correct — no update needed
      expect(userModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('repairs', () => {
    it('repairs stale companyId on existing admin', async () => {
      const staleAdmin = {
        ...CORRECTLY_LINKED_ADMIN,
        companyId: 'old_company_id',
      };

      const { userModel } = await buildAndRun(
        {
          findOne: jest.fn(() => chain(staleAdmin)),
          find: jest.fn(() => chain([])),
        },
        {
          findOne: jest.fn(() => chain(PLATFORM_BIZ)),
          findById: jest.fn(() => chain(PLATFORM_BIZ)),
        },
      );

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: PLATFORM_ID },
        expect.objectContaining({
          $set: expect.objectContaining({ companyId: PLATFORM_ID }),
        }),
      );
    });

    it('repairs null password hash by resetting to bootstrap default', async () => {
      const adminWithNullHash = {
        ...CORRECTLY_LINKED_ADMIN,
        passwordHash: null,
      };

      const { userModel } = await buildAndRun(
        {
          findOne: jest.fn(() => chain(adminWithNullHash)),
          find: jest.fn(() => chain([])),
        },
        {
          findOne: jest.fn(() => chain(PLATFORM_BIZ)),
          findById: jest.fn(() => chain(PLATFORM_BIZ)),
        },
      );

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: PLATFORM_ID },
        expect.objectContaining({
          $set: expect.objectContaining({
            passwordHash: expect.stringMatching(/^\$2/),
          }),
        }),
      );
    });

    it('repairs plaintext/invalid password hash by resetting to bootstrap default', async () => {
      const adminWithPlaintextHash = {
        ...CORRECTLY_LINKED_ADMIN,
        passwordHash: 'plaintext_not_a_hash',
      };

      const { userModel } = await buildAndRun(
        {
          findOne: jest.fn(() => chain(adminWithPlaintextHash)),
          find: jest.fn(() => chain([])),
        },
        {
          findOne: jest.fn(() => chain(PLATFORM_BIZ)),
          findById: jest.fn(() => chain(PLATFORM_BIZ)),
        },
      );

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: PLATFORM_ID },
        expect.objectContaining({
          $set: expect.objectContaining({
            passwordHash: expect.stringMatching(/^\$2/),
          }),
        }),
      );
    });

    it('creates a placeholder Business for an orphaned company-scoped user', async () => {
      const orphanedUser = {
        _id: '507f1f77bcf86cd799439099',
        email: 'owner@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        scope: 'company',
        companyId: 'non_existent_company_id',
      };

      const { bizModel, userModel } = await buildAndRun(
        {
          findOne: jest.fn((query: any) => {
            // admin lookup
            if (query?.email) return chain(CORRECTLY_LINKED_ADMIN);
            // businessKey conflict check in repairOrphanedBusinessUsers
            return chain(null);
          }),
          find: jest.fn(() => chain([orphanedUser])),
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        },
        {
          findOne: jest.fn(() => chain(PLATFORM_BIZ)),
          findById: jest.fn((id: string) => {
            if (id === 'non_existent_company_id') return chain(null);
            return chain(PLATFORM_BIZ);
          }),
          create: jest.fn().mockResolvedValue({
            _id: 'new_biz_id',
            businessKey: 'alice-smith-business',
          }),
        },
      );

      expect(bizModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerUserId: '507f1f77bcf86cd799439099',
          isActive: true,
          isPlatformCompany: false,
        }),
      );

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439099' },
        expect.objectContaining({
          $set: expect.objectContaining({ companyId: 'new_biz_id' }),
        }),
      );
    });
  });

  describe('missing RelayConnection does not break bootstrap', () => {
    it('bootstrap resolves without throwing when no comm connection exists', async () => {
      // Bootstrap does not interact with RelayConnection at all —
      // that is handled separately by RelayModule.onApplicationBootstrap.
      await expect(
        buildAndRun(
          {
            findOne: jest.fn(() => chain(null)),
            create: jest.fn().mockResolvedValue({ _id: 'u1' }),
          },
          {
            findOne: jest.fn(() => chain(null)),
            create: jest.fn().mockResolvedValue(PLATFORM_BIZ),
            findById: jest.fn(() => chain(null)),
          },
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('password hash format validation', () => {
    it('bcrypt hash is recognized as valid', async () => {
      const hash = await bcrypt.hash('SomePassword!', 4);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('null is not a valid bcrypt hash', () => {
      const pw: any = null;
      expect(typeof pw === 'string' && pw.startsWith('$2')).toBe(false);
    });

    it('plain text is not a valid bcrypt hash', () => {
      const pw = 'PlainTextPassword';
      expect(typeof pw === 'string' && pw.startsWith('$2')).toBe(false);
    });
  });
});
