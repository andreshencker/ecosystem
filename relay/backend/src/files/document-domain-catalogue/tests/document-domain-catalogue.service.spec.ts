import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentDomainCatalogueService } from '../document-domain-catalogue.service';
import { DocumentDomainCatalogue } from '../schemas/document-domain-catalogue.schema';

const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_COMPANY_ID = '507f1f77bcf86cd799439022';

function makeDoc(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(VALID_ID),
    companyId: new Types.ObjectId(VALID_COMPANY_ID),
    domainKey: 'invoices',
    displayName: 'Invoices',
    description: '',
    domainCategory: 'finance',
    allowedFormats: ['pdf', 'xlsx'],
    isActive: true,
    isSystem: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    toObject() {
      return this;
    },
    ...overrides,
  };
}

describe('DocumentDomainCatalogueService', () => {
  let service: DocumentDomainCatalogueService;
  let modelMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    modelMock = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    // Chain-able query mock
    function chainable(value: any) {
      const q: any = {
        sort: () => q,
        skip: () => q,
        limit: () => q,
        lean: () => Promise.resolve(value),
        exec: () => Promise.resolve(value),
      };
      return q;
    }

    modelMock.find.mockImplementation(() => chainable([]));
    modelMock.findById.mockImplementation(() => chainable(null));
    modelMock.findOne.mockImplementation(() => chainable(null));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentDomainCatalogueService,
        {
          provide: getModelToken(DocumentDomainCatalogue.name),
          useValue: modelMock,
        },
      ],
    }).compile();

    service = module.get<DocumentDomainCatalogueService>(
      DocumentDomainCatalogueService,
    );
  });

  // ─── create() ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a domain successfully', async () => {
      const doc = makeDoc();
      modelMock.create.mockResolvedValue([doc]);

      const result = await service.create({
        companyId: VALID_COMPANY_ID,
        domainKey: 'invoices',
        displayName: 'Invoices',
        domainCategory: 'finance',
        allowedFormats: ['pdf', 'xlsx'],
      });

      expect(result.domainKey).toBe('invoices');
      expect(result.allowedFormats).toEqual(['pdf', 'xlsx']);
      expect(modelMock.create).toHaveBeenCalledTimes(1);
    });

    it('throws 400 on duplicate key (code 11000)', async () => {
      modelMock.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({
          companyId: VALID_COMPANY_ID,
          domainKey: 'invoices',
          displayName: 'Invoices',
          domainCategory: 'finance',
        }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('throws 400 for invalid format', async () => {
      await expect(
        service.create({
          companyId: VALID_COMPANY_ID,
          domainKey: 'invoices',
          displayName: 'Invoices',
          domainCategory: 'finance',
          allowedFormats: ['docx'] as any,
        }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('throws 400 for invalid companyId', async () => {
      await expect(
        service.create({
          companyId: 'not-an-objectid',
          domainKey: 'invoices',
          displayName: 'Invoices',
          domainCategory: 'finance',
        }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('throws 400 for duplicate formats', async () => {
      await expect(
        service.create({
          companyId: VALID_COMPANY_ID,
          domainKey: 'invoices',
          displayName: 'Invoices',
          domainCategory: 'finance',
          allowedFormats: ['pdf', 'pdf'],
        }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });
  });

  // ─── findAll() ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns paginated list', async () => {
      const docs = [
        makeDoc(),
        makeDoc({ _id: new Types.ObjectId(), domainKey: 'contracts' }),
      ];
      const chainQ: any = {
        sort: () => chainQ,
        skip: () => chainQ,
        limit: () => chainQ,
        lean: () => Promise.resolve(docs),
      };
      modelMock.find.mockReturnValue(chainQ);
      modelMock.countDocuments.mockResolvedValue(2);

      const result = await service.findAll({
        companyId: VALID_COMPANY_ID,
        limit: 50,
        offset: 0,
      });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });
  });

  // ─── getById() ──────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('returns domain when found', async () => {
      const doc = makeDoc();
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(doc),
      }));

      const result = await service.getById(VALID_ID);
      expect(result.id).toBe(VALID_ID);
    });

    it('throws 404 when not found', async () => {
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(null),
      }));

      await expect(service.getById(VALID_ID)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  // ─── update() ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates successfully', async () => {
      const doc = makeDoc();
      const updated = makeDoc({ displayName: 'Updated Invoices' });
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(doc),
      }));
      modelMock.findByIdAndUpdate.mockResolvedValue({
        ...updated,
        toObject: () => updated,
      });

      const result = await service.update(VALID_ID, {
        displayName: 'Updated Invoices',
      });
      expect(result.displayName).toBe('Updated Invoices');
    });

    it('throws 404 when domain does not exist', async () => {
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(null),
      }));

      await expect(
        service.update(VALID_ID, { displayName: 'X' }),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    it('throws 403 when updating protected fields of a system domain', async () => {
      const systemDoc = makeDoc({ isSystem: true });
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(systemDoc),
      }));

      await expect(
        service.update(VALID_ID, { displayName: 'Hacked' }),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    });

    it('allows updating isActive on system domain', async () => {
      const systemDoc = makeDoc({ isSystem: true });
      const updated = makeDoc({ isSystem: true, isActive: false });
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(systemDoc),
      }));
      modelMock.findByIdAndUpdate.mockResolvedValue({
        ...updated,
        toObject: () => updated,
      });

      const result = await service.update(VALID_ID, { isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  // ─── remove() ───────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('deletes successfully', async () => {
      const doc = makeDoc();
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(doc),
      }));
      modelMock.findByIdAndDelete.mockResolvedValue(doc);

      const result = await service.remove(VALID_ID);
      expect(result.deleted).toBe(true);
    });

    it('throws 404 when not found', async () => {
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(null),
      }));

      await expect(service.remove(VALID_ID)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('throws 403 for system domains', async () => {
      const systemDoc = makeDoc({ isSystem: true });
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(systemDoc),
      }));

      await expect(service.remove(VALID_ID)).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });
  });
});
