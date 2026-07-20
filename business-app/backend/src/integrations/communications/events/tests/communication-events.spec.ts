import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { of } from 'rxjs';

import { CommunicationEventsService } from '../communication-events.service';
import { CommunicationConnectionService } from '../../connection/communication-connection.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const REMOTE_CO_ID = 'remote_co_001';
const DOMAIN_ID    = 'domain_001';
const EVENT_ID     = 'event_abc123';

const FAKE_CONN = {
  communicationCompanyId: REMOTE_CO_ID,
  decryptedToken:         'tok_secret',
  status:                 'connected' as const,
  isActive:               true,
};

const FAKE_DOMAIN = {
  id:             DOMAIN_ID,
  companyId:      REMOTE_CO_ID,
  domainKey:      'invoicing',
  displayName:    'Invoicing',
  domainCategory: 'billing',
  isActive:       true,
};

function makeEvent(overrides: Partial<Record<string, any>> = {}): Record<string, any> {
  return {
    id:               EVENT_ID,
    domainCatalogueId: {
      companyId:      REMOTE_CO_ID,
      domainKey:      'invoicing',
      displayName:    'Invoicing',
      domainCategory: 'billing',
      isActive:       true,
    },
    eventKey:    'invoice_sent',
    displayName: 'Invoice Sent',
    description: '',
    eventType:   'notification',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Your invoice',
        content: '<p>Hello</p>',
        requiredVariables: ['data.customerName'],
        optionalVariables: [],
        files: { required: [], optional: [] },
      },
      sms: { enabled: false, content: '', requiredVariables: [], optionalVariables: [] },
    },
    isActive:    true,
    scope:       'company',
    senderScope: 'company',
    createdAt:   '2026-01-01T00:00:00.000Z',
    updatedAt:   '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function pageOf(...items: Record<string, any>[]) {
  return { data: items, total: items.length, limit: 50, offset: 0 };
}

const mockConnectionService = {
  getCommunicationConnectionForContext: jest.fn().mockResolvedValue(FAKE_CONN),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'COMMUNICATION_API_URL') return 'http://comms.test';
    if (key === 'COMMUNICATION_API_KEY') return 'admin-key-123';
    return undefined;
  }),
};

// ─── Test builder ─────────────────────────────────────────────────────────────

type MockGet  = jest.Mock;
type MockPost = jest.Mock;
type MockPatch = jest.Mock;
type MockDelete = jest.Mock;

