import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';

import { LinkedCalendarsService } from '../linked-calendars.service';
import { LinkedCalendar } from '../schemas/linked-calendar.schema';
import { Contract } from '../../contracts/schemas/contract.schema';
import { CommunicationsCalendarClient } from '../clients/communications-calendar.client';
import { CommunicationsClientService } from '../../../integrations/communications/client/communications-client.service';
import { UsersService } from '../../users/users.service';
import { LinkedCalendarMapper } from '../mappers/linked-calendar.mapper';

/** Flush all pending microtasks so fire-and-forget Promises complete before assertions. */
const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPANY_ID = 'company-001';
const OTHER_CO   = 'company-other';
const CONN_ID    = 'conn-icloud-001';
const CAL_WORK   = 'cal-work-id';
const CAL_LASSO  = 'cal-lasso-id';
const USER_ID    = 'user-001';
const ACTOR      = { userId: USER_ID, email: 'owner@example.com', firstName: 'Andres', companyId: COMPANY_ID };

const NOW = new Date('2026-07-10T12:00:00Z');

function makeDoc(overrides: Record<string, any> = {}) {
  return {
    _id:                 'linked-001',
    companyId:           COMPANY_ID,
    connectionId:        CONN_ID,
    providerKey:         'icloud',
    providerDisplayName: 'iCloud Calendar',
    accountIdentifier:   'user@icloud.com',
    externalCalendarId:  CAL_WORK,
    calendarName:        'Work',
    calendarDescription: null,
    timezone:            'Australia/Sydney',
    accessRole:          'read-write',
    isPrimary:           false,
    status:              'active',
    linkedByUserId:      USER_ID,
    createdAt:           NOW,
    updatedAt:           NOW,
    ...overrides,
  };
}

const ACCOUNTS = [{
  connectionId: CONN_ID, providerKey: 'icloud',
  providerDisplayName: 'iCloud Calendar', accountIdentifier: 'user@icloud.com', isActive: true,
}];

const REMOTE_CALS = [
  { externalCalendarId: CAL_WORK,  calendarName: 'Work',          calendarDescription: null,                timezone: 'Australia/Sydney', accessRole: 'read-write', isPrimary: false },
  { externalCalendarId: CAL_LASSO, calendarName: 'LASSO Calendar', calendarDescription: 'External roster', timezone: 'Australia/Sydney', accessRole: 'read-only',  isPrimary: false },
];

// ─── Chainable mock helper ────────────────────────────────────────────────────
// Makes a query object chainable: .select().lean().exec() and .lean().exec()

