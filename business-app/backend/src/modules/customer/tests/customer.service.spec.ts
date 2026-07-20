import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CustomerService } from '../customer.service';
import { Customer } from '../schemas/customer.schema';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import { CustomerCreatedEvent } from '../events/customer-created.event';
import { CustomerUpdatedEvent } from '../events/customer-updated.event';
import { CustomerDeactivatedEvent } from '../events/customer-deactivated.event';
import { toCustomerResponse, type CustomerAddressResponseDto, type CustomerLocationResponseDto } from '../dto/customer-response.dto';

const CMP = 'cmp_1';
const OTHER_CMP = 'cmp_other';
const VALID_ID = new Types.ObjectId().toHexString();

function mockChain(value: any) {
  const q: any = {};
  q.sort = () => q;
  q.skip = () => q;
  q.limit = () => q;
  q.lean = () => q;
  q.exec = () => Promise.resolve(value);
  return q;
}

const mockOutbox = { append: jest.fn().mockResolvedValue(undefined) };

function buildModelMock(overrides: Partial<Record<string, any>> = {}) {
  return {
    create: jest.fn(),
    find: jest.fn(() => mockChain([])),
    findOne: jest.fn(() => mockChain(null)),
    findOneAndUpdate: jest.fn(() => mockChain(null)),
    findOneAndDelete: jest.fn().mockResolvedValue({}),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    countDocuments: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function fakeCustomer(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(VALID_ID),
    companyId: CMP,
    type: 'company',
    displayName: 'Acme Ltd',
    abn: null,
    contact: { name: 'John Smith', email: 'john@acme.com', phone: null },
    // email / phone kept as legacy fields to test backward compat
    email: null,
    phone: null,
    address: null,
    notes: null,
    isActive: true,
    contacts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CustomerService', () => {
  let service: CustomerService;
  let model: ReturnType<typeof buildModelMock>;

  beforeEach(() => {
    mockOutbox.append.mockClear();
  });

  async function build(overrides: Partial<Record<string, any>> = {}) {
    model = buildModelMock(overrides);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getModelToken(Customer.name), useValue: model },
        { provide: OutboxService, useValue: mockOutbox },
      ],
    }).compile();
    service = module.get<CustomerService>(CustomerService);
  }

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('calls model.create with companyId and sanitised fields', async () => {
      const created = fakeCustomer();
      await build({ create: jest.fn().mockResolvedValue(created) });

      const result = await service.create(CMP, {
        type: 'company',
        displayName: '  Acme Ltd  ',
      });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: CMP,
          displayName: 'Acme Ltd',
          isActive: true,
        }),
      );
      expect((result as any).displayName).toBe('Acme Ltd');
    });

    it('stores contact.name and lowercases contact.email', async () => {
      const created = fakeCustomer({
        contact: { name: 'John Smith', email: 'john@acme.com', phone: null },
      });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Acme Ltd',
        contact: { name: 'John Smith', email: 'JOHN@ACME.COM', phone: '0412345678' },
      });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contact: expect.objectContaining({
            name: 'John Smith',
            email: 'john@acme.com',
            phone: '0412345678',
          }),
        }),
      );
    });

    it('stores null contact when no contact provided', async () => {
      const created = fakeCustomer({ contact: null });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, { type: 'company', displayName: 'Minimal Co' });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ contact: null }),
      );
    });

    it('publishes CustomerCreatedEvent to outbox after save', async () => {
      const created = fakeCustomer();
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, { type: 'company', displayName: 'Acme Ltd' });

      expect(mockOutbox.append).toHaveBeenCalledTimes(1);
      const event = mockOutbox.append.mock.calls[0][0];
      expect(event).toBeInstanceOf(CustomerCreatedEvent);
      expect(event.payload.businessId).toBe(CMP);
      expect(event.payload.customerId).toBe(String(created._id));
      expect(event.payload.displayName).toBe('Acme Ltd');
      expect(event.payload.isActive).toBe(true);
    });

    it('publishes CustomerCreatedEvent with correct customerType', async () => {
      const created = fakeCustomer({ type: 'individual' });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'individual',
        displayName: 'John Doe',
      });

      const event = mockOutbox.append.mock.calls[0][0];
      expect(event.payload.customerType).toBe('individual');
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('filters by companyId', async () => {
      const findMock = jest.fn(() => mockChain([fakeCustomer()]));
      await build({
        find: findMock,
        countDocuments: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll(CMP, { page: 1, limit: 25 });

      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: CMP }),
      );
      expect(result.total).toBe(1);
    });

    it('adds isActive filter when active param is provided', async () => {
      const findMock = jest.fn(() => mockChain([]));
      await build({ find: findMock });

      await service.findAll(CMP, { page: 1, limit: 10, active: true });

      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('adds $or search filter when search param is provided', async () => {
      const findMock = jest.fn(() => mockChain([]));
      await build({ find: findMock });

      await service.findAll(CMP, { page: 1, limit: 10, search: 'acme' });

      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
      );
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns null for invalid ObjectId', async () => {
      await build();
      const result = await service.findById('not-an-id', CMP);
      expect(result).toBeNull();
      expect(model.findOne).not.toHaveBeenCalled();
    });

    it('queries by _id AND companyId for tenant isolation', async () => {
      const findOneMock = jest.fn(() => mockChain(fakeCustomer()));
      await build({ findOne: findOneMock });

      await service.findById(VALID_ID, CMP);

      expect(findOneMock).toHaveBeenCalledWith({
        _id: VALID_ID,
        companyId: CMP,
      });
    });

    it('returns null when customer belongs to different company', async () => {
      await build({ findOne: jest.fn(() => mockChain(null)) });
      const result = await service.findById(VALID_ID, OTHER_CMP);
      expect(result).toBeNull();
    });
  });

  // ── findByIdOrThrow ───────────────────────────────────────────────────────

  describe('findByIdOrThrow', () => {
    it('throws NotFoundException when not found', async () => {
      await build({ findOne: jest.fn(() => mockChain(null)) });
      await expect(service.findByIdOrThrow(VALID_ID, CMP)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates only provided fields', async () => {
      const updated = fakeCustomer({ displayName: 'New Name' });
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      const result = await service.update(VALID_ID, CMP, {
        displayName: 'New Name',
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        { $set: { displayName: 'New Name' } },
        { new: true },
      );
      expect((result as any).displayName).toBe('New Name');
    });

    it('publishes CustomerUpdatedEvent to outbox after save', async () => {
      const updated = fakeCustomer({ displayName: 'New Name' });
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, { displayName: 'New Name' });

      expect(mockOutbox.append).toHaveBeenCalledTimes(1);
      const event = mockOutbox.append.mock.calls[0][0];
      expect(event).toBeInstanceOf(CustomerUpdatedEvent);
      expect(event.payload.businessId).toBe(CMP);
      expect(event.payload.customerId).toBe(VALID_ID);
      expect(event.payload.changedFields).toContain('displayName');
    });

    it('throws NotFoundException when customer not found before update', async () => {
      await build({ findOne: jest.fn(() => mockChain(null)) });
      await expect(
        service.update(VALID_ID, CMP, { displayName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates contact sub-fields using dot notation', async () => {
      const updated = fakeCustomer({
        contact: { name: 'Jane Doe', email: 'jane@acme.com', phone: null },
      });
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, {
        contact: { name: 'Jane Doe', email: 'JANE@ACME.COM' },
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        expect.objectContaining({
          $set: expect.objectContaining({
            'contact.name':  'Jane Doe',
            'contact.email': 'jane@acme.com',
          }),
        }),
        { new: true },
      );
    });

    it('includes contact in changedFields when contact is updated', async () => {
      const updated = fakeCustomer();
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, { contact: { phone: '0400000000' } });

      const event = mockOutbox.append.mock.calls[0][0];
      expect(event).toBeInstanceOf(CustomerUpdatedEvent);
      expect(event.payload.changedFields).toContain('contact');
    });
  });

  // ── backward-compat mapping ────────────────────────────────────────────────

  describe('toCustomerResponse backward compat', () => {
    it('maps old flat email/phone into contact when contact field is absent', async () => {

      const oldRecord = {
        _id: new Types.ObjectId(VALID_ID),
        companyId: CMP,
        type: 'company',
        displayName: 'Old Co',
        abn: null,
        // no contact field — old record
        email: 'old@company.com',
        phone: '0412000000',
        address: null,
        notes: null,
        isActive: true,
        contacts: [],
        billingRecipients: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = toCustomerResponse(oldRecord as any);

      expect(response.contact).toEqual({
        name:  null,
        email: 'old@company.com',
        phone: '0412000000',
      });
    });

    it('uses contact field when present (new record)', async () => {

      const newRecord = {
        _id: new Types.ObjectId(VALID_ID),
        companyId: CMP,
        type: 'company',
        displayName: 'New Co',
        abn: null,
        contact: { name: 'Alice', email: 'alice@newco.com', phone: '0400111222' },
        email: null,
        phone: null,
        address: null,
        notes: null,
        isActive: true,
        contacts: [],
        billingRecipients: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = toCustomerResponse(newRecord as any);

      expect(response.contact).toEqual({
        name:  'Alice',
        email: 'alice@newco.com',
        phone: '0400111222',
      });
    });
  });

  // ── deactivate ────────────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('sets isActive=false', async () => {
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() =>
          mockChain(fakeCustomer({ isActive: false })),
        ),
      });

      await service.deactivate(VALID_ID, CMP);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        { $set: { isActive: false } },
        { new: true },
      );
    });

    it('publishes CustomerDeactivatedEvent to outbox after save', async () => {
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() =>
          mockChain(fakeCustomer({ isActive: false })),
        ),
      });

      await service.deactivate(VALID_ID, CMP);

      expect(mockOutbox.append).toHaveBeenCalledTimes(1);
      const event = mockOutbox.append.mock.calls[0][0];
      expect(event).toBeInstanceOf(CustomerDeactivatedEvent);
      expect(event.payload.businessId).toBe(CMP);
      expect(event.payload.customerId).toBe(VALID_ID);
      expect(event.payload.deactivatedAt).toBeDefined();
    });

    it('throws BadRequestException if already inactive', async () => {
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer({ isActive: false }))),
      });
      await expect(service.deactivate(VALID_ID, CMP)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does NOT publish event if customer is already inactive', async () => {
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer({ isActive: false }))),
      });
      await expect(service.deactivate(VALID_ID, CMP)).rejects.toThrow();
      expect(mockOutbox.append).not.toHaveBeenCalled();
    });
  });

  // ── getContacts ───────────────────────────────────────────────────────────

  describe('getContacts', () => {
    it('returns the contacts array', async () => {
      const contacts = [
        {
          _id: new Types.ObjectId(),
          firstName: 'John',
          lastName: 'Doe',
          email: null,
          phone: null,
          role: null,
        },
      ];
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer({ contacts }))),
      });

      const result = await service.getContacts(VALID_ID, CMP);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });
  });

  // ── addContact ────────────────────────────────────────────────────────────

  describe('addContact', () => {
    it('pushes a contact and returns the last element', async () => {
      const contact = {
        _id: new Types.ObjectId(),
        firstName: 'Jane',
        lastName: 'Smith',
        email: null,
        phone: null,
        role: null,
      };
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() =>
          mockChain(fakeCustomer({ contacts: [contact] })),
        ),
      });

      const result = await service.addContact(VALID_ID, CMP, {
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        { $push: { contacts: expect.objectContaining({ firstName: 'Jane' }) } },
        { new: true },
      );
      expect(result.firstName).toBe('Jane');
    });
  });

  // ── address ───────────────────────────────────────────────────────────────

  describe('address', () => {
    it('stores full address on create', async () => {
      const created = fakeCustomer({
        address: { country: 'AU', state: 'NSW', city: 'Sydney', postalCode: '2000', line1: '1 George St', line2: null },
      });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Addr Co',
        address: { country: 'AU', state: 'NSW', city: 'Sydney', postalCode: '2000', line1: '1 George St' },
      });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: expect.objectContaining({ country: 'AU', city: 'Sydney', line1: '1 George St' }),
        }),
      );
    });

    it('stores null address when no address provided on create', async () => {
      const created = fakeCustomer({ address: null });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, { type: 'company', displayName: 'No Addr Co' });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ address: null }),
      );
    });

    it('updates address in $set using dot-notation-free replacement', async () => {
      const updated = fakeCustomer({
        address: { country: 'AU', state: 'VIC', city: 'Melbourne', postalCode: '3000', line1: '200 Collins St', line2: null },
      });
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, {
        address: { country: 'AU', state: 'VIC', city: 'Melbourne', postalCode: '3000', line1: '200 Collins St' },
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        expect.objectContaining({
          $set: expect.objectContaining({
            address: expect.objectContaining({ country: 'AU', city: 'Melbourne', line1: '200 Collins St' }),
          }),
        }),
        { new: true },
      );
    });
  });

  // ── address response mapping ───────────────────────────────────────────────

  describe('toCustomerResponse address mapping', () => {
    it('maps address fields correctly', () => {
      const doc = fakeCustomer({
        address: { country: 'AU', state: 'QLD', city: 'Brisbane', postalCode: '4000', line1: '1 Eagle St', line2: 'Level 10' },
        billingRecipients: [],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.address).toEqual<CustomerAddressResponseDto>({
        country: 'AU', state: 'QLD', city: 'Brisbane', postalCode: '4000', line1: '1 Eagle St', line2: 'Level 10',
      });
    });

    it('returns null address for records without address (backward compat)', () => {
      const resp = toCustomerResponse(fakeCustomer({ billingRecipients: [] }) as any);
      expect(resp.address).toBeNull();
    });

    it('coerces missing optional sub-fields to null', () => {
      const doc = fakeCustomer({
        address: { country: 'AU', city: 'Perth', line1: '1 St Georges Tce' },
        billingRecipients: [],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.address).toMatchObject({ state: null, postalCode: null, line2: null });
    });
  });

  // ── communicationPurposes mapping ─────────────────────────────────────────

  describe('communicationPurposes — toCustomerResponse', () => {
    it('maps a full communication purpose with email and SMS channels', () => {
      const doc = fakeCustomer({
        communicationPurposes: [
          {
            communicationDomainId: 'domain_abc',
            channels: [
              {
                channel: 'email',
                recipients: [
                  { email: 'accounts@co.com', recipientType: 'to' },
                  { email: 'ops@co.com',      recipientType: 'cc' },
                ],
              },
              {
                channel: 'sms',
                recipients: [{ phone: '+61411111111' }],
              },
            ],
          },
        ],
        billingRecipients: [],
      });

      const resp = toCustomerResponse(doc as any);

      expect(resp.communicationPurposes).toHaveLength(1);
      const cp = resp.communicationPurposes[0];
      expect(cp.communicationDomainId).toBe('domain_abc');
      expect(cp.channels).toHaveLength(2);

      const emailCh = cp.channels.find((c) => c.channel === 'email')!;
      expect(emailCh.recipients).toHaveLength(2);
      expect(emailCh.recipients[0]).toMatchObject({ email: 'accounts@co.com', recipientType: 'to' });
      expect(emailCh.recipients[1]).toMatchObject({ email: 'ops@co.com',      recipientType: 'cc' });

      const smsCh = cp.channels.find((c) => c.channel === 'sms')!;
      expect(smsCh.recipients[0]).toMatchObject({ phone: '+61411111111' });
    });

    it('returns empty communicationPurposes array for legacy customers (backward compat)', () => {
      const doc = fakeCustomer({ billingRecipients: [] }); // no communicationPurposes field
      const resp = toCustomerResponse(doc as any);
      expect(resp.communicationPurposes).toEqual([]);
    });

    it('stores communicationPurposes on create with email normalisation', async () => {
      const created = fakeCustomer({
        communicationPurposes: [
          {
            communicationDomainId: 'domain_1',
            channels: [
              { channel: 'email', recipients: [{ email: 'ACCOUNTS@CO.COM', recipientType: 'to' }] },
            ],
          },
        ],
      });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Test Co',
        communicationPurposes: [
          {
            communicationDomainId: 'domain_1',
            channels: [
              { channel: 'email', recipients: [{ email: 'ACCOUNTS@CO.COM', recipientType: 'to' }] },
            ],
          },
        ],
      });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          communicationPurposes: expect.arrayContaining([
            expect.objectContaining({
              communicationDomainId: 'domain_1',
              channels: expect.arrayContaining([
                expect.objectContaining({
                  channel: 'email',
                  recipients: expect.arrayContaining([
                    expect.objectContaining({ email: 'accounts@co.com', recipientType: 'to' }),
                  ]),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('replaces communicationPurposes atomically on update', async () => {
      const updated = fakeCustomer({ communicationPurposes: [] });
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, {
        communicationPurposes: [
          { communicationDomainId: 'new_domain', channels: [] },
        ],
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        expect.objectContaining({
          $set: expect.objectContaining({
            communicationPurposes: expect.arrayContaining([
              expect.objectContaining({ communicationDomainId: 'new_domain' }),
            ]),
          }),
        }),
        { new: true },
      );
    });

    it('stores SMS phone recipients without email or recipientType', async () => {
      const created = fakeCustomer({
        communicationPurposes: [
          {
            communicationDomainId: 'sms_domain',
            channels: [{ channel: 'sms', recipients: [{ phone: '+61422222222' }] }],
          },
        ],
      });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'SMS Co',
        communicationPurposes: [
          {
            communicationDomainId: 'sms_domain',
            channels: [{ channel: 'sms', recipients: [{ phone: '+61422222222' }] }],
          },
        ],
      });

      const callArg = model.create.mock.calls[0][0];
      const smsCh = callArg.communicationPurposes[0].channels[0];
      expect(smsCh.channel).toBe('sms');
      expect(smsCh.recipients[0].phone).toBe('+61422222222');
      expect(smsCh.recipients[0].email).toBeUndefined();
    });

    it('Customer only stores recipients — no credentialId, templateId or eventKey', async () => {
      const created = fakeCustomer({ communicationPurposes: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Clean Co',
        communicationPurposes: [
          { communicationDomainId: 'domain_1', channels: [] },
        ],
      });

      const stored = model.create.mock.calls[0][0].communicationPurposes[0];
      expect(stored).not.toHaveProperty('credentialId');
      expect(stored).not.toHaveProperty('templateId');
      expect(stored).not.toHaveProperty('eventKey');
      expect(stored).toHaveProperty('communicationDomainId');
      expect(stored).toHaveProperty('channels');
    });
  });

  // ── locations — toCustomerResponse ────────────────────────────────────────────

  describe('locations — toCustomerResponse', () => {
    it('maps stored locations correctly', () => {
      const locId = new Types.ObjectId();
      const doc = fakeCustomer({
        locations: [{
          _id: locId, tag: 'Warehouse', country: 'Australia',
          line1: '260 Horsley Road', line2: 'Unit 4',
          city: 'Milperra', postalCode: '2214', state: 'NSW',
        }],
        billingRecipients: [],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.locations).toHaveLength(1);
      expect(resp.locations[0]).toMatchObject<CustomerLocationResponseDto>({
        id: String(locId), tag: 'Warehouse', country: 'Australia',
        line1: '260 Horsley Road', line2: 'Unit 4',
        city: 'Milperra', postalCode: '2214', state: 'NSW',
      });
    });

    it('synthesizes locations[0] from legacy address when locations[] is empty', () => {
      const doc = fakeCustomer({
        address: { country: 'Australia', city: 'Sydney', line1: '1 George St', line2: null, postalCode: '2000', state: 'NSW' },
        billingRecipients: [],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.locations).toHaveLength(1);
      expect(resp.locations[0]).toMatchObject({
        id: 'legacy-address', tag: 'Main Address',
        country: 'Australia', city: 'Sydney', postalCode: '2000',
      });
    });

    it('returns empty locations for records with no address and no locations', () => {
      const doc = fakeCustomer({ address: null, billingRecipients: [] });
      const resp = toCustomerResponse(doc as any);
      expect(resp.locations).toEqual([]);
    });

    it('coerces missing optional sub-fields (line2, state) to null', () => {
      const locId = new Types.ObjectId();
      const doc = fakeCustomer({
        locations: [{ _id: locId, tag: 'HQ', country: 'AU', line1: '1 St', line2: null, city: 'Sydney', postalCode: '2000', state: null }],
        billingRecipients: [],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.locations[0]).toMatchObject({ line2: null, state: null });
    });

    it('maps multiple locations in order', () => {
      const doc = fakeCustomer({
        locations: [
          { _id: new Types.ObjectId(), tag: 'Head Office', country: 'AU', line1: '1 St', line2: null, city: 'Sydney', postalCode: '2000', state: null },
          { _id: new Types.ObjectId(), tag: 'Warehouse', country: 'AU', line1: '260 Horsley Rd', line2: null, city: 'Milperra', postalCode: '2214', state: null },
        ],
        billingRecipients: [],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.locations).toHaveLength(2);
      expect(resp.locations[0].tag).toBe('Head Office');
      expect(resp.locations[1].tag).toBe('Warehouse');
    });
  });

  // ── locations — service create/update ──────────────────────────────────────────

  describe('locations — service', () => {
    it('stores locations on create with normalisation', async () => {
      const created = fakeCustomer({ locations: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Location Co',
        locations: [{ tag: '  Warehouse  ', country: 'Australia', line1: '260 Horsley Road', city: 'Milperra', postalCode: '2214' }],
      });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          locations: expect.arrayContaining([
            expect.objectContaining({ tag: 'Warehouse', country: 'Australia', city: 'Milperra', postalCode: '2214' }),
          ]),
        }),
      );
    });

    it('stores multiple locations on create', async () => {
      const created = fakeCustomer({ locations: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Multi Location Co',
        locations: [
          { tag: 'Head Office', country: 'AU', line1: '1 George St', city: 'Sydney', postalCode: '2000' },
          { tag: 'Warehouse',   country: 'AU', line1: '260 Horsley Rd', city: 'Milperra', postalCode: '2214' },
        ],
      });

      const callArg = model.create.mock.calls[0][0];
      expect(callArg.locations).toHaveLength(2);
      expect(callArg.locations[0]).toMatchObject({ tag: 'Head Office' });
      expect(callArg.locations[1]).toMatchObject({ tag: 'Warehouse' });
    });

    it('stores empty locations array when no locations provided on create', async () => {
      const created = fakeCustomer({ locations: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, { type: 'company', displayName: 'No Location Co' });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ locations: [] }),
      );
    });

    it('stores null for optional line2 and state when omitted', async () => {
      const created = fakeCustomer({ locations: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Minimal Loc Co',
        locations: [{ tag: 'HQ', country: 'AU', line1: '1 St', city: 'Sydney', postalCode: '2000' }],
      });

      const loc = model.create.mock.calls[0][0].locations[0];
      expect(loc.line2).toBeNull();
      expect(loc.state).toBeNull();
    });

    it('replaces locations atomically on update', async () => {
      const updated = fakeCustomer({ locations: [] });
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, {
        locations: [{ tag: 'Head Office', country: 'AU', line1: '1 George St', city: 'Sydney', postalCode: '2000' }],
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        expect.objectContaining({
          $set: expect.objectContaining({
            locations: expect.arrayContaining([
              expect.objectContaining({ tag: 'Head Office', city: 'Sydney' }),
            ]),
          }),
        }),
        { new: true },
      );
    });

    it('includes locations in changedFields on update', async () => {
      const updated = fakeCustomer();
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, {
        locations: [{ tag: 'HQ', country: 'AU', line1: '1 St', city: 'Sydney', postalCode: '2000' }],
      });

      const event = mockOutbox.append.mock.calls[0][0];
      expect(event.payload.changedFields).toContain('locations');
    });

    it('does not modify locations when not provided in update DTO', async () => {
      const updated = fakeCustomer({ displayName: 'New Name' });
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, { displayName: 'New Name' });

      const $set = (model.findOneAndUpdate.mock.calls[0][1] as any).$set;
      expect($set).not.toHaveProperty('locations');
    });
  });

  // ── billingRecipient documentType mapping ─────────────────────────────────

  describe('toCustomerResponse billingRecipient documentType', () => {
    it('maps documentType and recipientType when present on the stored recipient', () => {
      const doc = fakeCustomer({
        billingRecipients: [
          { documentType: 'invoice', email: 'ap@co.com', recipientType: 'to' },
          { documentType: 'contract', email: 'legal@co.com', recipientType: 'cc' },
        ],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.billingRecipients[0]).toMatchObject({ documentType: 'invoice', email: 'ap@co.com', recipientType: 'to' });
      expect(resp.billingRecipients[1]).toMatchObject({ documentType: 'contract', email: 'legal@co.com', recipientType: 'cc' });
    });

    it('defaults documentType to "invoice" for legacy recipients without the field (backward compat)', () => {
      const doc = fakeCustomer({
        billingRecipients: [{ email: 'old@co.com', recipientType: 'to' }], // no documentType
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.billingRecipients[0].documentType).toBe('invoice');
    });

    it('falls back to legacy "type" field for recipientType on old DB records (backward compat)', () => {
      const doc = fakeCustomer({
        // Simulates a record written before the type→recipientType rename
        billingRecipients: [{ documentType: 'invoice', email: 'old@co.com', type: 'bcc' }],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.billingRecipients[0].recipientType).toBe('bcc');
    });

    it('includes bcc in recipientType mapping', () => {
      const doc = fakeCustomer({
        billingRecipients: [
          { documentType: 'quote', email: 'sales@co.com', recipientType: 'to' },
          { documentType: 'quote', email: 'mgr@co.com', recipientType: 'bcc' },
        ],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.billingRecipients[1].recipientType).toBe('bcc');
    });

    it('normalises documentType to "invoice" when missing during create', async () => {
      const created = fakeCustomer({
        billingRecipients: [{ documentType: 'invoice', email: 'ap@co.com', recipientType: 'to' }],
      });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Co',
        billingRecipients: [{ email: 'ap@co.com', recipientType: 'to', documentType: 'invoice' }],
      });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          billingRecipients: expect.arrayContaining([
            expect.objectContaining({ documentType: 'invoice', email: 'ap@co.com', recipientType: 'to' }),
          ]),
        }),
      );
    });

    it('stores all valid document types', async () => {
      const created = fakeCustomer({
        billingRecipients: [
          { documentType: 'quote', email: 'sales@co.com', recipientType: 'to' },
          { documentType: 'contract', email: 'legal@co.com', recipientType: 'cc' },
          { documentType: 'general', email: 'info@co.com', recipientType: 'to' },
        ],
      });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Multi Doc Co',
        billingRecipients: [
          { documentType: 'quote',    email: 'sales@co.com', recipientType: 'to' },
          { documentType: 'contract', email: 'legal@co.com', recipientType: 'cc' },
          { documentType: 'general',  email: 'info@co.com',  recipientType: 'to' },
        ],
      });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          billingRecipients: expect.arrayContaining([
            expect.objectContaining({ documentType: 'quote',    recipientType: 'to' }),
            expect.objectContaining({ documentType: 'contract', recipientType: 'cc' }),
            expect.objectContaining({ documentType: 'general',  recipientType: 'to' }),
          ]),
        }),
      );
    });
  });

  // ── contact locationId ────────────────────────────────────────────────────────

  describe('contact locationId — toCustomerResponse', () => {
    it('maps locationId when present on a contact', () => {
      const locId = new Types.ObjectId();
      const contactId = new Types.ObjectId();
      const doc = fakeCustomer({
        contact: null,  // no legacy contact so synthetic entry is not prepended
        contacts: [{
          _id: contactId, firstName: 'Angela', lastName: '', email: null,
          phone: null, role: null, isPrimary: true, locationId: String(locId),
        }],
        billingRecipients: [],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.contacts[0].locationId).toBe(String(locId));
    });

    it('returns null locationId for contacts without one (backward compat)', () => {
      const doc = fakeCustomer({
        contacts: [{ _id: new Types.ObjectId(), firstName: 'Bob', lastName: '', email: null, phone: null, role: null, isPrimary: true }],
        billingRecipients: [],
      });
      const resp = toCustomerResponse(doc as any);
      expect(resp.contacts[0].locationId).toBeNull();
    });

    it('synthesized legacy primary contact has locationId null', () => {
      const doc = { ...fakeCustomer(), contact: { name: 'Eve', email: 'eve@legacy.com', phone: null }, contacts: [], billingRecipients: [] };
      const resp = toCustomerResponse(doc as any);
      expect(resp.contacts[0].locationId).toBeNull();
    });
  });

  describe('contact locationIndex — service create', () => {
    it('resolves locationIndex to the generated location _id on create', async () => {
      const created = fakeCustomer({ locations: [], contacts: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Co',
        locations: [{ tag: 'Warehouse', country: 'AU', line1: '1 St', city: 'Sydney', postalCode: '2000' }],
        contacts:  [{ firstName: 'Angela', locationIndex: 0 }],
      });

      const callArg = model.create.mock.calls[0][0];
      const builtLocationId = String(callArg.locations[0]._id);
      expect(callArg.contacts[0].locationId).toBe(builtLocationId);
    });

    it('sets locationId null when no locationIndex is provided', async () => {
      const created = fakeCustomer({ locations: [], contacts: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Co',
        contacts: [{ firstName: 'Bob' }],
      });

      const callArg = model.create.mock.calls[0][0];
      expect(callArg.contacts[0].locationId).toBeNull();
    });

    it('sets locationId null when locationIndex is out of bounds', async () => {
      const created = fakeCustomer({ locations: [], contacts: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Co',
        locations: [{ tag: 'HQ', country: 'AU', line1: '1 St', city: 'Sydney', postalCode: '2000' }],
        contacts:  [{ firstName: 'Eve', locationIndex: 99 }],
      });

      const callArg = model.create.mock.calls[0][0];
      expect(callArg.contacts[0].locationId).toBeNull();
    });

    it('does not store contact name or address on the contact — only locationId', async () => {
      const created = fakeCustomer({ locations: [], contacts: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Co',
        locations: [{ tag: 'Warehouse', country: 'AU', line1: '1 St', city: 'Sydney', postalCode: '2000' }],
        contacts:  [{ firstName: 'Frank', locationIndex: 0 }],
      });

      const contact = model.create.mock.calls[0][0].contacts[0];
      expect(contact).toHaveProperty('locationId');
      expect(contact).not.toHaveProperty('locationTag');
      expect(contact).not.toHaveProperty('locationAddress');
      expect(contact).not.toHaveProperty('country');
    });
  });

  describe('contact locationIndex — service update', () => {
    it('resolves locationIndex when locations and contacts are updated together', async () => {
      const updated = fakeCustomer({ locations: [], contacts: [] });
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, {
        locations: [{ tag: 'HQ', country: 'AU', line1: '1 St', city: 'Sydney', postalCode: '2000' }],
        contacts:  [{ firstName: 'Grace', locationIndex: 0 }],
      });

      const $set = (model.findOneAndUpdate.mock.calls[0][1] as any).$set;
      const builtLocationId = String($set.locations[0]._id);
      expect($set.contacts[0].locationId).toBe(builtLocationId);
    });

    it('sets locationId null when contacts updated without co-submitted locations', async () => {
      const updated = fakeCustomer({ contacts: [] });
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, {
        contacts: [{ firstName: 'Henry', locationIndex: 0 }],
      });

      const $set = (model.findOneAndUpdate.mock.calls[0][1] as any).$set;
      expect($set.contacts[0].locationId).toBeNull();
    });
  });

  describe('buildLocations — _id preservation', () => {
    it('preserves existing _id when a valid ObjectId is supplied in l.id', async () => {
      const existingId = new Types.ObjectId().toHexString();
      const created = fakeCustomer({ locations: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Co',
        locations: [{ id: existingId, tag: 'HQ', country: 'AU', line1: '1 St', city: 'Sydney', postalCode: '2000' }],
      });

      const callArg = model.create.mock.calls[0][0];
      expect(String(callArg.locations[0]._id)).toBe(existingId);
    });

    it('generates a new _id when no id is supplied', async () => {
      const created = fakeCustomer({ locations: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Co',
        locations: [{ tag: 'HQ', country: 'AU', line1: '1 St', city: 'Sydney', postalCode: '2000' }],
      });

      const callArg = model.create.mock.calls[0][0];
      expect(callArg.locations[0]._id).toBeInstanceOf(Types.ObjectId);
    });

    it('generates a new _id when an invalid id string is supplied', async () => {
      const created = fakeCustomer({ locations: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Co',
        locations: [{ id: 'not-a-valid-object-id', tag: 'HQ', country: 'AU', line1: '1 St', city: 'Sydney', postalCode: '2000' }],
      });

      const callArg = model.create.mock.calls[0][0];
      expect(callArg.locations[0]._id).toBeInstanceOf(Types.ObjectId);
      expect(String(callArg.locations[0]._id)).not.toBe('not-a-valid-object-id');
    });
  });

  // ── removeContact ─────────────────────────────────────────────────────────

  describe('removeContact', () => {
    it('throws NotFoundException for invalid contactId', async () => {
      await build({ findOne: jest.fn(() => mockChain(fakeCustomer())) });
      await expect(
        service.removeContact(VALID_ID, CMP, 'not-valid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('calls $pull with contactId ObjectId', async () => {
      const contactId = new Types.ObjectId().toHexString();
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(fakeCustomer())),
      });

      await service.removeContact(VALID_ID, CMP, contactId);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        { $pull: { contacts: { _id: expect.any(Types.ObjectId) } } },
        { new: true },
      );
    });
  });

  // ── activate ──────────────────────────────────────────────────────────────

  describe('activate', () => {
    it('sets isActive=true on an inactive customer', async () => {
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer({ isActive: false }))),
        findOneAndUpdate: jest.fn(() => mockChain(fakeCustomer({ isActive: true }))),
      });

      await service.activate(VALID_ID, CMP);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        { $set: { isActive: true } },
        { new: true },
      );
    });

    it('throws BadRequestException if already active', async () => {
      await build({ findOne: jest.fn(() => mockChain(fakeCustomer({ isActive: true }))) });
      await expect(service.activate(VALID_ID, CMP)).rejects.toThrow(BadRequestException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('calls findOneAndDelete with correct filter', async () => {
      const deleteMock = jest.fn().mockResolvedValue({ _id: VALID_ID });
      await build({ findOneAndDelete: deleteMock });

      await service.delete(VALID_ID, CMP);

      expect(deleteMock).toHaveBeenCalledWith({ _id: VALID_ID, companyId: CMP });
    });

    it('throws NotFoundException when customer not found', async () => {
      await build({ findOneAndDelete: jest.fn().mockResolvedValue(null) });
      await expect(service.delete(VALID_ID, CMP)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create with contacts[] ────────────────────────────────────────────────

  describe('create with contacts[]', () => {
    it('embeds contacts with isPrimary and derives contact field from primary', async () => {
      const created = fakeCustomer({
        contacts: [{ _id: new Types.ObjectId(), firstName: 'Alice', lastName: '', email: 'alice@co.com', phone: null, role: null, isPrimary: true }],
        contact:  { name: 'Alice', email: 'alice@co.com', phone: null },
      });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, {
        type: 'company',
        displayName: 'Co',
        contacts: [{ firstName: 'Alice', email: 'alice@co.com', isPrimary: true }],
      });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contacts: expect.arrayContaining([
            expect.objectContaining({ firstName: 'Alice', isPrimary: true }),
          ]),
          contact: expect.objectContaining({ name: 'Alice', email: 'alice@co.com' }),
        }),
      );
    });

    it('creates an empty contacts array when no contacts provided', async () => {
      const created = fakeCustomer({ contacts: [] });
      await build({ create: jest.fn().mockResolvedValue(created) });

      await service.create(CMP, { type: 'company', displayName: 'Bare Co' });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ contacts: [] }),
      );
    });
  });

  // ── update with contacts[] ────────────────────────────────────────────────

  describe('update with contacts[]', () => {
    it('replaces contacts array atomically and updates contact from primary', async () => {
      const updated = fakeCustomer();
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      });

      await service.update(VALID_ID, CMP, {
        contacts: [{ firstName: 'Bob', isPrimary: true }],
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        expect.objectContaining({
          $set: expect.objectContaining({
            contacts: expect.arrayContaining([
              expect.objectContaining({ firstName: 'Bob', isPrimary: true }),
            ]),
            contact: expect.objectContaining({ name: 'Bob' }),
          }),
        }),
        { new: true },
      );
    });
  });

  // ── isPrimary in contacts ─────────────────────────────────────────────────

  describe('addContact with isPrimary', () => {
    it('clears existing isPrimary flags before adding a primary contact', async () => {
      const newContact = { _id: new Types.ObjectId(), firstName: 'Dave', lastName: '', email: null, phone: null, role: null, isPrimary: true };
      await build({
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        updateOne: jest.fn().mockResolvedValue({}),
        findOneAndUpdate: jest.fn(() => mockChain(fakeCustomer({ contacts: [newContact] }))),
      });

      await service.addContact(VALID_ID, CMP, { firstName: 'Dave', isPrimary: true });

      // updateOne clears all isPrimary flags first
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: VALID_ID, companyId: CMP },
        { $set: { 'contacts.$[].isPrimary': false } },
      );
    });
  });

  // ── response: synthesized primary from legacy contact ─────────────────────

  describe('toCustomerResponse contacts synthesis', () => {
    it('includes synthetic primary contact from legacy contact field when contacts[] is empty', () => {
      const doc = {
        _id: new Types.ObjectId(VALID_ID),
        companyId: CMP,
        type: 'company',
        displayName: 'Legacy Co',
        abn: null,
        contact: { name: 'Eve', email: 'eve@legacy.com', phone: null },
        email: null, phone: null, address: null, notes: null, isActive: true,
        contacts: [],
        billingRecipients: [],
        createdAt: new Date(), updatedAt: new Date(),
      };

      const resp = toCustomerResponse(doc as any);
      // contacts[] should have the synthetic entry
      expect(resp.contacts).toHaveLength(1);
      expect(resp.contacts[0]).toMatchObject({ firstName: 'Eve', isPrimary: true, id: 'legacy-primary' });
      // contact summary should still be correct
      expect(resp.contact).toMatchObject({ name: 'Eve', email: 'eve@legacy.com' });
    });

    it('does not add synthetic entry when contacts[] already has an isPrimary', () => {
      const contactId = new Types.ObjectId();
      const doc = {
        _id: new Types.ObjectId(VALID_ID),
        companyId: CMP,
        type: 'company',
        displayName: 'New Co',
        abn: null,
        contact: { name: 'Old Name', email: 'old@co.com', phone: null },
        email: null, phone: null, address: null, notes: null, isActive: true,
        contacts: [{ _id: contactId, firstName: 'Frank', lastName: '', email: 'frank@co.com', phone: null, role: null, isPrimary: true }],
        billingRecipients: [],
        createdAt: new Date(), updatedAt: new Date(),
      };

      const resp = toCustomerResponse(doc as any);
      expect(resp.contacts).toHaveLength(1);
      expect(resp.contacts[0].firstName).toBe('Frank');
      // contact summary derived from isPrimary in contacts[]
      expect(resp.contact).toMatchObject({ name: 'Frank', email: 'frank@co.com' });
    });

    it('contact summary comes from isPrimary entry in contacts[] (new canonical path)', () => {
      const contactId = new Types.ObjectId();
      const doc = {
        _id: new Types.ObjectId(VALID_ID),
        companyId: CMP,
        type: 'company',
        displayName: 'Co',
        abn: null,
        contact: null,
        email: null, phone: null, address: null, notes: null, isActive: true,
        contacts: [
          { _id: new Types.ObjectId(), firstName: 'Grace', lastName: 'Jones', email: 'grace@co.com', phone: '0400000001', role: null, isPrimary: true },
          { _id: contactId, firstName: 'Henry', lastName: '', email: 'henry@co.com', phone: null, role: 'Accounts', isPrimary: false },
        ],
        billingRecipients: [],
        createdAt: new Date(), updatedAt: new Date(),
      };

      const resp = toCustomerResponse(doc as any);
      expect(resp.contacts).toHaveLength(2);
      expect(resp.contact).toMatchObject({ name: 'Grace Jones', email: 'grace@co.com' });
    });
  });
});