async function buildService(http: {
  get?:    MockGet;
  post?:   MockPost;
  patch?:  MockPatch;
  delete?: MockDelete;
}) {
  const httpMock = {
    get:    jest.fn().mockReturnValue(of({ data: pageOf(), status: 200 })),
    post:   jest.fn().mockReturnValue(of({ data: makeEvent(), status: 201 })),
    patch:  jest.fn().mockReturnValue(of({ data: makeEvent(), status: 200 })),
    delete: jest.fn().mockReturnValue(of({ data: { deleted: true }, status: 200 })),
    ...http,
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CommunicationEventsService,
      { provide: CommunicationConnectionService, useValue: mockConnectionService },
      { provide: HttpService, useValue: httpMock },
      { provide: ConfigService, useValue: mockConfig },
    ],
  }).compile();
  return { service: module.get(CommunicationEventsService), httpMock };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CommunicationEventsService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectionService.getCommunicationConnectionForContext.mockResolvedValue(FAKE_CONN);
  });

  // ── Token resolution ─────────────────────────────────────────────────────────

  describe('token resolution', () => {
    it('resolves the business connection on every request', async () => {
      const { service } = await buildService({});
      await service.list('biz_001', { domainCatalogueId: DOMAIN_ID, page: 1, limit: 25 });

      expect(mockConnectionService.getCommunicationConnectionForContext)
        .toHaveBeenCalledWith('business', 'biz_001');
    });

    it('throws 503 when no active connection exists', async () => {
      mockConnectionService.getCommunicationConnectionForContext.mockResolvedValue(null);
      const { service } = await buildService({});

      await expect(
        service.list('biz_001', { domainCatalogueId: DOMAIN_ID, page: 1, limit: 25 }),
      ).rejects.toMatchObject({ status: 503 });
    });

    it('throws 503 when connection exists but isActive is false', async () => {
      mockConnectionService.getCommunicationConnectionForContext.mockResolvedValue({
        ...FAKE_CONN,
        isActive: false,
      });
      const { service } = await buildService({});

      await expect(
        service.list('biz_001', { domainCatalogueId: DOMAIN_ID, page: 1, limit: 25 }),
      ).rejects.toMatchObject({ status: 503 });
    });
  });

  // ── Auth header ───────────────────────────────────────────────────────────────

  describe('auth header', () => {
    it('sends COMMUNICATION_API_KEY as x-api-key (never the integration token)', async () => {
      const { service, httpMock } = await buildService({});
      await service.list('biz_001', { domainCatalogueId: DOMAIN_ID });

      const headers = httpMock.get.mock.calls[0][1].headers;
      expect(headers['x-api-key']).toBe('admin-key-123');
      expect(headers['x-api-key']).not.toBe(FAKE_CONN.decryptedToken);
    });
  });

  // ── list ─────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('calls /event-catalogue with domainCatalogueId and pagination', async () => {
      const { service, httpMock } = await buildService({
        get: jest.fn().mockReturnValue(of({ data: pageOf(makeEvent()), status: 200 })),
      });

      const result = await service.list('biz_001', {
        domainCatalogueId: DOMAIN_ID,
        page: 2,
        limit: 10,
      });

      const url: string = httpMock.get.mock.calls[0][0];
      expect(url).toContain('/event-catalogue?');
      expect(url).toContain(`domainCatalogueId=${DOMAIN_ID}`);
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=10');
      expect(result.data).toHaveLength(1);
    });

    it('passes active filter to Communications when set', async () => {
      const { service, httpMock } = await buildService({});
      await service.list('biz_001', { domainCatalogueId: DOMAIN_ID, active: false });

      const url: string = httpMock.get.mock.calls[0][0];
      expect(url).toContain('active=false');
    });

    it('does not pass active when not set', async () => {
      const { service, httpMock } = await buildService({});
      await service.list('biz_001', { domainCatalogueId: DOMAIN_ID });

      const url: string = httpMock.get.mock.calls[0][0];
      expect(url).not.toContain('active=');
    });

    it('always requests populateDomainCatalogue=true', async () => {
      const { service, httpMock } = await buildService({});
      await service.list('biz_001', { domainCatalogueId: DOMAIN_ID });

      const url: string = httpMock.get.mock.calls[0][0];
      expect(url).toContain('populateDomainCatalogue=true');
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('fetches the event and returns it when ownership matches', async () => {
      const { service } = await buildService({
        get: jest.fn().mockReturnValue(of({ data: makeEvent(), status: 200 })),
      });

      const result = await service.findOne('biz_001', EVENT_ID);
      expect(result.id).toBe(EVENT_ID);
    });

    it('throws 403 when domain belongs to a different company', async () => {
      const { service } = await buildService({
        get: jest.fn().mockReturnValue(
          of({
            data: makeEvent({
              domainCatalogueId: { companyId: 'other_co', domainKey: 'x', displayName: 'X', domainCategory: 'x', isActive: true },
            }),
            status: 200,
          }),
        ),
      });

      await expect(service.findOne('biz_001', EVENT_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('verifies domain ownership before creating an event', async () => {
      const { service, httpMock } = await buildService({
        get:  jest.fn().mockReturnValue(of({ data: FAKE_DOMAIN, status: 200 })),
        post: jest.fn().mockReturnValue(of({ data: makeEvent(), status: 201 })),
      });

      await service.create('biz_001', {
        domainCatalogueId: DOMAIN_ID,
        eventKey:    'invoice_sent',
        displayName: 'Invoice Sent',
        eventType:   'notification',
      });

      const domainUrl: string = httpMock.get.mock.calls[0][0];
      expect(domainUrl).toContain(`/domain-catalogue/${DOMAIN_ID}`);
    });

    it('builds the correct request body and POSTs to /event-catalogue', async () => {
      const { service, httpMock } = await buildService({
        get:  jest.fn().mockReturnValue(of({ data: FAKE_DOMAIN, status: 200 })),
        post: jest.fn().mockReturnValue(of({ data: makeEvent(), status: 201 })),
      });

      await service.create('biz_001', {
        domainCatalogueId: DOMAIN_ID,
        eventKey:    'invoice_sent',
        displayName: 'Invoice Sent',
        eventType:   'notification',
        isActive:    true,
        channelContent: {
          email: { enabled: true, subject: 'Hi', content: '<p>Hello</p>' },
        },
      });

      const postUrl: string = httpMock.post.mock.calls[0][0];
      expect(postUrl).toContain('/event-catalogue');
      expect(postUrl).not.toContain('/event-catalogue/');

      const body = httpMock.post.mock.calls[0][1];
      expect(body.domainCatalogueId).toBe(DOMAIN_ID);
      expect(body.eventKey).toBe('invoice_sent');
      expect(body.displayName).toBe('Invoice Sent');
      expect(body.channelContent.email.enabled).toBe(true);
    });

    it('throws 403 when domain belongs to a different company', async () => {
      const { service } = await buildService({
        get: jest.fn().mockReturnValue(
          of({ data: { ...FAKE_DOMAIN, companyId: 'other_co' }, status: 200 }),
        ),
      });

      await expect(
        service.create('biz_001', {
          domainCatalogueId: DOMAIN_ID,
          eventKey: 'x',
          displayName: 'X',
          eventType: 'notification',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('defaults description to empty string and isActive to true', async () => {
      const { service, httpMock } = await buildService({
        get:  jest.fn().mockReturnValue(of({ data: FAKE_DOMAIN, status: 200 })),
        post: jest.fn().mockReturnValue(of({ data: makeEvent(), status: 201 })),
      });

      await service.create('biz_001', {
        domainCatalogueId: DOMAIN_ID,
        eventKey: 'test',
        displayName: 'Test',
        eventType: 'notification',
      });

      const body = httpMock.post.mock.calls[0][1];
      expect(body.description).toBe('');
      expect(body.isActive).toBe(true);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('verifies ownership then PATCHes the event', async () => {
      const { service, httpMock } = await buildService({
        get:   jest.fn().mockReturnValue(of({ data: makeEvent(), status: 200 })),
        patch: jest.fn().mockReturnValue(of({ data: makeEvent({ displayName: 'Updated' }), status: 200 })),
      });

      const result = await service.update('biz_001', EVENT_ID, { displayName: 'Updated' });

      expect(httpMock.patch).toHaveBeenCalledWith(
        expect.stringContaining(`/event-catalogue/${EVENT_ID}`),
        { displayName: 'Updated' },
        expect.objectContaining({ headers: { 'x-api-key': 'admin-key-123' } }),
      );
      expect(result.displayName).toBe('Updated');
    });

    it('throws 403 when event belongs to a different company', async () => {
      const { service } = await buildService({
        get: jest.fn().mockReturnValue(
          of({
            data: makeEvent({
              domainCatalogueId: { companyId: 'other_co', domainKey: 'x', displayName: 'X', domainCategory: 'x', isActive: true },
            }),
            status: 200,
          }),
        ),
      });

      await expect(
        service.update('biz_001', EVENT_ID, { displayName: 'Hacked' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('verifies ownership then deletes the event', async () => {
      const { service, httpMock } = await buildService({
        get:    jest.fn().mockReturnValue(of({ data: makeEvent(), status: 200 })),
        delete: jest.fn().mockReturnValue(of({ data: { deleted: true }, status: 200 })),
      });

      const result = await service.remove('biz_001', EVENT_ID);

      const deleteUrl: string = httpMock.delete.mock.calls[0][0];
      expect(deleteUrl).toContain(`/event-catalogue/${EVENT_ID}`);
      expect(result.deleted).toBe(true);
    });

    it('throws 403 when event belongs to a different company', async () => {
      const { service } = await buildService({
        get: jest.fn().mockReturnValue(
          of({
            data: makeEvent({
              domainCatalogueId: { companyId: 'other_co', domainKey: 'x', displayName: 'X', domainCategory: 'x', isActive: true },
            }),
            status: 200,
          }),
        ),
      });

      await expect(service.remove('biz_001', EVENT_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ── bulkImport ────────────────────────────────────────────────────────────────

  describe('bulkImport', () => {
    const items = [
      { eventKey: 'evt_a', displayName: 'Event A', eventType: 'notification' },
      { eventKey: 'evt_b', displayName: 'Event B', eventType: 'alert' },
    ];

    it('verifies domain ownership then POSTs to /event-catalogue/bulk', async () => {
      const { service, httpMock } = await buildService({
        get:  jest.fn().mockReturnValue(of({ data: FAKE_DOMAIN, status: 200 })),
        post: jest.fn().mockReturnValue(of({ data: [makeEvent(), makeEvent()], status: 201 })),
      });

      await service.bulkImport('biz_001', DOMAIN_ID, items);

      const postUrl: string = httpMock.post.mock.calls[0][0];
      expect(postUrl).toContain('/event-catalogue/bulk');

      const body = httpMock.post.mock.calls[0][1];
      expect(body.domainCatalogueId).toBe(DOMAIN_ID);
      expect(body.items).toHaveLength(2);
    });

    it('throws 403 when domain belongs to a different company', async () => {
      const { service } = await buildService({
        get: jest.fn().mockReturnValue(
          of({ data: { ...FAKE_DOMAIN, companyId: 'other_co' }, status: 200 }),
        ),
      });

      await expect(
        service.bulkImport('biz_001', DOMAIN_ID, items),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ── error mapping ─────────────────────────────────────────────────────────────

  describe('error mapping', () => {
    it('forwards Communications 400 message to the caller', async () => {
      const error = Object.assign(new Error('dup key'), {
        response: {
          status: 400,
          data: { message: 'Event already exists in this domainCatalogue (domainCatalogueId + eventKey)' },
        },
      });

      const { service } = await buildService({
        get:  jest.fn().mockReturnValue(of({ data: FAKE_DOMAIN, status: 200 })),
        post: jest.fn().mockImplementation(() => { throw error; }),
      });

      let caught: HttpException | null = null;
      try {
        await service.create('biz_001', {
          domainCatalogueId: DOMAIN_ID,
          eventKey: 'dup',
          displayName: 'Dup',
          eventType: 'notification',
        });
      } catch (e) {
        caught = e as HttpException;
      }
      expect(caught?.getStatus()).toBe(400);
      expect(caught?.message).toContain('Event already exists');
    });

    it('returns 502 when Communications is unreachable', async () => {
      const error = new Error('ECONNREFUSED');

      const { service } = await buildService({
        get:  jest.fn().mockReturnValue(of({ data: FAKE_DOMAIN, status: 200 })),
        post: jest.fn().mockImplementation(() => { throw error; }),
      });

      let caught: HttpException | null = null;
      try {
        await service.create('biz_001', {
          domainCatalogueId: DOMAIN_ID,
          eventKey: 'x',
          displayName: 'X',
          eventType: 'notification',
        });
      } catch (e) {
        caught = e as HttpException;
      }
      expect(caught?.getStatus()).toBe(502);
    });
  });

  // ── no local persistence ──────────────────────────────────────────────────────

  describe('no local persistence', () => {
    it('does not inject a Mongoose model', () => {
      // Verify the service only has the three constructor dependencies
      const meta = Reflect.getMetadata('design:paramtypes', CommunicationEventsService);
      expect(meta).toHaveLength(3); // ConnectionService, HttpService, ConfigService
    });
  });
});