function chain(resolved: any) {
  const obj: any = {
    lean: () => chain(resolved),
    select: (_fields?: string) => chain(resolved),
    sort:   (_sort?: any) => chain(resolved),
    exec:   () => Promise.resolve(resolved),
  };
  return obj;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LinkedCalendarsService', () => {
  let service: LinkedCalendarsService;
  let calendarClient: jest.Mocked<CommunicationsCalendarClient>;
  let commClient: jest.Mocked<CommunicationsClientService>;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let model: Record<string, jest.Mock>;
  let contractModel: Record<string, jest.Mock>;

  function buildModel(overrides: Record<string, any> = {}): Record<string, jest.Mock> {
    return {
      findOne:          jest.fn().mockImplementation(() => chain(null)),
      find:             jest.fn().mockImplementation(() => chain([])),
      updateOne:        jest.fn().mockReturnValue({ exec: () => Promise.resolve({ modifiedCount: 1 }) }),
      deleteOne:        jest.fn().mockReturnValue({ exec: () => Promise.resolve({ deletedCount: 1 }) }),
      findOneAndUpdate: jest.fn().mockImplementation(() => chain(makeDoc())),
      ...overrides,
    };
  }

  function buildContractModel(overrides: Record<string, any> = {}): Record<string, jest.Mock> {
    return {
      // Default: no contract references this calendar
      findOne: jest.fn().mockImplementation(() => chain(null)),
      ...overrides,
    };
  }

  beforeEach(async () => {
    calendarClient = {
      listCalendarAccounts: jest.fn().mockResolvedValue(ACCOUNTS),
      listCalendars:        jest.fn().mockResolvedValue(REMOTE_CALS),
      getCalendarAccount:   jest.fn().mockResolvedValue(ACCOUNTS[0]),
      resolveConnection:    jest.fn(),
    } as any;

    commClient = { notifyEvent: jest.fn().mockResolvedValue(true) } as any;
    usersService = { getCompanyDisplayName: jest.fn().mockResolvedValue('Acme Corp') };

    model         = buildModel();
    contractModel = buildContractModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkedCalendarsService,
        { provide: getModelToken(LinkedCalendar.name), useValue: model },
        { provide: getModelToken(Contract.name),       useValue: contractModel },
        { provide: CommunicationsCalendarClient,       useValue: calendarClient },
        { provide: CommunicationsClientService,        useValue: commClient },
        { provide: UsersService,                       useValue: usersService },
      ],
    }).compile();

    service = module.get<LinkedCalendarsService>(LinkedCalendarsService);
  });

  // ── T1 ────────────────────────────────────────────────────────────────────

  it('T1: throws ServiceUnavailableException when Communications is not configured', async () => {
    calendarClient.listCalendarAccounts.mockRejectedValueOnce(
      new ServiceUnavailableException('Communications integration is not configured'),
    );
    await expect(service.listAvailableAccounts(COMPANY_ID)).rejects.toThrow(ServiceUnavailableException);
  });

  // ── T2 ────────────────────────────────────────────────────────────────────

  it('T2: returns available calendar accounts from Communications', async () => {
    const result = await service.listAvailableAccounts(COMPANY_ID);
    expect(result).toHaveLength(1);
    expect(result[0].connectionId).toBe(CONN_ID);
    expect(calendarClient.listCalendarAccounts).toHaveBeenCalledWith(COMPANY_ID);
  });

  // ── T3 ────────────────────────────────────────────────────────────────────

  it('T3: delegates calendar-channel filtering to the Communications client', async () => {
    await service.listAvailableAccounts(COMPANY_ID);
    expect(calendarClient.listCalendarAccounts).toHaveBeenCalledTimes(1);
  });

  // ── T4 ────────────────────────────────────────────────────────────────────

  it('T4: returns calendars for a valid account', async () => {
    model.find = jest.fn().mockImplementation(() => chain([]));
    const result = await service.listAvailableCalendars(COMPANY_ID, CONN_ID);
    expect(result).toHaveLength(2);
    expect(result[0].externalCalendarId).toBe(CAL_WORK);
  });

  // ── T5 ────────────────────────────────────────────────────────────────────

  it('T5: excludes already-linked calendars from the available list', async () => {
    model.find = jest.fn().mockImplementation(() =>
      chain([{ externalCalendarId: CAL_WORK, status: 'active', _id: 'local-001' }]),
    );
    const result = await service.listAvailableCalendars(COMPANY_ID, CONN_ID);
    // CAL_WORK is linked — must not appear
    expect(result.find((c) => c.externalCalendarId === CAL_WORK)).toBeUndefined();
    // CAL_LASSO is not linked — must still appear
    expect(result.find((c) => c.externalCalendarId === CAL_LASSO)).toBeDefined();
    expect(result).toHaveLength(1);
  });

  // ── T6 ────────────────────────────────────────────────────────────────────

  it('T6: links a single calendar and sends calendar_linked notification', async () => {
    const workDoc = makeDoc({ externalCalendarId: CAL_WORK, calendarName: 'Work' });
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain(workDoc));
    // Simulate "just created": createdAt ≈ updatedAt (within 100ms)
    model.findOne = jest.fn().mockImplementation(() =>
      chain({ status: 'active', createdAt: NOW, updatedAt: NOW }),
    );

    const result = await service.linkCalendars(
      COMPANY_ID, { connectionId: CONN_ID, calendarIds: [CAL_WORK] }, ACTOR,
    );
    await flushPromises();

    expect(result).toHaveLength(1);
    expect(commClient.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'business', event: 'linked_calendars.calendar_linked' }),
    );
  });

  // ── T7 ────────────────────────────────────────────────────────────────────

  it('T7: bulk links multiple calendars and sends bulk notification', async () => {
    let callIdx = 0;
    const docs = [
      makeDoc({ externalCalendarId: CAL_WORK,  calendarName: 'Work' }),
      makeDoc({ _id: 'l2', externalCalendarId: CAL_LASSO, calendarName: 'LASSO Calendar' }),
    ];
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain(docs[callIdx++ % 2]));
    model.findOne = jest.fn().mockImplementation(() =>
      chain({ status: 'active', createdAt: NOW, updatedAt: NOW }),
    );

    await service.linkCalendars(
      COMPANY_ID, { connectionId: CONN_ID, calendarIds: [CAL_WORK, CAL_LASSO] }, ACTOR,
    );
    await flushPromises();

    expect(commClient.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'business', event: 'linked_calendars.calendars_bulk_linked' }),
    );
  });

  // ── T8 ────────────────────────────────────────────────────────────────────

  it('T8: upsert (findOneAndUpdate) called once per calendar per request', async () => {
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain(makeDoc()));
    model.findOne = jest.fn().mockImplementation(() =>
      chain({ status: 'active', createdAt: NOW, updatedAt: NOW }),
    );
    await service.linkCalendars(COMPANY_ID, { connectionId: CONN_ID, calendarIds: [CAL_WORK] }, ACTOR);
    await service.linkCalendars(COMPANY_ID, { connectionId: CONN_ID, calendarIds: [CAL_WORK] }, ACTOR);
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  // ── T9 ────────────────────────────────────────────────────────────────────

  it('T9: reactivates a paused calendar and sends calendar_activated notification', async () => {
    const pausedDoc = makeDoc({ status: 'paused' });
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain(pausedDoc));
    // createdAt ≠ updatedAt → not just created; status=paused → reactivate path
    model.findOne = jest.fn().mockImplementation(() =>
      chain({ status: 'paused', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-06-01') }),
    );

    await service.linkCalendars(
      COMPANY_ID, { connectionId: CONN_ID, calendarIds: [CAL_WORK] }, ACTOR,
    );
    await flushPromises();

    expect(model.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ externalCalendarId: CAL_WORK }),
      { $set: { status: 'active' } },
    );
    expect(commClient.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'linked_calendars.calendar_activated' }),
    );
  });

  // ── T10 ───────────────────────────────────────────────────────────────────

  it('T10: rejects calendarIds not returned by Communications', async () => {
    await expect(
      service.linkCalendars(
        COMPANY_ID, { connectionId: CONN_ID, calendarIds: ['non-existent-id'] }, ACTOR,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ── T11 ───────────────────────────────────────────────────────────────────

  it('T11: rejects connectionId that does not belong to this Business', async () => {
    calendarClient.getCalendarAccount.mockResolvedValueOnce(null);
    await expect(
      service.linkCalendars(
        OTHER_CO, { connectionId: CONN_ID, calendarIds: [CAL_WORK] },
        { ...ACTOR, companyId: OTHER_CO },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ── T12 ───────────────────────────────────────────────────────────────────

  it('T12: findOrThrow returns NotFoundException for another tenant', async () => {
    model.findOne = jest.fn().mockImplementation(() => chain(null));
    await expect(service.findById('linked-001', OTHER_CO)).rejects.toThrow(NotFoundException);
  });

  // ── T13 ───────────────────────────────────────────────────────────────────

  it('T13: pauses an active calendar and sends notification', async () => {
    const activeDoc = makeDoc({ status: 'active' });
    model.findOne          = jest.fn().mockImplementation(() => chain(activeDoc));
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain({ ...activeDoc, status: 'paused' }));

    const result = await service.pause('linked-001', COMPANY_ID, ACTOR);

    expect(commClient.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'linked_calendars.calendar_paused' }),
    );
    expect(result.status).toBe('paused');
  });

  // ── T14 ───────────────────────────────────────────────────────────────────

  it('T14: activates a paused calendar and sends notification', async () => {
    const pausedDoc = makeDoc({ status: 'paused' });
    model.findOne          = jest.fn().mockImplementation(() => chain(pausedDoc));
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain({ ...pausedDoc, status: 'active' }));

    const result = await service.activate('linked-001', COMPANY_ID, ACTOR);

    expect(commClient.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'linked_calendars.calendar_activated' }),
    );
    expect(result.status).toBe('active');
  });

  // ── T15 ───────────────────────────────────────────────────────────────────

  it('T15: unlinks a calendar and sends notification when no Contract references it', async () => {
    model.findOne         = jest.fn().mockImplementation(() => chain(makeDoc()));
    contractModel.findOne = jest.fn().mockImplementation(() => chain(null));

    const result = await service.unlink('linked-001', COMPANY_ID, ACTOR);
    await flushPromises();

    expect(result).toEqual({ deleted: true });
    expect(model.deleteOne).toHaveBeenCalledWith({ _id: 'linked-001', companyId: COMPANY_ID });
    expect(commClient.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'linked_calendars.calendar_unlinked' }),
    );
  });

  // ── T16 ───────────────────────────────────────────────────────────────────

  it('T16: mapper returns clean DTO without internal MongoDB fields', () => {
    const dto = LinkedCalendarMapper.toResponse(makeDoc() as any);
    expect(dto.id).toBe('linked-001');
    expect((dto as any)._id).toBeUndefined();
    expect(dto.calendarName).toBe('Work');
    expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // ── T17 ───────────────────────────────────────────────────────────────────

  it('T17: all write notifications use type: business (business-owned operational events)', async () => {
    model.findOne          = jest.fn().mockImplementation(() => chain(makeDoc()));
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain({ ...makeDoc(), status: 'paused' }));

    await service.pause('linked-001', COMPANY_ID, ACTOR);

    for (const [params] of (commClient.notifyEvent as jest.Mock).mock.calls) {
      expect(params.type).toBe('business');
    }
  });

  // ── T18 ───────────────────────────────────────────────────────────────────

  it('T18: notification failure does not roll back the operation', async () => {
    commClient.notifyEvent.mockRejectedValueOnce(new Error('SMTP timeout'));
    model.findOne         = jest.fn().mockImplementation(() => chain(makeDoc()));
    contractModel.findOne = jest.fn().mockImplementation(() => chain(null));
    model.deleteOne       = jest.fn().mockReturnValue({ exec: () => Promise.resolve({ deletedCount: 1 }) });

    await expect(service.unlink('linked-001', COMPANY_ID, ACTOR)).resolves.toEqual({ deleted: true });
  });

  // ── T19 ───────────────────────────────────────────────────────────────────

  it('T19: linkCalendars stores no provider tokens or credentials', async () => {
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain(makeDoc()));
    model.findOne = jest.fn().mockImplementation(() =>
      chain({ status: 'active', createdAt: NOW, updatedAt: NOW }),
    );

    await service.linkCalendars(
      COMPANY_ID, { connectionId: CONN_ID, calendarIds: [CAL_WORK] }, ACTOR,
    );

    const [$set] = (model.findOneAndUpdate as jest.Mock).mock.calls.map((c) => c[1].$set);
    const forbidden = ['token', 'accessToken', 'refreshToken', 'appSpecificPassword', 'password', 'secret'];
    for (const f of forbidden) {
      expect(Object.keys($set)).not.toContain(f);
    }
  });

  // ── T20 ───────────────────────────────────────────────────────────────────

  it('T20: CalendarFlow enum exposes holidays, shifts, payments', () => {
    const { CALENDAR_FLOWS } = require('../schemas/linked-calendar.schema');
    expect(CALENDAR_FLOWS).toContain('holidays');
    expect(CALENDAR_FLOWS).toContain('shifts');
    expect(CALENDAR_FLOWS).toContain('payments');
    expect(CALENDAR_FLOWS).toHaveLength(3);
  });

  // ── T21 ───────────────────────────────────────────────────────────────────

  it('T21: linkCalendars stores flow from DTO when provided', async () => {
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain(makeDoc({ flow: 'holidays' })));
    model.findOne = jest.fn().mockImplementation(() =>
      chain({ status: 'active', createdAt: NOW, updatedAt: NOW }),
    );

    await service.linkCalendars(
      COMPANY_ID, { connectionId: CONN_ID, calendarIds: [CAL_WORK], flow: 'holidays' }, ACTOR,
    );

    const [$set] = (model.findOneAndUpdate as jest.Mock).mock.calls.map((c) => c[1].$set);
    expect($set.flow).toBe('holidays');
  });

  // ── T22 ───────────────────────────────────────────────────────────────────

  it('T22: linkCalendars omits flow from $set when not provided', async () => {
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain(makeDoc()));
    model.findOne = jest.fn().mockImplementation(() =>
      chain({ status: 'active', createdAt: NOW, updatedAt: NOW }),
    );

    await service.linkCalendars(
      COMPANY_ID, { connectionId: CONN_ID, calendarIds: [CAL_WORK] }, ACTOR,
    );

    const [$set] = (model.findOneAndUpdate as jest.Mock).mock.calls.map((c) => c[1].$set);
    expect(Object.keys($set)).not.toContain('flow');
  });

  // ── T23 ───────────────────────────────────────────────────────────────────

  it('T23: updateStatus updates flow field and does not send notification for flow-only change', async () => {
    const doc = makeDoc({ flow: null });
    model.findOne          = jest.fn().mockImplementation(() => chain(doc));
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain({ ...doc, flow: 'holidays' }));

    const result = await service.updateStatus('linked-001', COMPANY_ID, { flow: 'holidays' }, ACTOR);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'linked-001', companyId: COMPANY_ID },
      { $set: { flow: 'holidays' } },
      { new: true },
    );
    expect(result.flow).toBe('holidays');
    expect(commClient.notifyEvent).not.toHaveBeenCalled();
  });

  // ── T24 ───────────────────────────────────────────────────────────────────

  it('T24: updateStatus updates both status and flow simultaneously', async () => {
    const doc = makeDoc({ status: 'paused', flow: null });
    model.findOne          = jest.fn().mockImplementation(() => chain(doc));
    model.findOneAndUpdate = jest.fn().mockImplementation(() => chain({ ...doc, status: 'active', flow: 'payments' }));

    const result = await service.updateStatus(
      'linked-001', COMPANY_ID, { status: 'active', flow: 'payments' }, ACTOR,
    );

    const call = (model.findOneAndUpdate as jest.Mock).mock.calls[0];
    expect(call[1].$set).toMatchObject({ status: 'active', flow: 'payments' });
    expect(result.status).toBe('active');
    expect(result.flow).toBe('payments');
  });

  // ── T25 ───────────────────────────────────────────────────────────────────

  it('T25: findAll filters by flow when provided in query', async () => {
    const docs = [makeDoc({ flow: 'holidays' })];
    model.find = jest.fn().mockImplementation(() => chain(docs));

    const result = await service.findAll(COMPANY_ID, { flow: 'holidays' });

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: COMPANY_ID, flow: 'holidays' }),
    );
    expect(result).toHaveLength(1);
  });

  // ── T26 ───────────────────────────────────────────────────────────────────

  it('T26: findAll without flow filter does not restrict by flow', async () => {
    model.find = jest.fn().mockImplementation(() => chain([]));

    await service.findAll(COMPANY_ID, {});

    const [filter] = (model.find as jest.Mock).mock.calls[0];
    expect(filter).not.toHaveProperty('flow');
  });

  // ── T27 ───────────────────────────────────────────────────────────────────

  it('T27: getOptions returns only active calendars for requested flow', async () => {
    const docs = [
      makeDoc({ flow: 'holidays', status: 'active', accessRole: 'read-only' }),
    ];
    model.find = jest.fn().mockImplementation(() => ({
      select: () => ({
        sort: () => ({
          lean: () => ({
            exec: () => Promise.resolve(docs),
          }),
        }),
      }),
    }));

    const result = await service.getOptions(COMPANY_ID, 'holidays');

    expect(model.find).toHaveBeenCalledWith({ companyId: COMPANY_ID, flow: 'holidays', status: 'active' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id:                  'linked-001',
      calendarName:        'Work',
      flow:                'holidays',
      status:              'active',
    });
    // Must not expose secrets
    expect(result[0]).not.toHaveProperty('token');
    expect(result[0]).not.toHaveProperty('password');
  });

  // ── T28 ───────────────────────────────────────────────────────────────────

  it('T28: mapper includes flow field in response (null for legacy records)', () => {
    const dto = LinkedCalendarMapper.toResponse(makeDoc({ flow: null }) as any);
    expect(dto.flow).toBeNull();
  });

  it('T28b: mapper includes flow field when assigned', () => {
    const dto = LinkedCalendarMapper.toResponse(makeDoc({ flow: 'payments' }) as any);
    expect(dto.flow).toBe('payments');
  });

  // ── T29 ───────────────────────────────────────────────────────────────────

  it('T29: updateStatus returns unchanged record when nothing to update', async () => {
    const doc = makeDoc({ status: 'active', flow: 'holidays' });
    model.findOne = jest.fn().mockImplementation(() => chain(doc));

    // Passing same status and no flow change
    const result = await service.updateStatus(
      'linked-001', COMPANY_ID, { status: 'active' }, ACTOR,
    );

    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    expect(result.status).toBe('active');
  });

  // ── T30 ───────────────────────────────────────────────────────────────────

  it('T30: legacy record without flow reads as null in response', () => {
    const legacyDoc = makeDoc();
    delete (legacyDoc as any).flow;
    const dto = LinkedCalendarMapper.toResponse(legacyDoc as any);
    expect(dto.flow).toBeNull();
  });

  // ── T31: filtering uses ID (primary) — different ID and different name is available ─

  it('T31: provider calendar with an unrelated ID and name is shown as available', async () => {
    // Linked record has neither matching ID nor matching name to any remote calendar.
    // Both remote calendars (Work, LASSO) should remain available.
    model.find = jest.fn().mockImplementation(() =>
      chain([{ externalCalendarId: 'different-id', calendarName: 'Something Else', status: 'active', _id: 'local-999' }]),
    );
    const result = await service.listAvailableCalendars(COMPANY_ID, CONN_ID);
    expect(result).toHaveLength(2);
    expect(result.find((c) => c.externalCalendarId === CAL_WORK)).toBeDefined();
    expect(result.find((c) => c.externalCalendarId === CAL_LASSO)).toBeDefined();
  });

  // ── T32: name-based fallback for legacy data (wrong stored externalCalendarId) ──

  it('T32: excludes calendar by name fallback when stored externalCalendarId is a legacy wrong value', async () => {
    // Legacy scenario: stored ID is a CalDAV account URL, not the per-calendar HREF.
    // The name DOES match a remote calendar → excluded via name fallback.
    model.find = jest.fn().mockImplementation(() =>
      chain([{ externalCalendarId: 'https://caldav.icloud.com/12345', calendarName: 'Work', status: 'active', _id: 'local-002' }]),
    );
    const result = await service.listAvailableCalendars(COMPANY_ID, CONN_ID);
    // CAL_WORK ('Work') excluded by name even though the stored ID is wrong
    expect(result.find((c) => c.externalCalendarId === CAL_WORK)).toBeUndefined();
    // CAL_LASSO is not linked → should appear
    expect(result.find((c) => c.externalCalendarId === CAL_LASSO)).toBeDefined();
    expect(result).toHaveLength(1);
  });

  // ── T33: all linked — returns empty list ──────────────────────────────────

  it('T33: returns empty list when all provider calendars are already linked', async () => {
    model.find = jest.fn().mockImplementation(() =>
      chain([
        { externalCalendarId: CAL_WORK,  status: 'active', _id: 'local-001' },
        { externalCalendarId: CAL_LASSO, status: 'active', _id: 'local-002' },
      ]),
    );
    const result = await service.listAvailableCalendars(COMPANY_ID, CONN_ID);
    expect(result).toHaveLength(0);
  });

  // ── T34: tenant isolation — available calendars scoped to companyId ───────

  it('T34: available-calendar DB query always includes companyId tenant filter', async () => {
    model.find = jest.fn().mockImplementation(() => chain([]));
    await service.listAvailableCalendars(OTHER_CO, CONN_ID);
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: OTHER_CO, connectionId: CONN_ID }),
    );
  });

  // ── T35: unlink blocked by holiday calendar reference ─────────────────────

  it('T35: unlink throws BadRequestException when calendar is referenced as holiday calendar in a Contract', async () => {
    model.findOne         = jest.fn().mockImplementation(() => chain(makeDoc()));
    contractModel.findOne = jest.fn().mockImplementation(() => chain({ _id: 'contract-001' }));

    await expect(service.unlink('linked-001', COMPANY_ID, ACTOR)).rejects.toThrow(BadRequestException);
    expect(model.deleteOne).not.toHaveBeenCalled();
  });

  // ── T36: unlink blocked by payment calendar reference ─────────────────────

  it('T36: unlink throws BadRequestException when calendar is referenced as payment calendar in a Contract', async () => {
    model.findOne = jest.fn().mockImplementation(() => chain(makeDoc()));
    contractModel.findOne = jest.fn().mockImplementation(() => chain({ _id: 'contract-002' }));

    await expect(service.unlink('linked-001', COMPANY_ID, ACTOR)).rejects.toThrow(BadRequestException);
    expect(model.deleteOne).not.toHaveBeenCalled();
  });

  // ── T37: unlink contract check uses businessId (= companyId) ─────────────

  it('T37: contract reference check uses the tenant businessId for isolation', async () => {
    model.findOne         = jest.fn().mockImplementation(() => chain(makeDoc()));
    contractModel.findOne = jest.fn().mockImplementation(() => chain(null));

    await service.unlink('linked-001', COMPANY_ID, ACTOR);

    const [filter] = (contractModel.findOne as jest.Mock).mock.calls[0];
    expect(filter.businessId).toBe(COMPANY_ID);
  });

  // ── T38: cross-Business unlink rejected by findOrThrow ───────────────────

  it('T38: unlink rejects a calendar that belongs to another Business (NotFoundException)', async () => {
    model.findOne = jest.fn().mockImplementation(() => chain(null));
    await expect(
      service.unlink('linked-001', OTHER_CO, { ...ACTOR, companyId: OTHER_CO }),
    ).rejects.toThrow(NotFoundException);
    expect(model.deleteOne).not.toHaveBeenCalled();
  });

  // ── T39: unlink never calls provider delete API ───────────────────────────

  it('T39: unlink removes only the local linked-calendar record, never calls calendarClient delete', async () => {
    model.findOne         = jest.fn().mockImplementation(() => chain(makeDoc()));
    contractModel.findOne = jest.fn().mockImplementation(() => chain(null));

    await service.unlink('linked-001', COMPANY_ID, ACTOR);

    // calendarClient has no deleteCalendar method — verify it was never extended with one
    const clientKeys = Object.keys(calendarClient);
    expect(clientKeys.filter((k) => k.toLowerCase().includes('delete'))).toHaveLength(0);
    // deleteOne only on the linked-calendar model, never on a provider
    expect(model.deleteOne).toHaveBeenCalledTimes(1);
  });
});

