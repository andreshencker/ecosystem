import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentCatalogueService } from '../document-catalogue.service';
import { DocumentCatalogue } from '../schemas/document-catalogue.schema';
import { DocumentDomainCatalogue } from '../../document-domain-catalogue/schemas/document-domain-catalogue.schema';

const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_DOMAIN_ID = '507f1f77bcf86cd799439022';
const VALID_COMPANY_ID = '507f1f77bcf86cd799439033';

function makeDomain(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(VALID_DOMAIN_ID),
    companyId: new Types.ObjectId(VALID_COMPANY_ID),
    domainKey: 'invoices',
    displayName: 'Invoices',
    domainCategory: 'finance',
    allowedFormats: ['pdf', 'xlsx'],
    isActive: true,
    isSystem: false,
    ...overrides,
  };
}

function makeDoc(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(VALID_ID),
    documentDomainCatalogueId: new Types.ObjectId(VALID_DOMAIN_ID),
    documentKey: 'invoice_report',
    displayName: 'Invoice Report',
    description: '',
    formatContracts: {
      pdf: {
        enabled: true,
        version: '1.0',
        layoutType: 'pdf',
        layoutKey: '',
        sections: [],
        requiredFields: [],
        optionalFields: [],
        notes: '',
      },
    },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    toObject() {
      return this;
    },
    ...overrides,
  };
}

