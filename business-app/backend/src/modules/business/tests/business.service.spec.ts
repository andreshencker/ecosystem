import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { BusinessService } from '../business.service';
import { BusinessResponseDto } from '../dto/business-response.dto';
import { Business } from '../schemas/business.schema';
import { BusinessSmtp } from '../schemas/business-smtp.schema';
import { UsersService } from '../../users/users.service';
import { CryptoService } from '../../../infrastructure/common/security/crypto.service';

// ── Fixtures ────────────────────────────────────────────────────────────────

const COMPANY_ID = '64f0000000000000000000aa';
const USER_ID    = '64f0000000000000000000bb';

const mockBusinessDoc = {
  _id: COMPANY_ID,
  businessKey: 'acme-corp',
  businessName: 'Acme Corp',
  ownerUserId: USER_ID,
  abn: '12345678901',
  depositAccount: { bsb: '062000', accountNumber: '123456' },
  defaultCurrency: 'AUD',
  isActive: true,
  isPlatformCompany: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

// ── Mock factories ──────────────────────────────────────────────────────────

function makeMockBusinessModel(findResult: any = mockBusinessDoc) {
  return {
    findById: jest.fn().mockReturnValue({
      lean: () => ({ exec: async () => findResult }),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      lean: () => ({ exec: async () => findResult }),
    }),
    findOne: jest.fn().mockReturnValue({
      lean: () => ({ exec: async () => findResult }),
      exec: jest.fn().mockResolvedValue(findResult),
    }),
  };
}

function makeMockSmtpModel() {
  return {
    findOne: jest.fn().mockReturnValue({
      lean: () => ({ exec: async () => null }),
    }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      lean: () => ({ exec: async () => null }),
    }),
  };
}

async function buildModule(overrides: {
  businessModel?: any;
  usersServiceFindById?: (id: string) => any;
} = {}) {
  const businessModel = overrides.businessModel ?? makeMockBusinessModel();

  const mockUsersService = {
    findById: jest.fn().mockImplementation(
      overrides.usersServiceFindById ?? (() => Promise.resolve(null)),
    ),
    getCompanyDisplayName: jest.fn().mockResolvedValue('Acme Corp'),
  };

  const mockCryptoService = {
    encryptJson: jest.fn(),
    decryptJson: jest.fn(),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      BusinessService,
      { provide: getModelToken(Business.name),     useValue: businessModel },
      { provide: getModelToken(BusinessSmtp.name), useValue: makeMockSmtpModel() },
      { provide: UsersService,                     useValue: mockUsersService },
      { provide: CryptoService,                    useValue: mockCryptoService },
    ],
  }).compile();

  return {
    service:       moduleRef.get(BusinessService),
    businessModel,
    usersService:  mockUsersService,
  };
}

// ── BusinessResponseDto unit tests ─────────────────────────────────────────

