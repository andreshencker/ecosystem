import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PlatformAdminContractsController } from '../platform-admin-contracts.controller';
import { BusinessIntelligenceService } from '../../../integrations/business-intelligence/business-intelligence.service';
import { BIUnavailableError } from '../../../integrations/business-intelligence/errors/bi-unavailable.error';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

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

const SUMMARY_RESPONSE = {
  businessId: null,
  totalContracts: 10,
  activeContracts: 7,
  inactiveContracts: 1,
  finishedContracts: 1,
  cancelledContracts: 1,
  openEndedContracts: 4,
  contractsWithEndDate: 6,
  contractsWithGst: 3,
  contractsWithSuperannuation: 2,
  contractsWithHolidayRules: 2,
  contractsWithPaymentCalendar: 1,
  contractsMissingCustomer: 0,
  contractsMissingRateConfig: 0,
  completeContracts: 8,
  warningContracts: 1,
  invalidContracts: 1,
  activeContractRate: 0.7,
  openEndedContractRate: 0.4,
  configurationCompletionRate: 0.8,
  configurationWarningRate: 0.1,
  configurationInvalidRate: 0.1,
  holidayCalendarCoverage: 1.0,
  paymentCalendarCoverage: 1.0,
  gstConfigurationValidity: 1.0,
  superannuationConfigurationValidity: 1.0,
  datasetVersion: '1.0',
  calculatedAt: '2026-07-18T00:00:00Z',
};