describe('DocumentCatalogueService', () => {
  let service: DocumentCatalogueService;
  let modelMock: Record<string, jest.Mock>;
  let domainModelMock: Record<string, jest.Mock>;

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

    domainModelMock = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };

    function chainable(value: any, extra: Record<string, any> = {}) {
      const q: any = {
        select: () => q,
        sort: () => q,
        skip: () => q,
        limit: () => q,
        populate: () => q,
        lean: () => Promise.resolve(value),
        ...extra,
      };
      return q;
    }

    modelMock.find.mockImplementation(() => chainable([]));
    modelMock.findById.mockImplementation(() => chainable(null));
    modelMock.findOne.mockImplementation(() => chainable(null));
    domainModelMock.findById.mockImplementation(() => chainable(null));
    domainModelMock.findOne.mockImplementation(() => chainable(null));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentCatalogueService,
        { provide: getModelToken(DocumentCatalogue.name), useValue: modelMock },
        {
          provide: getModelToken(DocumentDomainCatalogue.name),
          useValue: domainModelMock,
        },
      ],
    }).compile();

    service = module.get<DocumentCatalogueService>(DocumentCatalogueService);
  });

  // ─── findByCompanyAndCanonicalKey() ─────────────────────────────────────────

  describe('findByCompanyAndCanonicalKey()', () => {
    it('resolves successfully with a valid canonical key', async () => {
      const domain = makeDomain();
      const doc = makeDoc();
      domainModelMock.findOne.mockImplementation(() => ({
        select: () => ({ lean: () => Promise.resolve(domain) }),
      }));
      modelMock.findOne.mockImplementation(() => ({
        populate: () => ({ lean: () => Promise.resolve(doc) }),
      }));

      const result = await service.findByCompanyAndCanonicalKey(
        VALID_COMPANY_ID,
        'invoices.invoice_report.pdf',
      );
      expect(result.resolvedFormat).toBe('pdf');
      expect(result.documentKey).toBe('invoice_report');
    });

    it('throws 400 for malformed canonical key', async () => {
      await expect(
        service.findByCompanyAndCanonicalKey(
          VALID_COMPANY_ID,
          'invoices.invoice_report',
        ),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('throws 404 when domain not found', async () => {
      domainModelMock.findOne.mockImplementation(() => ({
        select: () => ({ lean: () => Promise.resolve(null) }),
      }));

      await expect(
        service.findByCompanyAndCanonicalKey(
          VALID_COMPANY_ID,
          'unknown.doc.pdf',
        ),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    it('throws 400 when format not allowed by domain', async () => {
      const domain = makeDomain({ allowedFormats: ['pdf'] });
      domainModelMock.findOne.mockImplementation(() => ({
        select: () => ({ lean: () => Promise.resolve(domain) }),
      }));

      await expect(
        service.findByCompanyAndCanonicalKey(
          VALID_COMPANY_ID,
          'invoices.invoice_report.csv',
        ),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('throws 404 when document not found in domain', async () => {
      const domain = makeDomain();
      domainModelMock.findOne.mockImplementation(() => ({
        select: () => ({ lean: () => Promise.resolve(domain) }),
      }));
      modelMock.findOne.mockImplementation(() => ({
        populate: () => ({ lean: () => Promise.resolve(null) }),
      }));

      await expect(
        service.findByCompanyAndCanonicalKey(
          VALID_COMPANY_ID,
          'invoices.missing_doc.pdf',
        ),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    it('throws 400 when format contract is disabled', async () => {
      const domain = makeDomain();
      const doc = makeDoc({
        formatContracts: { pdf: { enabled: false } },
      });
      domainModelMock.findOne.mockImplementation(() => ({
        select: () => ({ lean: () => Promise.resolve(domain) }),
      }));
      modelMock.findOne.mockImplementation(() => ({
        populate: () => ({ lean: () => Promise.resolve(doc) }),
      }));

      await expect(
        service.findByCompanyAndCanonicalKey(
          VALID_COMPANY_ID,
          'invoices.invoice_report.pdf',
        ),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });
  });

  // ─── create() ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a document successfully', async () => {
      const domain = makeDomain();
      const doc = makeDoc();
      domainModelMock.findById.mockImplementation(() => ({
        select: () => ({ lean: () => Promise.resolve(domain) }),
      }));
      modelMock.create.mockResolvedValue(doc);

      const result = await service.create({
        documentDomainCatalogueId: VALID_DOMAIN_ID,
        documentKey: 'invoice_report',
        displayName: 'Invoice Report',
        formatContracts: {
          pdf: { enabled: true, version: '1.0', layoutType: 'pdf' },
        } as any,
      });

      expect(result.documentKey).toBe('invoice_report');
    });

    it('throws 400 on duplicate key (code 11000)', async () => {
      const domain = makeDomain();
      domainModelMock.findById.mockImplementation(() => ({
        select: () => ({ lean: () => Promise.resolve(domain) }),
      }));
      modelMock.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({
          documentDomainCatalogueId: VALID_DOMAIN_ID,
          documentKey: 'invoice_report',
          displayName: 'Invoice Report',
        }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('throws 400 when domain not found', async () => {
      domainModelMock.findById.mockImplementation(() => ({
        select: () => ({ lean: () => Promise.resolve(null) }),
      }));

      await expect(
        service.create({
          documentDomainCatalogueId: VALID_DOMAIN_ID,
          documentKey: 'invoice_report',
          displayName: 'Invoice Report',
        }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });
  });

  // ─── update() ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates successfully', async () => {
      const domain = makeDomain();
      const doc = makeDoc();
      const updatedDoc = makeDoc({ displayName: 'Updated' });
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(doc),
      }));
      domainModelMock.findById.mockImplementation(() => ({
        select: () => ({ lean: () => Promise.resolve(domain) }),
      }));
      modelMock.findByIdAndUpdate.mockResolvedValue({
        ...updatedDoc,
        toObject: () => updatedDoc,
      });

      const result = await service.update(VALID_ID, { displayName: 'Updated' });
      expect(result.displayName).toBe('Updated');
    });

    it('throws 404 when not found', async () => {
      modelMock.findById.mockImplementation(() => ({
        lean: () => Promise.resolve(null),
      }));

      await expect(
        service.update(VALID_ID, { displayName: 'X' }),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });
  });

  // ─── remove() ───────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('deletes successfully', async () => {
      modelMock.findByIdAndDelete.mockResolvedValue(makeDoc());

      const result = await service.remove(VALID_ID);
      expect(result.deleted).toBe(true);
    });

    it('throws 404 when not found', async () => {
      modelMock.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.remove(VALID_ID)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });
});
