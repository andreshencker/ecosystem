import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';

import { CompanyDeletionService } from '../company-deletion.service';
import { Company } from '../schemas/company.schema';
import { CompanyTheme } from '../../company-theme/schemas/company-theme.schema';
import { LayoutTemplate } from '../../../notifications/template/layout-templates/schemas/layout-template.schema';
import { CompanyIntegration } from '../../integrations/schemas/company-integration.schema';
import { CompanyChannelProvider } from '../../../channels/company-channel-providers/schemas/company-channel-provider.schema';
import { ProviderCredentials } from '../../../channels/provider-credentials/schemas/provider-credentials.schema';
import { DomainCatalogue } from '../../../notifications/events/domain-catalogue/schemas/domain-catalogue.schema';
import { EventCatalogue } from '../../../notifications/events/event-catalogue/schemas/event-catalogue.schema';
import { NotificationExecutionLog } from '../../../notifications/execution-log/schemas/execution-log.schema';
import { CompanySmtp } from '../../../../company/schemas/company-smtp.schema';
import { Invitation } from '../../../../user-invitations/schemas/invitation.schema';
import { User } from '../../../../users/schemas/user.schema';
import { RefreshToken } from '../../../../auth/schemas/refresh-token.schema';
import { Types } from 'mongoose';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId();
const THEME_ID = new Types.ObjectId();
const CCP_ID = new Types.ObjectId();
const DOMAIN_ID = new Types.ObjectId();
const USER_ID = new Types.ObjectId();

const baseCompany = {
  _id: COMPANY_ID,
  companyKey: 'acme',
  displayName: 'Acme Corp',
  isPlatformCompany: false,
};

// ─── Mock factory helpers ─────────────────────────────────────────────────────

function makeMockSession(overrides: Partial<any> = {}) {
  return {
    withTransaction: jest
      .fn()
      .mockImplementation(async (fn: () => Promise<void>) => fn()),
    endSession: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * A minimal Mongoose model mock that covers every method used by
 * CompanyDeletionService. Pass overrides to adjust specific methods per test.
 */
function buildModelMock(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    // findOne — returns chain with .lean()
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
    // find — returns chain with .distinct()
    find: jest.fn().mockReturnValue({
      distinct: jest.fn().mockResolvedValue([]),
    }),
    findOneAndDelete: jest.fn().mockResolvedValue(null),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    countDocuments: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

// ─── Module builder ───────────────────────────────────────────────────────────

interface ModelMocks {
  companyModel: ReturnType<typeof buildModelMock>;
  themeModel: ReturnType<typeof buildModelMock>;
  layoutModel: ReturnType<typeof buildModelMock>;
  integrationModel: ReturnType<typeof buildModelMock>;
  ccpModel: ReturnType<typeof buildModelMock>;
  credModel: ReturnType<typeof buildModelMock>;
  domainModel: ReturnType<typeof buildModelMock>;
  eventModel: ReturnType<typeof buildModelMock>;
  logModel: ReturnType<typeof buildModelMock>;
  smtpModel: ReturnType<typeof buildModelMock>;
  invitationModel: ReturnType<typeof buildModelMock>;
  userModel: ReturnType<typeof buildModelMock>;
  tokenModel: ReturnType<typeof buildModelMock>;
}

async function buildModule(
  mocks: Partial<ModelMocks> = {},
  session = makeMockSession(),
): Promise<{
  service: CompanyDeletionService;
  models: ModelMocks;
  session: ReturnType<typeof makeMockSession>;
}> {
  // Company model needs a db.startSession mock in addition to the base mock
  const companyBase = mocks.companyModel ?? buildModelMock();
  const companyModel = {
    ...companyBase,
    db: { startSession: jest.fn().mockResolvedValue(session) },
  };

  const models: ModelMocks = {
    companyModel,
    themeModel: mocks.themeModel ?? buildModelMock(),
    layoutModel: mocks.layoutModel ?? buildModelMock(),
    integrationModel: mocks.integrationModel ?? buildModelMock(),
    ccpModel: mocks.ccpModel ?? buildModelMock(),
    credModel: mocks.credModel ?? buildModelMock(),
    domainModel: mocks.domainModel ?? buildModelMock(),
    eventModel: mocks.eventModel ?? buildModelMock(),
    logModel: mocks.logModel ?? buildModelMock(),
    smtpModel: mocks.smtpModel ?? buildModelMock(),
    invitationModel: mocks.invitationModel ?? buildModelMock(),
    userModel: mocks.userModel ?? buildModelMock(),
    tokenModel: mocks.tokenModel ?? buildModelMock(),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CompanyDeletionService,
      { provide: getModelToken(Company.name), useValue: models.companyModel },
      {
        provide: getModelToken(CompanyTheme.name),
        useValue: models.themeModel,
      },
      {
        provide: getModelToken(LayoutTemplate.name),
        useValue: models.layoutModel,
      },
      {
        provide: getModelToken(CompanyIntegration.name),
        useValue: models.integrationModel,
      },
      {
        provide: getModelToken(CompanyChannelProvider.name),
        useValue: models.ccpModel,
      },
      {
        provide: getModelToken(ProviderCredentials.name),
        useValue: models.credModel,
      },
      {
        provide: getModelToken(DomainCatalogue.name),
        useValue: models.domainModel,
      },
      {
        provide: getModelToken(EventCatalogue.name),
        useValue: models.eventModel,
      },
      {
        provide: getModelToken(NotificationExecutionLog.name),
        useValue: models.logModel,
      },
      { provide: getModelToken(CompanySmtp.name), useValue: models.smtpModel },
      {
        provide: getModelToken(Invitation.name),
        useValue: models.invitationModel,
      },
      { provide: getModelToken(User.name), useValue: models.userModel },
      {
        provide: getModelToken(RefreshToken.name),
        useValue: models.tokenModel,
      },
    ],
  }).compile();

  return { service: module.get(CompanyDeletionService), models, session };
}

/** Wire a company model mock that resolves to the given company document. */
function companyModelWith(doc: object | null) {
  return buildModelMock({
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(doc),
    }),
  });
}

