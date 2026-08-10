// src/accounting/providers/xero/xero-organisations.service.spec.ts
//
// Unit tests for XeroOrganisationsService.
//
// All MongoDB calls are mocked — no real database is required.
// Tests verify the security invariants specified in the architecture:
//   - Organisation metadata is company-scoped and connection-scoped.
//   - tenantId is never returned in external responses.
//   - Arbitrary tenant IDs cannot bypass organisation validation.
//   - One OAuth credential can service multiple organisations.
//   - Tokens are NOT duplicated per organisation.
//   - Removed organisations become unavailable without being deleted.

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { XeroOrganisationsService } from './xero-organisations.service';
import { XeroOrganisation } from './schemas/xero-organisation.schema';

// ─── Mock helpers ──────────────────────────────────────────────────────────────

const CRED_ID = new Types.ObjectId().toHexString();
const COMPANY_A = new Types.ObjectId().toHexString();
const COMPANY_B = new Types.ObjectId().toHexString();
const CRED_B = new Types.ObjectId().toHexString();

const ORG_DOC_1 = {
  _id: new Types.ObjectId(),
  credentialId: new Types.ObjectId(CRED_ID),
  companyId: new Types.ObjectId(COMPANY_A),
  tenantId: 'xero-tenant-uuid-1',
  tenantName: 'Acme Ltd',
  tenantType: 'ORGANISATION',
  xeroConnectionId: 'conn-1',
  isAvailable: true,
  isDefault: true,
  discoveredAt: new Date('2024-01-01'),
  lastVerifiedAt: new Date('2024-06-01'),
};

const ORG_DOC_2 = {
  _id: new Types.ObjectId(),
  credentialId: new Types.ObjectId(CRED_ID),
  companyId: new Types.ObjectId(COMPANY_A),
  tenantId: 'xero-tenant-uuid-2',
  tenantName: 'Beta Corp',
  tenantType: 'ORGANISATION',
  xeroConnectionId: 'conn-2',
  isAvailable: true,
  isDefault: false,
  discoveredAt: new Date('2024-01-01'),
  lastVerifiedAt: new Date('2024-06-01'),
};

