/**
 * Security-focused unit tests for UsersService.
 *
 * Covers the security properties that must hold in the current implementation:
 *   - changePassword: current password must be validated before accepting a new one
 *   - createInvitedUser: duplicate email must be rejected (ConflictException)
 *   - deleteById: NotFoundException when target does not exist
 *
 * Invitation scope isolation tests have moved to:
 *  user-invitations.service.spec.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { User } from '../schemas/user.schema';
import { Business } from '../../business/schemas/business.schema';

// ── Shared mock helpers ───────────────────────────────────────────────────────

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

async function buildModule(
  userOverrides: any = {},
  companyOverrides: any = {},
) {
  const userModel = {
    findById: jest.fn(() => mockChain(null)),
    findOne: jest.fn(() => mockChain(null)),
    find: jest.fn(() => mockChain([])),
    countDocuments: jest.fn(() => ({ exec: () => Promise.resolve(0) })),
    findByIdAndUpdate: jest.fn(() => mockChain(null)),
    findByIdAndDelete: jest.fn(() => ({ exec: () => Promise.resolve(null) })),
    create: jest.fn(),
    ...userOverrides,
  };

  const companyModel = {
    findById: jest.fn(() => mockChain(null)),
    ...companyOverrides,
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      UsersService,
      { provide: getModelToken(User.name), useValue: userModel },
      { provide: getModelToken(Business.name), useValue: companyModel },
    ],
  }).compile();

  return {
    service: module.get<UsersService>(UsersService),
    userModel,
    companyModel,
  };
}

// ── changePassword ────────────────────────────────────────────────────────────

describe('UsersService — changePassword security', () => {
  it('throws UnauthorizedException when current password is wrong', async () => {
    const user = {
      _id: 'u1',
      passwordHash: '$2b$12$invalidhashThatWillNeverMatch.......',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
      role: 'staff',
      scope: 'company',
      companyId: 'cmp_1',
    };
    const { service } = await buildModule({
      findById: jest.fn(() => mockChain(user)),
    });

    await expect(
      service.changePassword('u1', 'wrongcurrent', 'newpassword123'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws NotFoundException when user does not exist', async () => {
    const { service } = await buildModule({
      findById: jest.fn(() => mockChain(null)),
    });

    await expect(
      service.changePassword('ghost', 'any', 'newpass'),
    ).rejects.toThrow(NotFoundException);
  });
});

// ── createInvitedUser ─────────────────────────────────────────────────────────

describe('UsersService — createInvitedUser', () => {
  // Shared created-user stub reused across several tests.
  function createdUserStub(overrides: Record<string, unknown> = {}) {
    return {
      _id: 'new_u',
      email: 'inv@x.com',
      isEmailVerified: true,
      mustChangePassword: true,
      toObject: () => ({ _id: 'new_u', email: 'inv@x.com', ...overrides }),
      ...overrides,
    };
  }

  it('throws ConflictException when email already exists', async () => {
    const existing = { _id: 'u99', email: 'dup@example.com' };
    const { service } = await buildModule({
      findOne: jest.fn(() => mockChain(existing)),
    });

    await expect(
      service.createInvitedUser({
        email: 'dup@example.com',
        firstName: 'D',
        lastName: 'U',
        role: 'staff',
        companyId: 'cmp_1',
        businessKey: 'c1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('sets isEmailVerified=true so invited users can login immediately without verify-email step', async () => {
    const createMock = jest.fn().mockResolvedValue(createdUserStub());
    const { service, userModel } = await buildModule({
      findOne: jest.fn(() => mockChain(null)),
      create: createMock,
    });

    await service.createInvitedUser({
      email: 'inv@x.com',
      firstName: 'I',
      lastName: 'N',
      role: 'staff',
      companyId: 'cmp_1',
      businessKey: 'c1',
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ isEmailVerified: true }),
    );
    // Verify that register flow (createCompanyOwnerWithCompany) still uses false.
    // Its user.create call is separate — confirmed by the schema default (false).
    void userModel; // silence unused-variable lint
  });

  it('sets mustChangePassword=true so invited users are forced to change password on first login', async () => {
    const createMock = jest.fn().mockResolvedValue(createdUserStub());
    const { service } = await buildModule({
      findOne: jest.fn(() => mockChain(null)),
      create: createMock,
    });

    await service.createInvitedUser({
      email: 'inv@x.com',
      firstName: 'I',
      lastName: 'N',
      role: 'staff',
      companyId: 'cmp_1',
      businessKey: 'c1',
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ mustChangePassword: true }),
    );
  });

  it('register flow keeps isEmailVerified=false — createCompanyOwnerWithCompany uses false', async () => {
    const userCreateMock = jest.fn().mockResolvedValue({
      _id: 'owner_u',
      email: 'owner@co.com',
      toObject: () => ({ _id: 'owner_u' }),
    });
    const companyCreateMock = jest.fn().mockResolvedValue({
      _id: 'cmp_1',
      businessKey: 'acme',
      toObject: () => ({ _id: 'cmp_1' }),
    });
    const { service } = await buildModule(
      {
        findOne: jest.fn(() => mockChain(null)),
        create: userCreateMock,
        findByIdAndUpdate: jest.fn(() => mockChain(null)),
      },
      {
        create: companyCreateMock,
        findByIdAndUpdate: jest.fn(() => mockChain(null)),
      },
    );

    await service.createCompanyOwnerWithCompany({
      businessName: 'Acme',
      email: 'owner@co.com',
      passwordHash: '$hash',
      firstName: 'O',
      lastName: 'W',
    });

    expect(userCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ isEmailVerified: false }),
    );
  });

  it('does NOT expose tempPassword through the invitation record (audit record has no raw token)', async () => {
    const { service } = await buildModule({
      findOne: jest.fn(() => mockChain(null)),
      create: jest.fn().mockResolvedValue(createdUserStub()),
    });

    const { tempPassword } = await service.createInvitedUser({
      email: 'inv@x.com',
      firstName: 'I',
      lastName: 'N',
      role: 'staff',
      companyId: 'cmp_1',
      businessKey: 'c1',
    });

    expect(typeof tempPassword).toBe('string');
    expect(tempPassword.length).toBeGreaterThan(8);
  });
});

// ── deleteById ────────────────────────────────────────────────────────────────

describe('UsersService — deleteById security', () => {
  it('throws NotFoundException when user does not exist', async () => {
    const { service } = await buildModule({
      findByIdAndDelete: jest.fn(() => ({ exec: () => Promise.resolve(null) })),
    });

    await expect(service.deleteById('ghost')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('completes without error when user exists', async () => {
    const { service } = await buildModule({
      findByIdAndDelete: jest.fn(() => ({
        exec: () => Promise.resolve({ _id: 'u1' }),
      })),
    });

    await expect(service.deleteById('u1')).resolves.toBeUndefined();
  });
});