// ─── Subscribe by URL & from Catalogue ───────────────────────────────────────

import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import {
  getCatalogueEntry,
  getAvailableCatalogueEntries,
  toSafeEntry,
  PUBLIC_CALENDAR_CATALOGUE,
} from '../catalogue/public-calendar-catalogue';

// Shared setup for subscribe tests
async function buildSubscribeModule(calendarClientOverrides: Record<string, any> = {}) {
  const calClient = {
    listCalendarAccounts: jest.fn().mockResolvedValue(ACCOUNTS),
    listCalendars:        jest.fn().mockResolvedValue(REMOTE_CALS),
    getCalendarAccount:   jest.fn().mockResolvedValue(ACCOUNTS[0]),
    createCalendar:       jest.fn(),
    subscribeToUrl:       jest.fn(),
    ...calendarClientOverrides,
  } as any;

  const commClient = { notifyEvent: jest.fn().mockResolvedValue(true) } as any;
  const usersService = { getCompanyDisplayName: jest.fn().mockResolvedValue('Acme Corp') };

  const mockModel = {
    findOne:          jest.fn().mockImplementation(() => chain(null)),
    find:             jest.fn().mockImplementation(() => chain([])),
    updateOne:        jest.fn().mockReturnValue({ exec: () => Promise.resolve({ modifiedCount: 1 }) }),
    deleteOne:        jest.fn().mockReturnValue({ exec: () => Promise.resolve({ deletedCount: 1 }) }),
    findOneAndUpdate: jest.fn().mockImplementation(() => chain(makeDoc())),
    findOneAndDelete: jest.fn().mockImplementation(() => chain(makeDoc())),
  };

  // Contract model: default no references (so unlink succeeds unless overridden)
  const contractMockModel = {
    findOne: jest.fn().mockImplementation(() => chain(null)),
  };

  const module = await Test.createTestingModule({
    providers: [
      LinkedCalendarsService,
      { provide: getModelToken(LinkedCalendar.name), useValue: mockModel },
      { provide: getModelToken(Contract.name),       useValue: contractMockModel },
      { provide: CommunicationsCalendarClient,       useValue: calClient  },
      { provide: CommunicationsClientService,        useValue: commClient },
      { provide: UsersService,                       useValue: usersService },
    ],
  }).compile();

  return { service: module.get<LinkedCalendarsService>(LinkedCalendarsService), calClient, commClient, mockModel };
}

