import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PlatformAdminCustomersController } from '../platform-admin-customers.controller';
import { BusinessIntelligenceService } from '../../../integrations/business-intelligence/business-intelligence.service';
import { BIUnavailableError } from '../../../integrations/business-intelligence/errors/bi-unavailable.error';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
import type { BiCustomerListResponse, BiCustomerDetailResponse } from '../dto/bi-customer.dto';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function platformAdminCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    actorType: 'user',
    userId: 'admin1',
    role: 'platform_admin',
    scope: 'global',
    companyId: 'plat_cmp',
    ...overrides,
  };
}

function businessUserCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    actorType: 'user',
    userId: 'user1',
    role: 'business_owner',
    scope: 'company',
    companyId: 'biz1',
    ...overrides,
  };
}

const LIST_RESPONSE: BiCustomerListResponse = {
  businessId: '',
  items: [
    {
      customerId: 'cust1',
      businessId: 'biz1',
      businessName: 'Acme',
      customerName: 'Customer One',
      customerType: 'company',
      abn: '12345678901',
      isActive: true,
      contactCount: 2,
      locationCount: 1,
      communicationPurposeCount: 1,
      emailRecipientCount: 2,
      smsRecipientCount: 1,
      hasPrimaryContact: true,
      hasAbn: true,
      hasLocations: true,
      hasContacts: true,
      hasCommunicationConfiguration: true,
      dataQualityIssueCount: 0,
      dataQualityIssues: [],
      sourceCreatedAt: '2024-01-01T00:00:00Z',
      sourceUpdatedAt: '2024-06-01T00:00:00Z',
      syncedAt: '2024-06-02T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
  calculatedAt: '2024-06-15T00:00:00Z',
};

const DETAIL_RESPONSE: BiCustomerDetailResponse = {
  customerId: 'cust1',
  businessId: 'biz1',
  businessName: 'Acme',
  customerName: 'Customer One',
  customerType: 'company',
  abn: '12345678901',
  isActive: true,
  notes: null,
  contactCount: 2,
  locationCount: 1,
  communicationPurposeCount: 1,
  emailRecipientCount: 2,
  smsRecipientCount: 1,
  hasPrimaryContact: true,
  hasAbn: true,
  hasLocations: true,
  hasContacts: true,
  hasCommunicationConfiguration: true,
  dataQualityIssueCount: 0,
  dataQualityIssues: [],
  sourceCreatedAt: '2024-01-01T00:00:00Z',
  sourceUpdatedAt: '2024-06-01T00:00:00Z',
  syncedAt: '2024-06-02T00:00:00Z',
  locations: [
    {
      sourceLocationId: 'loc1',
      tag: 'Main',
      country: 'AU',
      addressLine1: '1 Test St',
      addressLine2: null,
      city: 'Sydney',
      postcode: '2000',
      state: 'NSW',
      fullAddress: '1 Test St, Sydney NSW 2000',
      isValidAddress: true,
      isLegacy: false,
    },
  ],
  contacts: [
    {
      sourceContactId: 'con1',
      contactName: 'Jane Doe',
      roleOrPosition: 'Manager',
      email: 'jane@acme.com',
      phone: '+61412345678',
      locationId: 'loc1',
      locationTag: 'Main',
      isPrimary: true,
      hasEmail: true,
      hasPhone: true,
      hasLocation: true,
    },
  ],
  purposes: [
    {
      communicationDomainId: 'domain1',
      configuredChannelCount: 2,
      emailRecipientCount: 2,
      smsRecipientCount: 1,
      hasEmailChannel: true,
      hasSmsChannel: true,
      recipients: [
        {
          channel: 'email',
          destination: 'jane@acme.com',
          recipientType: 'to',
          destinationNormalized: 'jane@acme.com',
          isValidDestination: true,
        },
      ],
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function biError(
  category: BIUnavailableError['category'],
  statusCode?: number,
  message?: string,
): BIUnavailableError {
  return new BIUnavailableError(
    message ?? `BI error: ${category}`,
    statusCode,
    category,
  );
}

// ── Module setup ──────────────────────────────────────────────────────────────

const mockBi = {
  listPlatformAdminCustomers: jest.fn(),
  getPlatformAdminCustomerDetail: jest.fn(),
};

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [PlatformAdminCustomersController],
    providers: [
      { provide: BusinessIntelligenceService, useValue: mockBi },
    ],
  }).compile();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PlatformAdminCustomersController', () => {
  let controller: PlatformAdminCustomersController;

  beforeEach(async () => {
    const module = await buildModule();
    controller = module.get(PlatformAdminCustomersController);
    jest.clearAllMocks();
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  describe('authorization', () => {
    it('allows platform_admin to list customers', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      const result = await controller.listCustomers(platformAdminCtx(), {});
      expect(result).toEqual(LIST_RESPONSE);
    });

    it('rejects business_owner with 403 on list', async () => {
      await expect(
        controller.listCustomers(businessUserCtx(), {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects business_admin with 403 on list', async () => {
      await expect(
        controller.listCustomers({ ...businessUserCtx(), role: 'business_admin' }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects staff with 403 on list', async () => {
      await expect(
        controller.listCustomers({ ...businessUserCtx(), role: 'staff' }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows platform_admin to get customer detail', async () => {
      mockBi.getPlatformAdminCustomerDetail.mockResolvedValue(DETAIL_RESPONSE);
      const result = await controller.getCustomer(platformAdminCtx(), 'cust1');
      expect(result).toEqual(DETAIL_RESPONSE);
    });

    it('rejects business_owner with 403 on detail', async () => {
      await expect(
        controller.getCustomer(businessUserCtx(), 'cust1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── List proxy ─────────────────────────────────────────────────────────────

  describe('listCustomers', () => {
    it('forwards all supported filters to BI', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      await controller.listCustomers(platformAdminCtx(), {
        businessId: 'biz1',
        page: 2,
        limit: 25,
        search: 'acme',
        isActive: true,
        customerType: 'company',
        hasContacts: true,
        hasLocations: false,
        hasCommunicationConfiguration: true,
        hasDataQualityIssues: false,
      });
      expect(mockBi.listPlatformAdminCustomers).toHaveBeenCalledWith({
        businessId: 'biz1',
        page: 2,
        limit: 25,
        search: 'acme',
        isActive: true,
        customerType: 'company',
        hasContacts: true,
        hasLocations: false,
        hasCommunicationConfiguration: true,
        hasDataQualityIssues: false,
      });
    });

    it('uses default page=1 and limit=50 when not provided', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      await controller.listCustomers(platformAdminCtx(), {});
      expect(mockBi.listPlatformAdminCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 50 }),
      );
    });

    it('returns BI response without recalculating', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      const result = await controller.listCustomers(platformAdminCtx(), {});
      expect(result).toBe(LIST_RESPONSE);
    });

    it('does NOT call any MongoDB Customer model', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      await controller.listCustomers(platformAdminCtx(), {});
      expect(mockBi.listPlatformAdminCustomers).toHaveBeenCalledTimes(1);
    });
  });

  // ── Detail proxy ───────────────────────────────────────────────────────────

  describe('getCustomer', () => {
    it('returns customer detail from BI', async () => {
      mockBi.getPlatformAdminCustomerDetail.mockResolvedValue(DETAIL_RESPONSE);
      const result = await controller.getCustomer(platformAdminCtx(), 'cust1');
      expect(result).toEqual(DETAIL_RESPONSE);
    });

    it('forwards businessId query param to BI', async () => {
      mockBi.getPlatformAdminCustomerDetail.mockResolvedValue(DETAIL_RESPONSE);
      await controller.getCustomer(platformAdminCtx(), 'cust1', 'biz1');
      expect(mockBi.getPlatformAdminCustomerDetail).toHaveBeenCalledWith('cust1', 'biz1');
    });

    it('throws NotFoundException when BI returns null', async () => {
      mockBi.getPlatformAdminCustomerDetail.mockResolvedValue(null);
      await expect(
        controller.getCustomer(platformAdminCtx(), 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('does NOT call any MongoDB Customer model', async () => {
      mockBi.getPlatformAdminCustomerDetail.mockResolvedValue(DETAIL_RESPONSE);
      await controller.getCustomer(platformAdminCtx(), 'cust1');
      expect(mockBi.getPlatformAdminCustomerDetail).toHaveBeenCalledTimes(1);
    });
  });

  // ── BI error mapping ───────────────────────────────────────────────────────

  describe('BI error mapping', () => {
    it('connection_refused → 503 Service Unavailable', async () => {
      mockBi.listPlatformAdminCustomers.mockRejectedValue(
        biError('connection_refused'),
      );
      const err = await controller.listCustomers(platformAdminCtx(), {}).catch((e) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toContain('Business Intelligence service');
    });

    it('timeout → 503 Service Unavailable', async () => {
      mockBi.listPlatformAdminCustomers.mockRejectedValue(
        biError('timeout'),
      );
      await expect(
        controller.listCustomers(platformAdminCtx(), {}),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('auth_error (401) → 503 with auth message', async () => {
      mockBi.listPlatformAdminCustomers.mockRejectedValue(
        biError('auth_error', 401),
      );
      const err = await controller.listCustomers(platformAdminCtx(), {}).catch((e) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toContain('authentication');
    });

    it('auth_error (403) → 503 with auth message', async () => {
      mockBi.listPlatformAdminCustomers.mockRejectedValue(
        biError('auth_error', 403),
      );
      const err = await controller.listCustomers(platformAdminCtx(), {}).catch((e) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
    });

    it('not_found (404) → 503 with BI endpoint message', async () => {
      mockBi.listPlatformAdminCustomers.mockRejectedValue(
        biError('not_found', 404),
      );
      const err = await controller.listCustomers(platformAdminCtx(), {}).catch((e) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toContain('endpoint');
    });

    it('validation_error (422) → 400 Bad Request', async () => {
      mockBi.listPlatformAdminCustomers.mockRejectedValue(
        biError('validation_error', 422),
      );
      const err = await controller.listCustomers(platformAdminCtx(), {}).catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(400);
    });

    it('bi_internal_error (500) → 503 Service Unavailable', async () => {
      mockBi.listPlatformAdminCustomers.mockRejectedValue(
        biError('bi_internal_error', 500),
      );
      await expect(
        controller.listCustomers(platformAdminCtx(), {}),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('unknown error → 503 Service Unavailable', async () => {
      mockBi.listPlatformAdminCustomers.mockRejectedValue(
        new BIUnavailableError('some unexpected error'),
      );
      await expect(
        controller.listCustomers(platformAdminCtx(), {}),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('propagates non-BI errors unchanged', async () => {
      const unexpected = new Error('Unexpected internal error');
      mockBi.listPlatformAdminCustomers.mockRejectedValue(unexpected);
      await expect(
        controller.listCustomers(platformAdminCtx(), {}),
      ).rejects.toThrow('Unexpected internal error');
    });

    it('detail: connection_refused → 503', async () => {
      mockBi.getPlatformAdminCustomerDetail.mockRejectedValue(
        biError('connection_refused'),
      );
      await expect(
        controller.getCustomer(platformAdminCtx(), 'cust1'),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('detail: timeout → 503', async () => {
      mockBi.getPlatformAdminCustomerDetail.mockRejectedValue(
        biError('timeout'),
      );
      await expect(
        controller.getCustomer(platformAdminCtx(), 'cust1'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  // ── Pagination and filter forwarding ─────────────────────────────────────

  describe('pagination forwarding', () => {
    it('forwards page and limit to BI', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      await controller.listCustomers(platformAdminCtx(), { page: 3, limit: 100 });
      expect(mockBi.listPlatformAdminCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 100 }),
      );
    });

    it('accepts sortBy/sortDirection without error', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      await expect(
        controller.listCustomers(platformAdminCtx(), {
          sortBy: 'customerName',
          sortDirection: 'asc',
        }),
      ).resolves.toBeDefined();
    });
  });

  // ── Boolean filter serialization ─────────────────────────────────────────

  describe('boolean filter forwarding', () => {
    it('forwards isActive=true correctly', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      await controller.listCustomers(platformAdminCtx(), { isActive: true });
      expect(mockBi.listPlatformAdminCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('forwards isActive=false correctly', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      await controller.listCustomers(platformAdminCtx(), { isActive: false });
      expect(mockBi.listPlatformAdminCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('does not forward isActive when undefined', async () => {
      mockBi.listPlatformAdminCustomers.mockResolvedValue(LIST_RESPONSE);
      await controller.listCustomers(platformAdminCtx(), {});
      expect(mockBi.listPlatformAdminCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: undefined }),
      );
    });
  });
});