describe('BusinessResponseDto', () => {
  it('maps _id to id', () => {
    const dto = BusinessResponseDto.from(mockBusinessDoc as any);
    expect(dto.id).toBe(COMPANY_ID);
    expect(dto.businessKey).toBe('acme-corp');
    expect(dto.businessName).toBe('Acme Corp');
    expect(dto.abn).toBe('12345678901');
    expect(dto.depositAccount).toEqual({ bsb: '062000', accountNumber: '123456' });
    expect(dto.defaultCurrency).toBe('AUD');
    expect(dto.isActive).toBe(true);
    expect(dto.isPlatformCompany).toBe(false);
  });

  it('serializes timestamps as ISO strings', () => {
    const dto = BusinessResponseDto.from(mockBusinessDoc as any);
    expect(dto.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('applies safe defaults for missing optional fields', () => {
    const sparse = { _id: 'abc', businessKey: 'k', businessName: 'N' };
    const dto = BusinessResponseDto.from(sparse as any);
    expect(dto.id).toBe('abc');
    expect(dto.abn).toBeNull();
    expect(dto.ownerUserId).toBeNull();
    expect(dto.depositAccount).toEqual({ bsb: null, accountNumber: null });
    expect(dto.defaultCurrency).toBe('AUD');
    expect(dto.isActive).toBe(true);
    expect(dto.isPlatformCompany).toBe(false);
  });
});

// ── getOwnCompany ──────────────────────────────────────────────────────────

describe('BusinessService.getOwnCompany', () => {
  it('returns BusinessResponseDto for user with ctx.companyId', async () => {
    const { service } = await buildModule();
    const ctx = { actorType: 'user' as const, userId: USER_ID, companyId: COMPANY_ID };

    const result = await service.getOwnCompany(ctx);

    expect(result).toBeInstanceOf(BusinessResponseDto);
    expect(result.id).toBe(COMPANY_ID);
    expect(result.businessName).toBe('Acme Corp');
  });

  it('uses ctx.companyId directly — does NOT call usersService.findById', async () => {
    const { service, usersService } = await buildModule();
    const ctx = { actorType: 'user' as const, userId: USER_ID, companyId: COMPANY_ID };

    await service.getOwnCompany(ctx);

    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('falls back to DB user lookup when ctx.companyId is null', async () => {
    const { service, usersService } = await buildModule({
      usersServiceFindById: () =>
        Promise.resolve({ _id: USER_ID, companyId: COMPANY_ID, scope: 'company' }),
    });
    const ctx = { actorType: 'user' as const, userId: USER_ID, companyId: null };

    const result = await service.getOwnCompany(ctx);

    expect(usersService.findById).toHaveBeenCalledWith(USER_ID);
    expect(result.id).toBe(COMPANY_ID);
  });

  it('throws ForbiddenException when ctx.companyId is null and user has no companyId', async () => {
    const { service } = await buildModule({
      usersServiceFindById: () =>
        Promise.resolve({ _id: USER_ID, companyId: null, scope: 'company' }),
    });
    const ctx = { actorType: 'user' as const, userId: USER_ID, companyId: null };

    await expect(service.getOwnCompany(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when there is no userId and no companyId', async () => {
    const { service } = await buildModule();
    const ctx = { actorType: 'user' as const };

    await expect(service.getOwnCompany(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when the business document does not exist in MongoDB', async () => {
    const businessModel = makeMockBusinessModel(null);
    const { service } = await buildModule({ businessModel });
    const ctx = { actorType: 'user' as const, userId: USER_ID, companyId: COMPANY_ID };

    await expect(service.getOwnCompany(ctx)).rejects.toThrow(NotFoundException);
  });

  it('resolves platform admin via platform company when user has null companyId and scope=global', async () => {
    const platformDoc = { ...mockBusinessDoc, isPlatformCompany: true };
    const businessModel = makeMockBusinessModel(platformDoc);
    const { service } = await buildModule({
      businessModel,
      usersServiceFindById: () =>
        Promise.resolve({ _id: USER_ID, companyId: null, scope: 'global' }),
    });
    const ctx = { actorType: 'user' as const, userId: USER_ID, companyId: null };

    const result = await service.getOwnCompany(ctx);

    expect(result).toBeInstanceOf(BusinessResponseDto);
    expect(result.isPlatformCompany).toBe(true);
  });
});

// ── updateOwnCompany ───────────────────────────────────────────────────────

describe('BusinessService.updateOwnCompany', () => {
  it('returns BusinessResponseDto after successful update by business_owner', async () => {
    const { service } = await buildModule({
      usersServiceFindById: () =>
        Promise.resolve({
          _id: USER_ID,
          companyId: COMPANY_ID,
          scope: 'company',
          role: 'business_owner',
        }),
    });
    const ctx = { actorType: 'user' as const, userId: USER_ID, companyId: COMPANY_ID };

    const result = await service.updateOwnCompany(ctx, { businessName: 'Acme Updated' } as any);

    expect(result).toBeInstanceOf(BusinessResponseDto);
    expect(result.id).toBe(COMPANY_ID);
  });

  it('throws ForbiddenException when role is not owner or admin', async () => {
    const { service } = await buildModule({
      usersServiceFindById: () =>
        Promise.resolve({
          _id: USER_ID,
          companyId: COMPANY_ID,
          scope: 'company',
          role: 'staff',
        }),
    });
    const ctx = { actorType: 'user' as const, userId: USER_ID, companyId: COMPANY_ID };

    await expect(
      service.updateOwnCompany(ctx, { businessName: 'X' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

});