// ─── Subscribe by URL ─────────────────────────────────────────────────────────

describe('LinkedCalendarsService.subscribeByUrl', () => {
  const VALID_URL = 'https://calendar.google.com/calendar/ical/example.ics';

  it('T31: creates and links a calendar from a valid HTTPS URL with correct flow', async () => {
    const remote = {
      externalCalendarId: 'subscribed-001',
      calendarName:       'Industry Events',
      calendarDescription: null,
      timezone:            'Australia/Sydney',
      accessRole:          'read-only',
      isPrimary:            false,
    };
    const { service, calClient, mockModel } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue(remote),
    });

    await service.subscribeByUrl(COMPANY_ID, {
      connectionId:    CONN_ID,
      subscriptionUrl: VALID_URL,
      flow:            'holidays',
    }, ACTOR);

    expect(calClient.subscribeToUrl).toHaveBeenCalledWith(
      COMPANY_ID,
      CONN_ID,
      expect.objectContaining({ url: VALID_URL }),
    );
    // Verify flow is passed in the $set to findOneAndUpdate
    const $set = (mockModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set;
    expect($set.flow).toBe('holidays');
  });

  it('T32: forwards optional calendarName and description to the client', async () => {
    const { service, calClient } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue({
        externalCalendarId: 'sub-001', calendarName: 'Overridden Name',
        calendarDescription: null, timezone: null, accessRole: 'read-only', isPrimary: false,
      }),
    });

    await service.subscribeByUrl(COMPANY_ID, {
      connectionId:    CONN_ID,
      subscriptionUrl: VALID_URL,
      calendarName:    'My Name',
      description:     'My Desc',
      flow:            'shifts',
    }, ACTOR);

    const callArgs = (calClient.subscribeToUrl as jest.Mock).mock.calls[0][2];
    expect(callArgs.name).toBe('My Name');
    expect(callArgs.description).toBe('My Desc');
  });

  it('T33: rejects an unknown connectionId', async () => {
    const { service } = await buildSubscribeModule({
      getCalendarAccount: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.subscribeByUrl(COMPANY_ID, {
        connectionId: 'unknown-conn', subscriptionUrl: VALID_URL, flow: 'holidays',
      }, ACTOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('T34: passes through ServiceUnavailableException from the provider', async () => {
    const { service } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockRejectedValue(
        new ServiceUnavailableException('Provider rejected subscription'),
      ),
    });

    await expect(
      service.subscribeByUrl(COMPANY_ID, {
        connectionId: CONN_ID, subscriptionUrl: VALID_URL, flow: 'holidays',
      }, ACTOR),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('T35: sends a calendar_linked notification on success', async () => {
    const { service, commClient } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue({
        externalCalendarId: 'sub-002', calendarName: 'Events',
        calendarDescription: null, timezone: null, accessRole: 'read-only', isPrimary: false,
      }),
    });

    await service.subscribeByUrl(COMPANY_ID, {
      connectionId: CONN_ID, subscriptionUrl: VALID_URL, flow: 'payments',
    }, ACTOR);
    await new Promise<void>((r) => setImmediate(r));

    expect(commClient.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'linked_calendars.calendar_linked' }),
    );
  });

  it('T36: duplicate subscription returns updated record without creating a new one', async () => {
    const existingDoc = makeDoc({ externalCalendarId: 'sub-003' });
    const { service, mockModel } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue({
        externalCalendarId: 'sub-003', calendarName: 'Events',
        calendarDescription: null, timezone: null, accessRole: 'read-only', isPrimary: false,
      }),
    });
    // Simulate existing linked calendar
    mockModel.findOne = jest.fn().mockImplementation(() => chain(existingDoc));
    mockModel.findOneAndUpdate = jest.fn().mockImplementation(() => chain({ ...existingDoc, flow: 'shifts' }));

    const result = await service.subscribeByUrl(COMPANY_ID, {
      connectionId: CONN_ID, subscriptionUrl: VALID_URL, flow: 'shifts',
    }, ACTOR);

    expect(result).toBeDefined();
    // Updated via findOneAndUpdate on existing record (not insert path)
    expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
  });

  it('T37: tenant isolation — rejects connectionId not belonging to this Business', async () => {
    const { service } = await buildSubscribeModule({
      getCalendarAccount: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.subscribeByUrl('other-company', {
        connectionId: CONN_ID, subscriptionUrl: VALID_URL, flow: 'holidays',
      }, { ...ACTOR, companyId: 'other-company' }),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── Subscribe from Catalogue ─────────────────────────────────────────────────

describe('LinkedCalendarsService.subscribeFromCatalogue', () => {
  const AU_NATIONAL_KEY = 'au_national_public_holidays';
  const UNAVAILABLE_KEY = 'au_nsw_public_holidays';

  it('T38: subscribes to an available catalogue entry with correct flow', async () => {
    const entry = getCatalogueEntry(AU_NATIONAL_KEY)!;
    expect(entry.available).toBe(true);
    expect(entry.subscriptionUrl).toBeTruthy();

    const { service, calClient, mockModel } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue({
        externalCalendarId: 'au-national-001', calendarName: entry.displayName,
        calendarDescription: null, timezone: null, accessRole: 'read-only', isPrimary: false,
      }),
    });

    await service.subscribeFromCatalogue(COMPANY_ID, {
      connectionId: CONN_ID, catalogueKey: AU_NATIONAL_KEY, flow: 'holidays',
    }, ACTOR);

    expect(calClient.subscribeToUrl).toHaveBeenCalledWith(
      COMPANY_ID,
      CONN_ID,
      expect.objectContaining({ url: entry.subscriptionUrl }),
    );
    // Verify flow is passed in $set
    const $set = (mockModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set;
    expect($set.flow).toBe('holidays');
  });

  it('T39: rejects unknown catalogue key', async () => {
    const { service } = await buildSubscribeModule();

    await expect(
      service.subscribeFromCatalogue(COMPANY_ID, {
        connectionId: CONN_ID, catalogueKey: 'non_existent_key', flow: 'holidays',
      }, ACTOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('T40: rejects unavailable catalogue entry', async () => {
    const entry = getCatalogueEntry(UNAVAILABLE_KEY)!;
    expect(entry.available).toBe(false);

    const { service } = await buildSubscribeModule();

    await expect(
      service.subscribeFromCatalogue(COMPANY_ID, {
        connectionId: CONN_ID, catalogueKey: UNAVAILABLE_KEY, flow: 'holidays',
      }, ACTOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('T41: uses catalogue displayName when calling subscribeToUrl', async () => {
    const entry = getCatalogueEntry(AU_NATIONAL_KEY)!;
    const { service, calClient } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue({
        externalCalendarId: 'au-001', calendarName: entry.displayName,
        calendarDescription: null, timezone: null, accessRole: 'read-only', isPrimary: false,
      }),
    });

    await service.subscribeFromCatalogue(COMPANY_ID, {
      connectionId: CONN_ID, catalogueKey: AU_NATIONAL_KEY, flow: 'holidays',
    }, ACTOR);

    const callArgs = (calClient.subscribeToUrl as jest.Mock).mock.calls[0][2];
    expect(callArgs.name).toBe(entry.displayName);
  });

  it('T42: sends calendar_linked notification after successful catalogue subscription', async () => {
    const { service, commClient } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue({
        externalCalendarId: 'au-002', calendarName: 'AU Holidays',
        calendarDescription: null, timezone: null, accessRole: 'read-only', isPrimary: false,
      }),
    });

    await service.subscribeFromCatalogue(COMPANY_ID, {
      connectionId: CONN_ID, catalogueKey: AU_NATIONAL_KEY, flow: 'holidays',
    }, ACTOR);
    await new Promise<void>((r) => setImmediate(r));

    expect(commClient.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'linked_calendars.calendar_linked' }),
    );
  });
});

// ─── Public Calendar Catalogue ────────────────────────────────────────────────

describe('Public Calendar Catalogue', () => {
  it('T43: catalogue contains AU entries', () => {
    const au = PUBLIC_CALENDAR_CATALOGUE.filter((e) => e.country === 'AU');
    expect(au.length).toBeGreaterThan(0);
  });

  it('T44: au_national_public_holidays is available with a verified URL', () => {
    const entry = getCatalogueEntry('au_national_public_holidays');
    expect(entry).toBeDefined();
    expect(entry!.available).toBe(true);
    expect(entry!.subscriptionUrl).toMatch(/^https:\/\//);
  });

  it('T45: state-specific AU entries are unavailable (URLs not yet verified)', () => {
    const stateKeys = [
      'au_nsw_public_holidays',
      'au_qld_public_holidays',
      'au_vic_public_holidays',
      'au_wa_public_holidays',
    ];
    for (const key of stateKeys) {
      const entry = getCatalogueEntry(key);
      expect(entry).toBeDefined();
      expect(entry!.available).toBe(false);
      expect(entry!.subscriptionUrl).toBeNull();
    }
  });

  it('T46: toSafeEntry never exposes the subscriptionUrl', () => {
    const entry = getCatalogueEntry('au_national_public_holidays')!;
    const safe  = toSafeEntry(entry);
    expect(safe).not.toHaveProperty('subscriptionUrl');
    expect(safe.key).toBe(entry.key);
    expect(safe.available).toBe(true);
  });

  it('T47: getAvailableCatalogueEntries returns only entries with available=true and a URL', () => {
    const available = getAvailableCatalogueEntries('AU');
    for (const e of available) {
      expect(e.available).toBe(true);
      expect(e.subscriptionUrl).toBeTruthy();
    }
  });

  it('T48: getCatalogueForCountry on service returns safe entries', async () => {
    const { service } = await buildSubscribeModule();
    const entries = service.getCatalogueForCountry('AU');
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e).not.toHaveProperty('subscriptionUrl');
    }
  });

  it('T49: all catalogue entries have required fields', () => {
    for (const entry of PUBLIC_CALENDAR_CATALOGUE) {
      expect(entry.key).toBeTruthy();
      expect(entry.country).toBeTruthy();
      expect(entry.region).toBeTruthy();
      expect(entry.regionLabel).toBeTruthy();
      expect(entry.displayName).toBeTruthy();
      expect(entry.recommendedFlow).toMatch(/^(holidays|shifts|payments)$/);
      expect(typeof entry.available).toBe('boolean');
    }
  });
});

// ─── One-click setup: setupPaymentCalendar ────────────────────────────────────

import { CALENDAR_SETUP_DEFAULTS } from '../catalogue/calendar-setup-constants';

describe('LinkedCalendarsService.setupPaymentCalendar', () => {
  const REMOTE_PAYMENT = {
    externalCalendarId:  'payment-cal-001',
    calendarName:        'Shift Payments',
    calendarDescription: null,
    timezone:            'Australia/Sydney',
    accessRole:          'read-write',
    isPrimary:           false,
  };

  it('T50: creates a payment calendar when none exists', async () => {
    const { service, calClient } = await buildSubscribeModule({
      createCalendar: jest.fn().mockResolvedValue(REMOTE_PAYMENT),
    });

    const result = await service.setupPaymentCalendar(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(calClient.createCalendar).toHaveBeenCalledWith(
      COMPANY_ID,
      CONN_ID,
      expect.objectContaining({ name: CALENDAR_SETUP_DEFAULTS.PAYMENT_CALENDAR_NAME }),
    );
    expect(result.wasExisting).toBe(false);
  });

  it('T51: assigns payments flow to the created calendar', async () => {
    const { service, mockModel } = await buildSubscribeModule({
      createCalendar: jest.fn().mockResolvedValue(REMOTE_PAYMENT),
    });

    await service.setupPaymentCalendar(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    const $set = (mockModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set;
    expect($set.flow).toBe('payments');
  });

  it('T52: returns existing payment calendar without creating a new one (idempotency)', async () => {
    const existingDoc = makeDoc({ flow: 'payments', status: 'active', calendarName: 'Shift Payments' });
    const { service, calClient, mockModel } = await buildSubscribeModule();
    mockModel.findOne = jest.fn().mockImplementation(() => chain(existingDoc));

    const result = await service.setupPaymentCalendar(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(calClient.createCalendar).not.toHaveBeenCalled();
    expect(result.wasExisting).toBe(true);
  });

  it('T53: rejects when calendar account does not belong to this Business', async () => {
    const { service } = await buildSubscribeModule({
      getCalendarAccount: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.setupPaymentCalendar(COMPANY_ID, { connectionId: 'invalid-conn' }, ACTOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('T54: maps provider failure to a clear BadRequestException', async () => {
    const { service } = await buildSubscribeModule({
      createCalendar: jest.fn().mockRejectedValue(new Error('Provider unavailable')),
    });

    await expect(
      service.setupPaymentCalendar(COMPANY_ID, { connectionId: CONN_ID }, ACTOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('T55: returns safe CalendarOptionDto fields — no credentials or tokens', async () => {
    const existingDoc = makeDoc({ flow: 'payments', status: 'active' });
    const { service, mockModel } = await buildSubscribeModule();
    mockModel.findOne = jest.fn().mockImplementation(() => chain(existingDoc));

    const result = await service.setupPaymentCalendar(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(result).not.toHaveProperty('token');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('accessToken');
    expect(result.id).toBeTruthy();
    expect(result.calendarName).toBeTruthy();
  });

  it('T56: tenant isolation — only checks calendars for this companyId', async () => {
    const { service, mockModel } = await buildSubscribeModule({
      createCalendar: jest.fn().mockResolvedValue(REMOTE_PAYMENT),
    });

    await service.setupPaymentCalendar(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    const filterArg = (mockModel.findOne as jest.Mock).mock.calls[0][0];
    expect(filterArg.companyId).toBe(COMPANY_ID);
    expect(filterArg.flow).toBe('payments');
  });
});

// ─── One-click setup: setupAustralianHolidays ─────────────────────────────────

describe('LinkedCalendarsService.setupAustralianHolidays', () => {
  const REMOTE_HOLIDAY = {
    externalCalendarId:  'au-holiday-001',
    calendarName:        'Australian Public Holidays',
    calendarDescription: null,
    timezone:            'Australia/Sydney',
    accessRole:          'read-only',
    isPrimary:           false,
  };

  it('T57: subscribes to AU national holidays when none exists', async () => {
    const entry = getCatalogueEntry(CALENDAR_SETUP_DEFAULTS.AU_HOLIDAY_CATALOGUE_KEY)!;
    const { service, calClient } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue(REMOTE_HOLIDAY),
    });

    await service.setupAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(calClient.subscribeToUrl).toHaveBeenCalledWith(
      COMPANY_ID,
      CONN_ID,
      expect.objectContaining({ url: entry.subscriptionUrl }),
    );
  });

  it('T58: assigns holidays flow to the subscribed calendar', async () => {
    const { service, mockModel } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue(REMOTE_HOLIDAY),
    });

    await service.setupAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    const $set = (mockModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set;
    expect($set.flow).toBe('holidays');
  });

  it('T59: returns wasExisting=false when a new subscription is created', async () => {
    const { service } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockResolvedValue(REMOTE_HOLIDAY),
    });

    const result = await service.setupAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);
    expect(result.status).toBe('linked');
    if (result.status === 'linked') {
      expect(result.calendar.wasExisting).toBe(false);
    }
  });

  it('T60: returns existing holiday calendar without subscribing again (idempotency)', async () => {
    const existingDoc = makeDoc({ flow: 'holidays', status: 'active', calendarName: 'AU Holidays' });
    const { service, calClient, mockModel } = await buildSubscribeModule();
    mockModel.findOne = jest.fn().mockImplementation(() => chain(existingDoc));

    const result = await service.setupAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(calClient.subscribeToUrl).not.toHaveBeenCalled();
    expect(result.status).toBe('linked');
    if (result.status === 'linked') {
      expect(result.calendar.wasExisting).toBe(true);
    }
  });

  it('T61: propagates ServiceUnavailableException when Communications is unreachable', async () => {
    const { service } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockRejectedValue(new ServiceUnavailableException('provider error')),
    });

    try {
      await service.setupAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);
      fail('Expected ServiceUnavailableException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toBe('The calendar service is temporarily unavailable. Please try again later.');
    }
  });

  it('T61b: AU_HOLIDAY_UNAVAILABLE_MESSAGE says "Automatic holiday subscription is not supported"', () => {
    expect(CALENDAR_SETUP_DEFAULTS.AU_HOLIDAY_UNAVAILABLE_MESSAGE).toContain(
      'Automatic holiday subscription is not supported',
    );
  });

  it('T62: does not expose internal credential details in connectivity error message', async () => {
    const { service } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockRejectedValue(
        new ServiceUnavailableException('Internal provider credentials expired: token xyz123'),
      ),
    });

    try {
      await service.setupAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).not.toContain('xyz123');
    }
  });

  it('T63: rejects when account does not belong to the Business', async () => {
    const { service } = await buildSubscribeModule({
      getCalendarAccount: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.setupAustralianHolidays(OTHER_CO, { connectionId: CONN_ID }, { ...ACTOR, companyId: OTHER_CO }),
    ).rejects.toThrow(BadRequestException);
  });

  it('T64: safe response — no subscriptionUrl or provider secrets returned', async () => {
    const existingDoc = makeDoc({ flow: 'holidays', status: 'active' });
    const { service, mockModel } = await buildSubscribeModule();
    mockModel.findOne = jest.fn().mockImplementation(() => chain(existingDoc));

    const result = await service.setupAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(result.status).toBe('linked');
    if (result.status === 'linked') {
      expect(result.calendar).not.toHaveProperty('subscriptionUrl');
      expect(result.calendar).not.toHaveProperty('token');
      expect(result.calendar).not.toHaveProperty('password');
      expect(result.calendar.id).toBeTruthy();
    }
  });
});

// ─── T67: assisted_setup_required outcome ────────────────────────────────────

import { UnprocessableEntityException } from '@nestjs/common';

describe('LinkedCalendarsService.setupAustralianHolidays — assisted_setup_required', () => {
  it('T67: returns HTTP 200 assisted_setup_required when provider returns 422 (capability unsupported)', async () => {
    const { service } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockRejectedValue(
        new UnprocessableEntityException(CALENDAR_SETUP_DEFAULTS.AU_HOLIDAY_UNAVAILABLE_MESSAGE),
      ),
    });

    // Must NOT throw — returns a 200 response with status: 'assisted_setup_required'
    const result = await service.setupAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(result.status).toBe('assisted_setup_required');
    if (result.status === 'assisted_setup_required') {
      expect(result.provider).toBe('icloud');
      expect(result.connectionId).toBe(CONN_ID);
      expect(result.instructionsType).toBe('apple_holiday_calendar');
    }
  });

  it('T67b: actual BadRequestException (400) is re-thrown — not mapped to assisted setup', async () => {
    const { service } = await buildSubscribeModule({
      subscribeToUrl: jest.fn().mockRejectedValue(
        new BadRequestException('Missing required field: url'),
      ),
    });

    await expect(
      service.setupAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── T68–T80: discoverAustralianHolidays + linkProviderCalendarAsHoliday ─────

describe('LinkedCalendarsService.discoverAustralianHolidays', () => {
  const REMOTE_AU_HOLIDAY = {
    externalCalendarId:  'au-holidays-ext-001',
    calendarName:        'Australian Public Holidays',
    calendarDescription: null,
    timezone:            'Australia/Sydney',
    accessRole:          'read-only',
    isPrimary:           false,
  };

  const REMOTE_AU_HOLIDAY_2 = {
    externalCalendarId:  'au-holidays-ext-002',
    calendarName:        'Australia Holidays',
    calendarDescription: 'National holidays',
    timezone:            'Australia/Sydney',
    accessRole:          'read-only',
    isPrimary:           false,
  };

  it('T68: returns linked when active holidays calendar already exists (idempotency)', async () => {
    const existingDoc = makeDoc({ flow: 'holidays', status: 'active', calendarName: 'AU Holidays' });
    const { service, mockModel } = await buildSubscribeModule();
    mockModel.findOne = jest.fn().mockImplementation(() => chain(existingDoc));

    const result = await service.discoverAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(result.status).toBe('linked');
    if (result.status === 'linked') {
      expect(result.calendar.wasExisting).toBe(true);
    }
  });

  it('T69: throws BadRequestException when account not found', async () => {
    const { service } = await buildSubscribeModule({
      getCalendarAccount: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.discoverAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('T70: returns not_found when no unlinked holiday candidates exist', async () => {
    const { service } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([
        { externalCalendarId: 'work-cal', calendarName: 'Work', calendarDescription: null,
          timezone: 'Australia/Sydney', accessRole: 'read-write', isPrimary: false },
      ]),
    });

    const result = await service.discoverAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(result.status).toBe('not_found');
    expect(result.options).toHaveLength(0);
  });

  it('T71: returns linked when exactly one candidate matches by name', async () => {
    const { service } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([REMOTE_AU_HOLIDAY]),
    });

    const result = await service.discoverAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(result.status).toBe('linked');
  });

  it('T72: auto-links single candidate with flow=holidays', async () => {
    const { service, mockModel } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([REMOTE_AU_HOLIDAY]),
    });

    await service.discoverAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    const $set = (mockModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set;
    expect($set.flow).toBe('holidays');
  });

  it('T73: returns multiple_matches when multiple candidates found', async () => {
    const { service } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([REMOTE_AU_HOLIDAY, REMOTE_AU_HOLIDAY_2]),
    });

    const result = await service.discoverAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    expect(result.status).toBe('multiple_matches');
    if (result.status === 'multiple_matches') {
      expect(result.options).toHaveLength(2);
      expect(result.options[0].externalCalendarId).toBe(REMOTE_AU_HOLIDAY.externalCalendarId);
    }
  });

  it('T74: excludes already-linked calendars from candidates', async () => {
    const linkedDoc = makeDoc({
      externalCalendarId: REMOTE_AU_HOLIDAY.externalCalendarId,
      calendarName: REMOTE_AU_HOLIDAY.calendarName,
    });
    const { service, mockModel } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([REMOTE_AU_HOLIDAY, REMOTE_AU_HOLIDAY_2]),
    });
    // Simulate already-linked: findOne (idempotency) returns null, find returns the linked doc
    mockModel.find = jest.fn().mockImplementation(() => chain([linkedDoc]));

    const result = await service.discoverAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    // Only REMOTE_AU_HOLIDAY_2 remains as candidate → single match → auto-link
    expect(result.status).toBe('linked');
  });

  it('T80: tenant isolation — discoverAustralianHolidays scopes idempotency check to companyId', async () => {
    const { service, mockModel } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([REMOTE_AU_HOLIDAY]),
    });

    await service.discoverAustralianHolidays(COMPANY_ID, { connectionId: CONN_ID }, ACTOR);

    const filterArg = (mockModel.findOne as jest.Mock).mock.calls[0][0];
    expect(filterArg.companyId).toBe(COMPANY_ID);
    expect(filterArg.flow).toBe('holidays');
  });
});

describe('LinkedCalendarsService.linkProviderCalendarAsHoliday', () => {
  const PROVIDER_CAL = {
    externalCalendarId:  'ext-holiday-selected',
    calendarName:        'Australian Public Holidays',
    calendarDescription: null,
    timezone:            'Australia/Sydney',
    accessRole:          'read-only',
    isPrimary:           false,
  };

  it('T75: returns linked (idempotency) when active holidays calendar already exists', async () => {
    const existingDoc = makeDoc({ flow: 'holidays', status: 'active', calendarName: 'AU Holidays' });
    const { service, mockModel } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([PROVIDER_CAL]),
    });
    mockModel.findOne = jest.fn().mockImplementation(() => chain(existingDoc));

    const result = await service.linkProviderCalendarAsHoliday(
      COMPANY_ID,
      { connectionId: CONN_ID, externalCalendarId: PROVIDER_CAL.externalCalendarId },
      ACTOR,
    );

    expect(result.status).toBe('linked');
    if (result.status === 'linked') {
      expect(result.calendar.wasExisting).toBe(true);
    }
  });

  it('T76: throws BadRequestException when account not found', async () => {
    const { service } = await buildSubscribeModule({
      getCalendarAccount: jest.fn().mockResolvedValue(null),
      listCalendars: jest.fn().mockResolvedValue([PROVIDER_CAL]),
    });

    await expect(
      service.linkProviderCalendarAsHoliday(
        COMPANY_ID,
        { connectionId: CONN_ID, externalCalendarId: PROVIDER_CAL.externalCalendarId },
        ACTOR,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('T77: throws BadRequestException when externalCalendarId not in provider list', async () => {
    const { service } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([PROVIDER_CAL]),
    });

    await expect(
      service.linkProviderCalendarAsHoliday(
        COMPANY_ID,
        { connectionId: CONN_ID, externalCalendarId: 'nonexistent-id' },
        ACTOR,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('T78: always forces flow=holidays regardless of what frontend might send', async () => {
    const { service, mockModel } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([PROVIDER_CAL]),
    });

    await service.linkProviderCalendarAsHoliday(
      COMPANY_ID,
      { connectionId: CONN_ID, externalCalendarId: PROVIDER_CAL.externalCalendarId },
      ACTOR,
    );

    const $set = (mockModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set;
    expect($set.flow).toBe('holidays');
  });

  it('T79: returns status=linked with linked calendar on happy path', async () => {
    const { service } = await buildSubscribeModule({
      listCalendars: jest.fn().mockResolvedValue([PROVIDER_CAL]),
    });

    const result = await service.linkProviderCalendarAsHoliday(
      COMPANY_ID,
      { connectionId: CONN_ID, externalCalendarId: PROVIDER_CAL.externalCalendarId },
      ACTOR,
    );

    expect(result.status).toBe('linked');
    if (result.status === 'linked') {
      expect(result.calendar.wasExisting).toBe(false);
      expect(result.calendar.id).toBeTruthy();
    }
  });
});
