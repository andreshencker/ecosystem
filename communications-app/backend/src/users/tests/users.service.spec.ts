import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { User } from '../schemas/user.schema';
import { Company } from '../../communication/company/company-info/schemas/company.schema';
import { ConfigService } from '@nestjs/config';

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

function buildUserModelMock(overrides: Partial<Record<string, any>> = {}) {
  return {
    findById: jest.fn(() => mockChain(null)),
    findOne: jest.fn(() => mockChain(null)),
    find: jest.fn(() => mockChain([])),
    // countDocuments returns a Promise directly (Mongoose v7 queries are thenable, no .exec() needed)
    countDocuments: jest.fn().mockResolvedValue(0),
    findByIdAndUpdate: jest.fn(() => mockChain(null)),
    findByIdAndDelete: jest.fn(() => mockChain(null)),
    create: jest.fn(),
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

describe('UsersService', () => {
  let service: UsersService;
  let userModel: ReturnType<typeof buildUserModelMock>;
  let companyModel: ReturnType<typeof buildCompanyModelMock>;

  async function buildModule(
    userOverrides: Partial<Record<string, any>> = {},
    companyOverrides: Partial<Record<string, any>> = {},
  ) {
    userModel = buildUserModelMock(userOverrides);
    companyModel = buildCompanyModelMock(companyOverrides);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Company.name), useValue: companyModel },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  }

  // ── listByCompanyId ────────────────────────────────────────────────────────

  describe('listByCompanyId', () => {
    it('queries by companyId and returns paginated result', async () => {
      const fakeUser = {
        _id: 'u1',
        email: 'a@example.com',
        firstName: 'A',
        lastName: 'B',
        role: 'operator',
        scope: 'company',
        companyId: 'cmp_1',
        companyKey: 'c1',
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date(),
      };
      const findMock = jest.fn(() => mockChain([fakeUser]));
      const countMock = jest.fn().mockResolvedValue(1);
      await buildModule({ find: findMock, countDocuments: countMock });

      const result = await service.listByCompanyId('cmp_1', {
        page: 1,
        limit: 20,
      });

      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'cmp_1' }),
      );
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('applies search regex when search term is provided', async () => {
      const findMock = jest.fn(() => mockChain([]));
      const countMock = jest.fn(() => ({ exec: () => Promise.resolve(0) }));
      await buildModule({ find: findMock, countDocuments: countMock });

      await service.listByCompanyId('cmp_1', {
        page: 1,
        limit: 10,
        search: 'alice',
      });

      const calledFilter = (findMock.mock.calls as unknown[][])[0][0] as any;
      expect(calledFilter.$or).toBeDefined();
      expect(calledFilter.$or).toHaveLength(3); // email, firstName, lastName
    });

    it('returns correct pagination metadata', async () => {
      await buildModule({ countDocuments: jest.fn().mockResolvedValue(45) });

      const result = await service.listByCompanyId('cmp_1', {
        page: 3,
        limit: 10,
      });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(45);
    });
  });

  // ── listPlatformUsers ──────────────────────────────────────────────────────

  describe('listPlatformUsers', () => {
    it('filters to platform_admin and company_owner roles only', async () => {
      const findMock = jest.fn(() => mockChain([]));
      const countMock = jest.fn(() => ({ exec: () => Promise.resolve(0) }));
      await buildModule({ find: findMock, countDocuments: countMock });

      await service.listPlatformUsers({ page: 1, limit: 25 });

      const calledFilter = (findMock.mock.calls as unknown[][])[0][0] as any;
      expect(calledFilter.role?.$in).toEqual(
        expect.arrayContaining(['platform_admin', 'company_owner']),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when user does not exist', async () => {
      await buildModule({ findByIdAndUpdate: jest.fn(() => mockChain(null)) });
      await expect(
        service.update('nonexistent', { firstName: 'John' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates firstName and lastName and returns updated doc', async () => {
      const updated = {
        _id: 'u1',
        email: 'a@b.com',
        firstName: 'Updated',
        lastName: 'Name',
        role: 'operator',
        scope: 'company',
        companyId: 'cmp_1',
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date(),
      };
      await buildModule({
        findByIdAndUpdate: jest.fn(() => mockChain(updated)),
      });

      const result = await service.update('u1', {
        firstName: 'Updated',
        lastName: 'Name',
      });
      expect(result.firstName).toBe('Updated');
    });
  });

  // ── changePassword ─────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('throws UnauthorizedException when current password does not match', async () => {
      const user = {
        _id: 'u1',
        passwordHash: '$2b$12$invalidhashThatWillNeverMatch.......',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        role: 'operator',
        scope: 'company',
        companyId: 'cmp_1',
      };
      await buildModule({ findById: jest.fn(() => mockChain(user)) });

      await expect(
        service.changePassword('u1', 'wrongcurrent', 'newpass123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws NotFoundException when user is not found', async () => {
      await buildModule({ findById: jest.fn(() => mockChain(null)) });
      await expect(
        service.changePassword('ghost', 'any', 'newpass'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── createInvitedUser ──────────────────────────────────────────────────────

  describe('createInvitedUser', () => {
    it('throws ConflictException when email already exists', async () => {
      const existingUser = { _id: 'u99', email: 'dup@example.com' };
      await buildModule({ findOne: jest.fn(() => mockChain(existingUser)) });

      await expect(
        service.createInvitedUser({
          email: 'dup@example.com',
          firstName: 'Dup',
          lastName: 'User',
          role: 'operator',
          companyId: 'cmp_1',
          companyKey: 'c1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user with mustChangePassword=true', async () => {
      const created = {
        _id: 'new_u',
        email: 'fresh@x.com',
        firstName: 'Fresh',
        lastName: 'User',
        role: 'company_admin',
        scope: 'company',
        companyId: 'cmp_1',
        mustChangePassword: true,
        isActive: true,
        isEmailVerified: false,
        toObject: () => this,
      };
      const createMock = jest.fn().mockResolvedValue(created);
      await buildModule({
        findOne: jest.fn(() => mockChain(null)),
        create: createMock,
      });

      await service.createInvitedUser({
        email: 'fresh@x.com',
        firstName: 'Fresh',
        lastName: 'User',
        role: 'company_admin',
        companyId: 'cmp_1',
        companyKey: 'c1',
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ mustChangePassword: true, isActive: true }),
      );
    });

    it('returns tempPassword that is a non-empty string', async () => {
      const created = {
        _id: 'new_u2',
        email: 'inv@x.com',
        toObject: () => ({ _id: 'new_u2', email: 'inv@x.com' }),
      };
      await buildModule({
        findOne: jest.fn(() => mockChain(null)),
        create: jest.fn().mockResolvedValue(created),
      });

      const { tempPassword } = await service.createInvitedUser({
        email: 'inv@x.com',
        firstName: 'I',
        lastName: 'N',
        role: 'operator',
        companyId: 'cmp_1',
        companyKey: 'c1',
      });

      expect(typeof tempPassword).toBe('string');
      expect(tempPassword.length).toBeGreaterThan(8);
    });
  });

  // ── deleteById ─────────────────────────────────────────────────────────────

  describe('deleteById', () => {
    it('throws NotFoundException when user does not exist', async () => {
      await buildModule({
        findByIdAndDelete: jest.fn(() => ({
          exec: () => Promise.resolve(null),
        })),
      });
      await expect(service.deleteById('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('completes without error when user exists', async () => {
      const doc = { _id: 'u1' };
      await buildModule({
        findByIdAndDelete: jest.fn(() => ({
          exec: () => Promise.resolve(doc),
        })),
      });
      await expect(service.deleteById('u1')).resolves.toBeUndefined();
    });
  });
});