function makeMockModel(overrides: Partial<any> = {}) {
  return {
    updateOne: jest
      .fn()
      .mockResolvedValue({ modifiedCount: 1, upsertedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('XeroOrganisationsService', () => {
  let service: XeroOrganisationsService;
  let orgModel: ReturnType<typeof makeMockModel>;

  async function createModule(modelOverrides: Partial<any> = {}) {
    orgModel = makeMockModel(modelOverrides);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XeroOrganisationsService,
        {
          provide: getModelToken(XeroOrganisation.name),
          useValue: orgModel,
        },
      ],
    }).compile();

    service = module.get<XeroOrganisationsService>(XeroOrganisationsService);
  }

  beforeEach(async () => {
    await createModule();
  });

  afterEach(() => jest.clearAllMocks());

  // ─── 1. One OAuth connection can expose multiple organisations ────────────────

  describe('saveDiscoveredOrganisations — multiple orgs', () => {
    it('upserts each org separately without duplicating credential tokens', async () => {
      const connections = [
        {
          connectionId: 'conn-1',
          tenantId: 'tid-1',
          tenantType: 'ORGANISATION',
          tenantName: 'Org A',
        },
        {
          connectionId: 'conn-2',
          tenantId: 'tid-2',
          tenantType: 'ORGANISATION',
          tenantName: 'Org B',
        },
        {
          connectionId: 'conn-3',
          tenantId: 'tid-3',
          tenantType: 'ORGANISATION',
          tenantName: 'Org C',
        },
      ];

      await service.saveDiscoveredOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        connections,
      });

      // One updateOne call per org — credential is referenced, not cloned.
      expect(orgModel.updateOne).toHaveBeenCalledTimes(3);

      // Each call uses the SAME credentialId — tokens are NOT duplicated.
      for (const call of orgModel.updateOne.mock.calls) {
        const filter = call[0] as Record<string, unknown>;
        expect(String(filter.credentialId)).toBe(CRED_ID);
      }
    });

    it('auto-selects the only org as default when exactly one is provided', async () => {
      await service.saveDiscoveredOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        connections: [
          {
            connectionId: 'conn-1',
            tenantId: 'tid-1',
            tenantType: 'ORGANISATION',
            tenantName: 'Solo Org',
          },
        ],
      });

      const setPayload = orgModel.updateOne.mock.calls[0][1].$set;
      expect(setPayload.isDefault).toBe(true);
    });

    it('marks only the selected defaultTenantId as default when multiple orgs', async () => {
      const connections = [
        {
          connectionId: 'conn-1',
          tenantId: 'tid-A',
          tenantType: 'ORGANISATION',
          tenantName: 'A',
        },
        {
          connectionId: 'conn-2',
          tenantId: 'tid-B',
          tenantType: 'ORGANISATION',
          tenantName: 'B',
        },
      ];

      await service.saveDiscoveredOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        connections,
        defaultTenantId: 'tid-B',
      });

      // First call: tid-A → not default
      expect(orgModel.updateOne.mock.calls[0][1].$set.isDefault).toBe(false);
      // Second call: tid-B → default
      expect(orgModel.updateOne.mock.calls[1][1].$set.isDefault).toBe(true);
    });
  });

  // ─── 2. Organisation list is company-scoped ───────────────────────────────────

  describe('listOrganisations — company isolation', () => {
    it('passes companyId filter to the query so another company cannot see the orgs', async () => {
      const findMock = jest.fn().mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      });
      orgModel.find = findMock;

      await service.listOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
      });

      const filter = findMock.mock.calls[0][0];
      expect(String(filter.companyId)).toBe(COMPANY_A);
      expect(String(filter.credentialId)).toBe(CRED_ID);
    });

    it('returns an empty list for a company that owns no orgs for this credential', async () => {
      orgModel.find = jest.fn().mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      });

      const result = await service.listOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_B,
      });

      expect(result.organisations).toHaveLength(0);
      expect(result.available).toBe(0);
    });
  });

  // ─── 3. Organisation list is connection-scoped ────────────────────────────────

  describe('listOrganisations — connection isolation', () => {
    it('includes credentialId in the query so orgs from another credential are excluded', async () => {
      const findMock = jest.fn().mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      });
      orgModel.find = findMock;

      await service.listOrganisations({
        credentialId: CRED_B,
        companyId: COMPANY_A,
      });

      const filter = findMock.mock.calls[0][0];
      expect(String(filter.credentialId)).toBe(CRED_B);
    });
  });

  // ─── 4. tenantId is never returned to external callers ───────────────────────

  describe('listOrganisations — tenantId exclusion', () => {
    it('does not return tenantId in the organisation list', async () => {
      orgModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([ORG_DOC_1]),
        }),
      });

      const result = await service.listOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
      });

      expect(result.organisations).toHaveLength(1);
      expect((result.organisations[0] as any).tenantId).toBeUndefined();
    });

    it('exposes a Communications organisation id (not a Xero tenantId) in the id field', async () => {
      orgModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([ORG_DOC_1]),
        }),
      });

      const result = await service.listOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
      });

      // id should be the MongoDB ObjectId (string), not the Xero tenantId
      const org = result.organisations[0];
      expect(org.id).toBe(String(ORG_DOC_1._id));
      expect(org.id).not.toBe(ORG_DOC_1.tenantId);
    });
  });

  // ─── 5. Arbitrary tenant IDs cannot be injected ──────────────────────────────

  describe('resolveOrganisation — injection prevention', () => {
    it('returns null for an invalid (non-ObjectId) organisation ID', async () => {
      const result = await service.resolveOrganisation({
        organisationId: 'arbitrary-xero-tenant-uuid',
        credentialId: CRED_ID,
      });

      expect(result).toBeNull();
      expect(orgModel.findOne).not.toHaveBeenCalled();
    });

    it('returns null for an ObjectId that is not in the database', async () => {
      orgModel.findOne = jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      });

      const result = await service.resolveOrganisation({
        organisationId: new Types.ObjectId().toHexString(),
        credentialId: CRED_ID,
      });

      expect(result).toBeNull();
    });
  });

  // ─── 6. Organisation from another company is rejected ────────────────────────

  describe('resolveOrganisation — company isolation', () => {
    it('includes companyId filter when provided', async () => {
      const findOneMock = jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      });
      orgModel.findOne = findOneMock;

      const orgId = new Types.ObjectId().toHexString();
      await service.resolveOrganisation({
        organisationId: orgId,
        credentialId: CRED_ID,
        companyId: COMPANY_A,
      });

      const filter = findOneMock.mock.calls[0][0];
      expect(filter.companyId).toBeDefined();
      expect(String(filter.companyId)).toBe(COMPANY_A);
    });
  });

  // ─── 7. Organisation from another connection is rejected ─────────────────────

  describe('resolveOrganisation — connection isolation', () => {
    it('includes credentialId filter so orgs from other credentials are rejected', async () => {
      const findOneMock = jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      });
      orgModel.findOne = findOneMock;

      const orgId = new Types.ObjectId().toHexString();
      await service.resolveOrganisation({
        organisationId: orgId,
        credentialId: CRED_ID,
      });

      const filter = findOneMock.mock.calls[0][0];
      expect(String(filter.credentialId)).toBe(CRED_ID);
    });

    it('returns null when the org exists but belongs to a different credential', async () => {
      // Simulate: org found in DB but DB filter (credentialId) would exclude it,
      // so the query returns null.
      orgModel.findOne = jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      });

      const result = await service.resolveOrganisation({
        organisationId: String(ORG_DOC_1._id),
        credentialId: CRED_B, // Different credential
      });

      expect(result).toBeNull();
    });
  });

  // ─── 8. Single-org auto-selection ────────────────────────────────────────────

  describe('saveDiscoveredOrganisations — single org auto-selection', () => {
    it('auto-defaults the org when only one connection is provided', async () => {
      await service.saveDiscoveredOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        connections: [
          {
            connectionId: 'c',
            tenantId: 'tid-only',
            tenantType: 'ORGANISATION',
            tenantName: 'Only Org',
          },
        ],
      });

      const setPayload = orgModel.updateOne.mock.calls[0][1].$set;
      expect(setPayload.isDefault).toBe(true);
    });
  });

  // ─── 9. Multiple-org: only the explicitly selected org is default ─────────────

  describe('saveDiscoveredOrganisations — multi-org explicit selection', () => {
    it('only marks defaultTenantId as default; all others are false', async () => {
      await service.saveDiscoveredOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        connections: [
          {
            connectionId: 'c1',
            tenantId: 'tid-1',
            tenantType: 'ORGANISATION',
            tenantName: 'A',
          },
          {
            connectionId: 'c2',
            tenantId: 'tid-2',
            tenantType: 'ORGANISATION',
            tenantName: 'B',
          },
        ],
        defaultTenantId: 'tid-2',
      });

      const calls = orgModel.updateOne.mock.calls;
      const isDefaultValues = calls.map((c: any) => c[1].$set.isDefault);
      expect(isDefaultValues).toEqual([false, true]);
    });

    it('uses no default (all false) when no defaultTenantId and multiple orgs', async () => {
      await service.saveDiscoveredOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        connections: [
          {
            connectionId: 'c1',
            tenantId: 'tid-1',
            tenantType: 'ORGANISATION',
            tenantName: 'A',
          },
          {
            connectionId: 'c2',
            tenantId: 'tid-2',
            tenantType: 'ORGANISATION',
            tenantName: 'B',
          },
        ],
        // defaultTenantId omitted, multiple orgs → none default
      });

      const calls = orgModel.updateOne.mock.calls;
      const isDefaultValues = calls.map((c: any) => c[1].$set.isDefault);
      expect(isDefaultValues).toEqual([false, false]);
    });
  });

  // ─── 10. Removed organisation becomes unavailable ─────────────────────────────

  describe('reconcileOrganisations — removed org handling', () => {
    it('marks orgs that are no longer in the fresh list as unavailable', async () => {
      orgModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      orgModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { ...ORG_DOC_1, isAvailable: true },
          { ...ORG_DOC_2, isAvailable: false }, // already marked unavailable
        ]),
      });

      const result = await service.reconcileOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        freshConnections: [
          {
            id: 'conn-1',
            authEventId: 'evt-1',
            tenantId: 'tid-1',
            tenantType: 'ORGANISATION',
            tenantName: 'Org A',
            createdDateUtc: '',
            updatedDateUtc: '',
          },
          // tid-2 is absent — it should be marked unavailable
        ],
      });

      // updateMany is called to mark removed orgs unavailable
      expect(orgModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          isAvailable: true,
          tenantId: { $nin: ['tid-1'] },
        }),
        { $set: { isAvailable: false } },
      );

      // Result reflects the reconciled state
      expect(result.discovered).toBe(1);
    });

    it('does not hard-delete removed organisations', async () => {
      // Record any deleteMany call — the service must never call it.
      const deleteMock = jest.fn();
      (orgModel as any).deleteMany = deleteMock;
      orgModel.find = jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      await service.reconcileOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        freshConnections: [] as any[],
      });

      expect(deleteMock).not.toHaveBeenCalled();
    });
  });

  // ─── 11. Organisation refresh reconciles Xero data ───────────────────────────

  describe('reconcileOrganisations — refresh behaviour', () => {
    it('upserts all fresh connections during reconciliation', async () => {
      orgModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      await service.reconcileOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        freshConnections: [
          {
            id: 'conn-new',
            authEventId: 'evt-1',
            tenantId: 'tid-new',
            tenantType: 'ORGANISATION',
            tenantName: 'New Org',
            createdDateUtc: '',
            updatedDateUtc: '',
          },
        ],
      });

      // updateOne should have been called once for the new org
      expect(orgModel.updateOne).toHaveBeenCalledTimes(1);
    });

    it('returns the correct discovered count in the result', async () => {
      orgModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { ...ORG_DOC_1, isAvailable: true },
          { ...ORG_DOC_2, isAvailable: true },
        ]),
      });

      const result = await service.reconcileOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        freshConnections: [
          {
            id: 'conn-1',
            authEventId: 'evt-1',
            tenantId: 'tid-1',
            tenantType: 'ORGANISATION',
            tenantName: 'Org A',
            createdDateUtc: '',
            updatedDateUtc: '',
          },
          {
            id: 'conn-2',
            authEventId: 'evt-2',
            tenantId: 'tid-2',
            tenantType: 'ORGANISATION',
            tenantName: 'Org B',
            createdDateUtc: '',
            updatedDateUtc: '',
          },
        ],
      });

      expect(result.discovered).toBe(2);
      expect(result.nowAvailable).toBe(2);
      expect(result.nowUnavailable).toBe(0);
    });
  });

  // ─── 13. Banking resolves org to internal tenantId ────────────────────────────

  describe('resolveOrganisation — internal tenantId resolution', () => {
    it('returns the internal tenantId for a valid available org', async () => {
      const orgId = String(ORG_DOC_1._id);

      orgModel.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: ORG_DOC_1._id,
            tenantId: ORG_DOC_1.tenantId,
          }),
        }),
      });

      const result = await service.resolveOrganisation({
        organisationId: orgId,
        credentialId: CRED_ID,
      });

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe(ORG_DOC_1.tenantId);
    });

    it('returns null for an unavailable org', async () => {
      // The isAvailable filter in the query means unavailable orgs return null.
      orgModel.findOne = jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      });

      const result = await service.resolveOrganisation({
        organisationId: String(ORG_DOC_1._id),
        credentialId: CRED_ID,
      });

      expect(result).toBeNull();
    });
  });

  // ─── 17. No secrets appear in API responses ───────────────────────────────────

  describe('Security — no secrets in responses', () => {
    it('listOrganisations response objects do not contain accessToken', async () => {
      const docWithToken = {
        ...ORG_DOC_1,
        accessToken: 'secret-should-not-appear',
      };
      orgModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([docWithToken]),
        }),
      });

      const result = await service.listOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
      });

      const org = result.organisations[0] as any;
      expect(org.accessToken).toBeUndefined();
      expect(org.tenantId).toBeUndefined();
    });

    it('listOrganisations response objects do not contain refreshToken', async () => {
      const docWithToken = {
        ...ORG_DOC_1,
        refreshToken: 'rt-should-not-appear',
      };
      orgModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([docWithToken]),
        }),
      });

      const result = await service.listOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
      });

      const org = result.organisations[0] as any;
      expect(org.refreshToken).toBeUndefined();
    });

    it('response status is available or unavailable — never a raw Xero value', async () => {
      orgModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([
              ORG_DOC_1,
              { ...ORG_DOC_2, isAvailable: false },
            ]),
        }),
      });

      const result = await service.listOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
      });

      for (const org of result.organisations) {
        expect(['available', 'unavailable']).toContain(org.status);
      }
    });
  });

  // ─── markAllUnavailable ───────────────────────────────────────────────────────

  describe('markAllUnavailable', () => {
    it('updates all orgs for the credential to isAvailable=false', async () => {
      await service.markAllUnavailable(CRED_ID);

      expect(orgModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ credentialId: expect.any(Types.ObjectId) }),
        { $set: { isAvailable: false } },
      );
    });
  });

  // ─── getDefaultOrganisation ───────────────────────────────────────────────────

  describe('getDefaultOrganisation', () => {
    it('returns null when no default org exists', async () => {
      orgModel.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getDefaultOrganisation(CRED_ID, COMPANY_A);
      expect(result).toBeNull();
    });

    it('returns safe org metadata without tenantId', async () => {
      orgModel.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(ORG_DOC_1),
      });

      const result = await service.getDefaultOrganisation(CRED_ID, COMPANY_A);
      expect(result).not.toBeNull();
      expect((result as any)?.tenantId).toBeUndefined();
      expect(result?.isDefault).toBe(true);
    });
  });

  // ─── Zero-connections edge case ───────────────────────────────────────────────

  describe('saveDiscoveredOrganisations — zero connections', () => {
    it('skips all DB calls and returns early when connections array is empty', async () => {
      await service.saveDiscoveredOrganisations({
        credentialId: CRED_ID,
        companyId: COMPANY_A,
        connections: [],
      });

      expect(orgModel.updateOne).not.toHaveBeenCalled();
    });
  });
});