const LIST_RESPONSE = {
  businessId: null,
  items: [
    {
      contractId: 'c1',
      businessId: 'biz1',
      businessName: 'Acme Corp',
      customerId: 'cust1',
      customerName: 'John Doe',
      positionName: 'Developer',
      invoiceDescription: 'Dev services',
      workType: 'contractor',
      status: 'active',
      startDate: '2026-01-01',
      endDate: null,
      isOpenEnded: true,
      billingCycle: 'per_shift',
      paymentScheduleMode: 'terms',
      paymentTermsDays: 14,
      scheduledPaymentDay: null,
      rateType: 'fixed',
      minHourlyRate: 95,
      maxHourlyRate: 95,
      minimumHours: 4,
      defaultBreakMinutes: 30,
      currency: 'AUD',
      chargeGst: false,
      gstRate: null,
      holidayRulesEnabled: false,
      holidayCalendarId: null,
      holidayCalendarName: null,
      holidayBehaviour: null,
      holidayCalendarStatus: 'unknown',
      paymentCalendarEnabled: false,
      paymentCalendarId: null,
      paymentCalendarStatus: 'unknown',
      superannuationEnabled: false,
      superannuationRate: null,
      superannuationPaymentFrequency: null,
      configurationStatus: 'complete',
      supportIssueCount: 0,
      supportIssueCodes: [],
      sourceCreatedAt: '2026-01-01T00:00:00Z',
      sourceUpdatedAt: '2026-06-01T00:00:00Z',
      syncedAt: '2026-06-02T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
  datasetVersion: '1.0',
  calculatedAt: '2026-07-18T00:00:00Z',
};

const DETAIL_RESPONSE = {
  ...LIST_RESPONSE.items[0],
  supportIssues: [],
};

const ISSUES_RESPONSE = {
  contractId: 'c1',
  configurationStatus: 'complete',
  supportIssueCount: 0,
  supportIssues: [],
  calculatedAt: '2026-07-18T00:00:00Z',
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
  getContractAdminSummary: jest.fn(),
  listPlatformAdminContracts: jest.fn(),
  getPlatformAdminContractDetail: jest.fn(),
  getPlatformAdminContractSupportIssues: jest.fn(),
};

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [PlatformAdminContractsController],
    providers: [
      { provide: BusinessIntelligenceService, useValue: mockBi },
    ],
  }).compile();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PlatformAdminContractsController', () => {
  let controller: PlatformAdminContractsController;

  beforeEach(async () => {
    const module = await buildModule();
    controller = module.get(PlatformAdminContractsController);
    jest.clearAllMocks();
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  describe('authorization', () => {
    it('allows platform_admin to get summary', async () => {
      mockBi.getContractAdminSummary.mockResolvedValue(SUMMARY_RESPONSE);
      const result = await controller.getSummary(platformAdminCtx(), {});
      expect(result).toEqual(SUMMARY_RESPONSE);
    });

    it('rejects business_owner with 403 on summary', async () => {
      await expect(
        controller.getSummary(businessUserCtx(), {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects business_admin with 403 on summary', async () => {
      await expect(
        controller.getSummary({ ...businessUserCtx(), role: 'business_admin' }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects accountant with 403 on list', async () => {
      await expect(
        controller.listContracts({ ...businessUserCtx(), role: 'accountant' }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects staff with 403 on list', async () => {
      await expect(
        controller.listContracts({ ...businessUserCtx(), role: 'staff' }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows platform_admin to list contracts', async () => {
      mockBi.listPlatformAdminContracts.mockResolvedValue(LIST_RESPONSE);
      const result = await controller.listContracts(platformAdminCtx(), {});
      expect(result).toEqual(LIST_RESPONSE);
    });

    it('allows platform_admin to get detail', async () => {
      mockBi.getPlatformAdminContractDetail.mockResolvedValue(DETAIL_RESPONSE);
      const result = await controller.getContract(platformAdminCtx(), 'c1');
      expect(result).toEqual(DETAIL_RESPONSE);
    });

    it('rejects business_owner with 403 on detail', async () => {
      await expect(
        controller.getContract(businessUserCtx(), 'c1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows platform_admin to get issues', async () => {
      mockBi.getPlatformAdminContractSupportIssues.mockResolvedValue(ISSUES_RESPONSE);
      const result = await controller.getContractIssues(platformAdminCtx(), 'c1');
      expect(result).toEqual(ISSUES_RESPONSE);
    });

    it('rejects business_owner with 403 on issues', async () => {
      await expect(
        controller.getContractIssues(businessUserCtx(), 'c1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── Summary proxy ──────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('forwards businessId and status to BI', async () => {
      mockBi.getContractAdminSummary.mockResolvedValue(SUMMARY_RESPONSE);
      await controller.getSummary(platformAdminCtx(), {
        businessId: 'biz1',
        status: 'active',
      });
      expect(mockBi.getContractAdminSummary).toHaveBeenCalledWith({
        businessId: 'biz1',
        status: 'active',
        createdFrom: undefined,
        createdTo: undefined,
      });
    });

    it('does not calculate any metrics — returns BI response directly', async () => {
      mockBi.getContractAdminSummary.mockResolvedValue(SUMMARY_RESPONSE);
      const result = await controller.getSummary(platformAdminCtx(), {});
      expect(result).toStrictEqual(SUMMARY_RESPONSE);
      expect(result).toHaveProperty('configurationCompletionRate');
      expect(result).toHaveProperty('holidayCalendarCoverage');
    });
  });

  // ── List proxy ─────────────────────────────────────────────────────────────

  describe('listContracts', () => {
    it('forwards all supported filters to BI', async () => {
      mockBi.listPlatformAdminContracts.mockResolvedValue(LIST_RESPONSE);
      await controller.listContracts(platformAdminCtx(), {
        businessId: 'biz1',
        page: 2,
        limit: 25,
        search: 'developer',
        status: 'active',
        workType: 'contractor',
        billingCycle: 'weekly',
        currency: 'AUD',
        configurationStatus: 'invalid',
        chargeGst: true,
        superEnabled: false,
        holidayRulesEnabled: true,
        paymentCalendarEnabled: false,
        updatedFrom: '2026-01-01',
        updatedTo: '2026-12-31',
        sortBy: 'source_updated_at',
        sortDir: 'desc',
      });
      expect(mockBi.listPlatformAdminContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'biz1',
          page: 2,
          limit: 25,
          search: 'developer',
          status: 'active',
          workType: 'contractor',
          billingCycle: 'weekly',
          currency: 'AUD',
          configurationStatus: 'invalid',
          chargeGst: true,
          superEnabled: false,
          holidayRulesEnabled: true,
          paymentCalendarEnabled: false,
          updatedFrom: '2026-01-01',
          updatedTo: '2026-12-31',
          sortBy: 'source_updated_at',
          sortDir: 'desc',
        }),
      );
    });

    it('defaults to page=1, limit=50 when not provided', async () => {
      mockBi.listPlatformAdminContracts.mockResolvedValue(LIST_RESPONSE);
      await controller.listContracts(platformAdminCtx(), {});
      expect(mockBi.listPlatformAdminContracts).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 50 }),
      );
    });

    it('cross-tenant when businessId omitted', async () => {
      mockBi.listPlatformAdminContracts.mockResolvedValue(LIST_RESPONSE);
      await controller.listContracts(platformAdminCtx(), {});
      expect(mockBi.listPlatformAdminContracts).toHaveBeenCalledWith(
        expect.objectContaining({ businessId: undefined }),
      );
    });

    it('does not alter BI response', async () => {
      mockBi.listPlatformAdminContracts.mockResolvedValue(LIST_RESPONSE);
      const result = await controller.listContracts(platformAdminCtx(), {});
      expect(result).toStrictEqual(LIST_RESPONSE);
    });

    it('does not query MongoDB — all data from BI', async () => {
      mockBi.listPlatformAdminContracts.mockResolvedValue(LIST_RESPONSE);
      await controller.listContracts(platformAdminCtx(), {});
      // The mock counts confirm no other service was called
      expect(mockBi.listPlatformAdminContracts).toHaveBeenCalledTimes(1);
      expect(mockBi.getContractAdminSummary).not.toHaveBeenCalled();
      expect(mockBi.getPlatformAdminContractDetail).not.toHaveBeenCalled();
    });
  });

  // ── Detail proxy ───────────────────────────────────────────────────────────

  describe('getContract', () => {
    it('forwards businessId for tenant scoping', async () => {
      mockBi.getPlatformAdminContractDetail.mockResolvedValue(DETAIL_RESPONSE);
      await controller.getContract(platformAdminCtx(), 'c1', 'biz1');
      expect(mockBi.getPlatformAdminContractDetail).toHaveBeenCalledWith('c1', 'biz1');
    });

    it('throws NotFoundException when BI returns null', async () => {
      mockBi.getPlatformAdminContractDetail.mockResolvedValue(null);
      await expect(
        controller.getContract(platformAdminCtx(), 'missing_id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns detail without modification', async () => {
      mockBi.getPlatformAdminContractDetail.mockResolvedValue(DETAIL_RESPONSE);
      const result = await controller.getContract(platformAdminCtx(), 'c1');
      expect(result).toStrictEqual(DETAIL_RESPONSE);
    });
  });

  // ── Issues proxy ───────────────────────────────────────────────────────────

  describe('getContractIssues', () => {
    it('returns issues response from BI', async () => {
      mockBi.getPlatformAdminContractSupportIssues.mockResolvedValue(ISSUES_RESPONSE);
      const result = await controller.getContractIssues(platformAdminCtx(), 'c1');
      expect(result).toStrictEqual(ISSUES_RESPONSE);
    });

    it('throws NotFoundException when BI returns null', async () => {
      mockBi.getPlatformAdminContractSupportIssues.mockResolvedValue(null);
      await expect(
        controller.getContractIssues(platformAdminCtx(), 'missing_id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── BI error mapping ───────────────────────────────────────────────────────

  describe('BI error mapping', () => {
    const errorCases: [BIUnavailableError['category'], number | undefined, typeof ServiceUnavailableException | typeof HttpException][] = [
      ['connection_refused', undefined, ServiceUnavailableException],
      ['timeout', undefined, ServiceUnavailableException],
      ['auth_error', 403, ServiceUnavailableException],
      ['not_found', 404, ServiceUnavailableException],
      ['bi_internal_error', 500, ServiceUnavailableException],
    ];

    for (const [category, statusCode, ExceptionClass] of errorCases) {
      it(`maps ${category} → ${ExceptionClass.name} on list`, async () => {
        mockBi.listPlatformAdminContracts.mockRejectedValue(biError(category, statusCode));
        await expect(
          controller.listContracts(platformAdminCtx(), {}),
        ).rejects.toThrow(ExceptionClass);
      });
    }

    it('maps validation_error → 400 HttpException on list', async () => {
      mockBi.listPlatformAdminContracts.mockRejectedValue(biError('validation_error', 422));
      try {
        await controller.listContracts(platformAdminCtx(), {});
        fail('expected to throw');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(400);
      }
    });

    it('maps connection_refused → 503 on summary', async () => {
      mockBi.getContractAdminSummary.mockRejectedValue(biError('connection_refused'));
      await expect(
        controller.getSummary(platformAdminCtx(), {}),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('maps connection_refused → 503 on detail', async () => {
      mockBi.getPlatformAdminContractDetail.mockRejectedValue(biError('connection_refused'));
      await expect(
        controller.getContract(platformAdminCtx(), 'c1'),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('BI error message is never exposed raw to callers — mapped to friendly message', async () => {
      mockBi.listPlatformAdminContracts.mockRejectedValue(
        biError('bi_internal_error', 500, 'Internal Python traceback XYZ'),
      );
      try {
        await controller.listContracts(platformAdminCtx(), {});
        fail('expected to throw');
      } catch (err: any) {
        const msg = err.getResponse?.()?.message ?? err.message;
        expect(String(msg)).not.toContain('XYZ');
        expect(String(msg)).not.toContain('traceback');
      }
    });
  });
});
