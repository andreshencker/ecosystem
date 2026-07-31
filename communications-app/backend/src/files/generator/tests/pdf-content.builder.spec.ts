import { buildPdfContent } from '../builders/pdf-content.builder';

const BASE_CONTRACT = {
  enabled: true,
  version: '1.0',
  renderer: 'pdf',
  layoutType: 'pdf',
};

describe('buildPdfContent()', () => {
  it('returns empty sections when sections array is absent', () => {
    const result = buildPdfContent({ ...BASE_CONTRACT }, {});
    expect(result.sections).toEqual([]);
  });

  it('skips disabled sections', () => {
    const contract = {
      ...BASE_CONTRACT,
      sections: [
        {
          key: 'a',
          type: 'notes',
          label: 'A',
          enabled: false,
          dataPath: 'items',
          dataType: 'array',
          fields: [],
          columns: [],
        },
      ],
    };
    const result = buildPdfContent(contract, { items: ['note1'] });
    expect(result.sections).toHaveLength(0);
  });

  it('builds a summary section from object dataPath + fields', () => {
    const contract = {
      ...BASE_CONTRACT,
      sections: [
        {
          key: 'header',
          type: 'summary',
          label: 'Invoice Details',
          enabled: true,
          dataPath: 'invoice',
          dataType: 'object',
          fields: [
            { key: 'invoiceNumber', label: 'Invoice No.', type: 'string' },
            { key: 'status', label: 'Status', type: 'string' },
          ],
          columns: [],
        },
      ],
    };
    const data = { invoice: { invoiceNumber: 'INV-0001', status: 'Unpaid' } };
    const result = buildPdfContent(contract, data);

    expect(result.sections).toHaveLength(1);
    const section: any = result.sections[0];
    expect(section.type).toBe('summary');
    expect(section.title).toBe('Invoice Details');
    expect(section.cards).toHaveLength(2);
    expect(section.cards[0]).toMatchObject({
      label: 'Invoice No.',
      value: 'INV-0001',
    });
  });

  it('builds a table section from array dataPath + columns', () => {
    const contract = {
      ...BASE_CONTRACT,
      sections: [
        {
          key: 'items',
          type: 'table',
          label: 'Items',
          enabled: true,
          dataPath: 'lineItems',
          dataType: 'array',
          fields: [],
          columns: [
            { key: 'description', label: 'Description', type: 'string' },
            { key: 'amount', label: 'Amount', type: 'currency' },
          ],
        },
      ],
    };
    const data = { lineItems: [{ description: 'Consulting', amount: 1600 }] };
    const result = buildPdfContent(contract, data);

    const section: any = result.sections[0];
    expect(section.type).toBe('table');
    expect(section.columns).toHaveLength(2);
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0].description).toBe('Consulting');
  });

  it('builds a totals section from object dataPath + fields', () => {
    const contract = {
      ...BASE_CONTRACT,
      sections: [
        {
          key: 'totals',
          type: 'totals',
          label: 'Totals',
          enabled: true,
          dataPath: 'totals',
          dataType: 'object',
          fields: [
            { key: 'subtotal', label: 'Subtotal', type: 'currency' },
            { key: 'gst', label: 'GST', type: 'currency' },
            { key: 'total', label: 'Total Due', type: 'currency' },
          ],
          columns: [],
        },
      ],
    };
    const data = { totals: { subtotal: 2800, gst: 280, total: 3080 } };
    const result = buildPdfContent(contract, data);

    const section: any = result.sections[0];
    expect(section.type).toBe('totals');
    expect(section.items).toHaveLength(3);
    expect(section.items[0].label).toBe('Subtotal');
  });

  it('builds a notes section from an array dataPath', () => {
    const contract = {
      ...BASE_CONTRACT,
      sections: [
        {
          key: 'payment',
          type: 'notes',
          label: 'Payment Information',
          enabled: true,
          dataPath: 'paymentNotes',
          dataType: 'array',
          fields: [],
          columns: [],
        },
      ],
    };
    const data = {
      paymentNotes: ['Bank: CBA', 'BSB: 062-000', 'Ref: INV-0001'],
    };
    const result = buildPdfContent(contract, data);

    const section: any = result.sections[0];
    expect(section.type).toBe('notes');
    expect(section.items).toEqual([
      'Bank: CBA',
      'BSB: 062-000',
      'Ref: INV-0001',
    ]);
  });

  it('uses legacy html property when no field defs are present', () => {
    const contract = {
      ...BASE_CONTRACT,
      sections: [
        {
          key: 'header',
          type: 'html',
          label: 'Header',
          enabled: true,
          dataPath: '',
          dataType: 'object',
          html: '<p>Hello</p>',
          fields: [],
          columns: [],
        },
      ],
    };
    const result = buildPdfContent(contract, {});
    const section: any = result.sections[0];
    expect(section.type).toBe('html');
    expect(section.html).toBe('<p>Hello</p>');
  });

  it('builds html section with key-value table when field defs are present', () => {
    const contract = {
      ...BASE_CONTRACT,
      sections: [
        {
          key: 'summary',
          type: 'html',
          label: 'Summary',
          enabled: true,
          dataPath: 'company',
          dataType: 'object',
          fields: [
            { key: 'name', label: 'Company', type: 'string' },
            { key: 'abn', label: 'ABN', type: 'string' },
          ],
          columns: [],
        },
      ],
    };
    const data = {
      company: { name: 'Business App Pty Ltd', abn: '12 345 678 901' },
    };
    const result = buildPdfContent(contract, data);

    const section: any = result.sections[0];
    expect(section.type).toBe('html');
    expect(section.html).toContain('Business App Pty Ltd');
    expect(section.html).toContain('ABN');
  });

  it('skips unknown section types without throwing', () => {
    const contract = {
      ...BASE_CONTRACT,
      sections: [
        {
          key: 'x',
          type: 'unknown_type',
          enabled: true,
          dataPath: '',
          fields: [],
          columns: [],
        },
        {
          key: 'n',
          type: 'notes',
          enabled: true,
          dataPath: 'items',
          dataType: 'array',
          fields: [],
          columns: [],
        },
      ],
    };
    const data = { items: ['note'] };
    expect(() => buildPdfContent(contract, data)).not.toThrow();
    const result = buildPdfContent(contract, data);
    expect(result.sections).toHaveLength(1); // only the 'notes' section
  });
});