/**
 * Wire all `find().distinct()` mocks to return the provided ids, then wire
 * every `deleteMany`/`deleteOne` to return a realistic deletedCount.
 */
function fullyPopulatedMocks(): ModelMocks {
  const themeModel = buildModelMock({
    find: jest
      .fn()
      .mockReturnValue({ distinct: jest.fn().mockResolvedValue([THEME_ID]) }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
    countDocuments: jest.fn().mockResolvedValue(2),
  });
  const ccpModel = buildModelMock({
    find: jest
      .fn()
      .mockReturnValue({ distinct: jest.fn().mockResolvedValue([CCP_ID]) }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 3 }),
    countDocuments: jest.fn().mockResolvedValue(3),
  });
  const domainModel = buildModelMock({
    find: jest
      .fn()
      .mockReturnValue({ distinct: jest.fn().mockResolvedValue([DOMAIN_ID]) }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 4 }),
    countDocuments: jest.fn().mockResolvedValue(4),
  });
  const userModel = buildModelMock({
    find: jest
      .fn()
      .mockReturnValue({ distinct: jest.fn().mockResolvedValue([USER_ID]) }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }),
    countDocuments: jest.fn().mockResolvedValue(5),
  });

  return {
    companyModel: companyModelWith(baseCompany),
    themeModel,
    layoutModel: buildModelMock({
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(1),
    }),
    integrationModel: buildModelMock({
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      countDocuments: jest.fn().mockResolvedValue(2),
    }),
    ccpModel,
    credModel: buildModelMock({
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 3 }),
      countDocuments: jest.fn().mockResolvedValue(3),
    }),
    domainModel,
    eventModel: buildModelMock({
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 6 }),
      countDocuments: jest.fn().mockResolvedValue(6),
    }),
    logModel: buildModelMock({
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 134 }),
      countDocuments: jest.fn().mockResolvedValue(134),
    }),
    smtpModel: buildModelMock({
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(1),
    }),
    invitationModel: buildModelMock({
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 9 }),
      countDocuments: jest.fn().mockResolvedValue(9),
    }),
    userModel,
    tokenModel: buildModelMock({
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 8 }),
      countDocuments: jest.fn().mockResolvedValue(8),
    }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CompanyDeletionService', () => {
  // ── Validation ───────────────────────────────────────────────────────────────

  describe('validateCompany', () => {
    it('throws NotFoundException when the company does not exist', async () => {
      const { service } = await buildModule({
        companyModel: companyModelWith(null),
      });

      await expect(service.deleteCompany('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when trying to delete the modules company', async () => {
      const { service } = await buildModule({
        companyModel: companyModelWith({
          ...baseCompany,
          isPlatformCompany: true,
        }),
      });

      await expect(service.deleteCompany('grapifly')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('proceeds normally for a regular company', async () => {
      const { service } = await buildModule({
        companyModel: companyModelWith(baseCompany),
      });

      const result = await service.deleteCompany('acme');

      expect(result.deleted).toBe(true);
      expect(result.companyKey).toBe('acme');
    });
  });

  // ── Dry-run mode ──────────────────────────────────────────────────────────────

  describe('dryRun mode', () => {
    it('returns dryRun: true and deleted: false', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      const result = await service.deleteCompany('acme', { dryRun: true });

      expect(result.dryRun).toBe(true);
      expect(result.deleted).toBe(false);
    });

    it('does NOT call any deleteMany or deleteOne', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      await service.deleteCompany('acme', { dryRun: true });

      const allMutatingModels = [
        mocks.themeModel,
        mocks.layoutModel,
        mocks.integrationModel,
        mocks.ccpModel,
        mocks.credModel,
        mocks.domainModel,
        mocks.eventModel,
        mocks.logModel,
        mocks.smtpModel,
        mocks.invitationModel,
        mocks.userModel,
        mocks.tokenModel,
      ];
      for (const m of allMutatingModels) {
        expect(m.deleteMany).not.toHaveBeenCalled();
        expect(m.deleteOne).not.toHaveBeenCalled();
      }
    });

    it('does NOT start a transaction', async () => {
      const session = makeMockSession();
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks, session);

      await service.deleteCompany('acme', { dryRun: true });

      expect(session.withTransaction).not.toHaveBeenCalled();
    });

    it('returns correct counts from countDocuments', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      const result = await service.deleteCompany('acme', { dryRun: true });

      expect(result.summary.company_themes).toBe(2);
      expect(result.summary.company_integrations).toBe(2);
      expect(result.summary.company_channel_providers).toBe(3);
      expect(result.summary.domain_catalogues).toBe(4);
      expect(result.summary.users).toBe(5);
      expect(result.summary.layout_templates).toBe(1);
      expect(result.summary.provider_credentials).toBe(3);
      expect(result.summary.event_catalogue).toBe(6);
      expect(result.summary.notification_execution_logs).toBe(134);
      expect(result.summary.company_smtp).toBe(1);
      expect(result.summary.invitations).toBe(9);
      expect(result.summary.refresh_tokens).toBe(8);
    });

    it('returns totalDocuments as the sum of all counts', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      const result = await service.deleteCompany('acme', { dryRun: true });

      const expected = Object.values(result.summary).reduce((a, n) => a + n, 0);
      expect(result.totalDocuments).toBe(expected);
    });

    it('returns 0 for second-level collections when there are no intermediate IDs', async () => {
      const { service } = await buildModule({
        companyModel: companyModelWith(baseCompany),
        // theme/ccp/domain/user mocks have find().distinct() returning [] by default
      });

      const result = await service.deleteCompany('acme', { dryRun: true });

      expect(result.summary.layout_templates).toBe(0);
      expect(result.summary.provider_credentials).toBe(0);
      expect(result.summary.event_catalogue).toBe(0);
      expect(result.summary.refresh_tokens).toBe(0);
    });
  });

  // ── Actual deletion ───────────────────────────────────────────────────────────

  describe('actual deletion', () => {
    it('starts a MongoDB session and commits via withTransaction', async () => {
      const session = makeMockSession();
      const mocks = fullyPopulatedMocks();
      // buildModule returns `models` which contains the companyModel that has `db`
      const { service, models: resolvedModels } = await buildModule(
        mocks,
        session,
      );

      await service.deleteCompany('acme');

      expect(
        (resolvedModels.companyModel as any).db.startSession,
      ).toHaveBeenCalled();
      expect(session.withTransaction).toHaveBeenCalledTimes(1);
    });

    it('calls session.endSession() even on success', async () => {
      const session = makeMockSession();
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks, session);

      await service.deleteCompany('acme');

      expect(session.endSession).toHaveBeenCalled();
    });

    it('returns deleted: true with correct companyKey', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      const result = await service.deleteCompany('acme');

      expect(result.deleted).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(result.companyKey).toBe('acme');
    });

    it('returns summary with counts from deleteMany results', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      const result = await service.deleteCompany('acme');

      expect(result.summary.company_themes).toBe(2);
      expect(result.summary.layout_templates).toBe(1);
      expect(result.summary.company_integrations).toBe(2);
      expect(result.summary.company_channel_providers).toBe(3);
      expect(result.summary.provider_credentials).toBe(3);
      expect(result.summary.domain_catalogues).toBe(4);
      expect(result.summary.event_catalogue).toBe(6);
      expect(result.summary.notification_execution_logs).toBe(134);
      expect(result.summary.company_smtp).toBe(1);
      expect(result.summary.invitations).toBe(9);
      expect(result.summary.users).toBe(5);
      expect(result.summary.refresh_tokens).toBe(8);
    });

    it('totalDocuments equals sum of all summary values', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      const result = await service.deleteCompany('acme');

      const expected = Object.values(result.summary).reduce((a, n) => a + n, 0);
      expect(result.totalDocuments).toBe(expected);
    });

    it('calls findOneAndDelete on the company document as the final write', async () => {
      const callOrder: string[] = [];

      const mocks = fullyPopulatedMocks();

      // Override deleteMany/deleteOne to track call order
      mocks.logModel.deleteMany.mockImplementation(async () => {
        callOrder.push('logs');
        return { deletedCount: 0 };
      });
      mocks.themeModel.deleteMany.mockImplementation(async () => {
        callOrder.push('themes');
        return { deletedCount: 0 };
      });
      mocks.userModel.deleteMany.mockImplementation(async () => {
        callOrder.push('users');
        return { deletedCount: 0 };
      });
      mocks.companyModel.findOneAndDelete = jest
        .fn()
        .mockImplementation(async () => {
          callOrder.push('company');
          return null;
        });

      const { service } = await buildModule(mocks);
      await service.deleteCompany('acme');

      // Company document must be the very last write
      expect(callOrder[callOrder.length - 1]).toBe('company');
      // Logs are deleted before themes (Phase 3 order)
      expect(callOrder.indexOf('logs')).toBeLessThan(
        callOrder.indexOf('themes'),
      );
      // Users are deleted before company
      expect(callOrder.indexOf('users')).toBeLessThan(
        callOrder.indexOf('company'),
      );
    });

    it('deletes second-level children before their parent collections', async () => {
      const callOrder: string[] = [];

      const mocks = fullyPopulatedMocks();

      mocks.layoutModel.deleteMany.mockImplementation(async () => {
        callOrder.push('layouts');
        return { deletedCount: 0 };
      });
      mocks.themeModel.deleteMany.mockImplementation(async () => {
        callOrder.push('themes');
        return { deletedCount: 0 };
      });
      mocks.credModel.deleteMany.mockImplementation(async () => {
        callOrder.push('credentials');
        return { deletedCount: 0 };
      });
      mocks.ccpModel.deleteMany.mockImplementation(async () => {
        callOrder.push('ccps');
        return { deletedCount: 0 };
      });
      mocks.eventModel.deleteMany.mockImplementation(async () => {
        callOrder.push('events');
        return { deletedCount: 0 };
      });
      mocks.domainModel.deleteMany.mockImplementation(async () => {
        callOrder.push('domains');
        return { deletedCount: 0 };
      });
      mocks.tokenModel.deleteMany.mockImplementation(async () => {
        callOrder.push('tokens');
        return { deletedCount: 0 };
      });
      mocks.userModel.deleteMany.mockImplementation(async () => {
        callOrder.push('users');
        return { deletedCount: 0 };
      });

      const { service } = await buildModule(mocks);
      await service.deleteCompany('acme');

      expect(callOrder.indexOf('layouts')).toBeLessThan(
        callOrder.indexOf('themes'),
      );
      expect(callOrder.indexOf('credentials')).toBeLessThan(
        callOrder.indexOf('ccps'),
      );
      expect(callOrder.indexOf('events')).toBeLessThan(
        callOrder.indexOf('domains'),
      );
      expect(callOrder.indexOf('tokens')).toBeLessThan(
        callOrder.indexOf('users'),
      );
    });

    it('skips $in deleteMany when intermediate ID arrays are empty', async () => {
      // Default mocks have find().distinct() returning [] (empty arrays)
      const { service, models } = await buildModule({
        companyModel: companyModelWith(baseCompany),
      });

      await service.deleteCompany('acme');

      // These models have no IDs to $in on — deleteMany must NOT be called
      expect(models.layoutModel.deleteMany).not.toHaveBeenCalled();
      expect(models.credModel.deleteMany).not.toHaveBeenCalled();
      expect(models.eventModel.deleteMany).not.toHaveBeenCalled();
      expect(models.tokenModel.deleteMany).not.toHaveBeenCalled();
    });

    it('never deletes platform_admin users', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      await service.deleteCompany('acme');

      // The deleteMany filter must include role: { $ne: 'platform_admin' }
      const [filter] = mocks.userModel.deleteMany.mock.calls[0] as [any, any];
      expect(filter).toMatchObject({ role: { $ne: 'platform_admin' } });
    });

    it('queries users with role $ne platform_admin during collectDependencies', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      await service.deleteCompany('acme');

      // collectDependencies uses find().distinct() on the user model
      const [filter] = mocks.userModel.find.mock.calls[0] as [any];
      expect(filter).toMatchObject({ role: { $ne: 'platform_admin' } });
    });
  });

  // ── Transaction rollback ──────────────────────────────────────────────────────

  describe('transaction rollback', () => {
    it('propagates the error when a deleteMany fails inside the transaction', async () => {
      const mocks = fullyPopulatedMocks();
      mocks.themeModel.deleteMany = jest
        .fn()
        .mockRejectedValue(new Error('Simulated MongoDB write failure'));

      const { service } = await buildModule(mocks);

      await expect(service.deleteCompany('acme')).rejects.toThrow(
        'Simulated MongoDB write failure',
      );
    });

    it('calls session.endSession() even when the transaction throws', async () => {
      const session = makeMockSession({
        withTransaction: jest.fn().mockRejectedValue(new Error('tx aborted')),
      });

      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks, session);

      await expect(service.deleteCompany('acme')).rejects.toThrow('tx aborted');

      expect(session.endSession).toHaveBeenCalled();
    });

    it('does not call findOneAndDelete on the company when a prior step fails', async () => {
      const mocks = fullyPopulatedMocks();
      // Make layout deletion throw so the transaction aborts before the company doc is touched
      mocks.layoutModel.deleteMany = jest
        .fn()
        .mockRejectedValue(new Error('layout failure'));

      const { service } = await buildModule(mocks);

      await expect(service.deleteCompany('acme')).rejects.toThrow();

      expect(mocks.companyModel.findOneAndDelete).not.toHaveBeenCalled();
    });
  });

  // ── SMTP uses string companyId ─────────────────────────────────────────────────

  describe('string-typed companyId fields', () => {
    it('queries company_smtp with companyId as a string', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      await service.deleteCompany('acme');

      const [filter] = mocks.smtpModel.deleteOne.mock.calls[0] as [any, any];
      expect(typeof filter.companyId).toBe('string');
      expect(filter.companyId).toBe(COMPANY_ID.toString());
    });

    it('queries invitations with companyId as a string', async () => {
      const mocks = fullyPopulatedMocks();
      const { service } = await buildModule(mocks);

      await service.deleteCompany('acme');

      const [filter] = mocks.invitationModel.deleteMany.mock.calls[0] as [
        any,
        any,
      ];
      expect(typeof filter.companyId).toBe('string');
      expect(filter.companyId).toBe(COMPANY_ID.toString());
    });
  });
});
