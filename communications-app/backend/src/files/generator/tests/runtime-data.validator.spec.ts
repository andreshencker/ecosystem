import {
  validateRuntimeData,
  getAtPath,
} from '../validators/runtime-data.validator';

describe('getAtPath()', () => {
  it('returns root when path is empty', () => {
    const obj = { a: 1 };
    expect(getAtPath(obj, '')).toEqual(obj);
  });

  it('reads a top-level key', () => {
    expect(getAtPath({ a: 42 }, 'a')).toBe(42);
  });

  it('reads a nested dot-path', () => {
    expect(getAtPath({ a: { b: { c: 'x' } } }, 'a.b.c')).toBe('x');
  });

  it('returns undefined for missing path', () => {
    expect(getAtPath({ a: 1 }, 'a.b.c')).toBeUndefined();
  });
});

describe('validateRuntimeData() — PDF', () => {
  const pdfContract = {
    enabled: true,
    version: '1.0',
    renderer: 'pdf',
    layoutType: 'pdf',
    sections: [
      {
        key: 'header',
        type: 'summary',
        enabled: true,
        dataPath: 'invoice',
        dataType: 'object',
        fields: [
          {
            key: 'invoiceNumber',
            label: 'Invoice Number',
            type: 'string',
            required: true,
          },
          {
            key: 'issueDate',
            label: 'Issue Date',
            type: 'date',
            required: true,
          },
          { key: 'status', label: 'Status', type: 'string', required: false },
        ],
        columns: [],
      },
      {
        key: 'items',
        type: 'table',
        enabled: true,
        dataPath: 'lineItems',
        dataType: 'array',
        fields: [],
        columns: [
          {
            key: 'description',
            label: 'Description',
            type: 'string',
            required: true,
          },
          {
            key: 'amount',
            label: 'Amount',
            type: 'number',
            required: true,
            minimum: 0,
          },
        ],
      },
      {
        key: 'notes',
        type: 'notes',
        enabled: false, // disabled — should not be validated
        dataPath: 'payment',
        dataType: 'array',
        fields: [],
        columns: [],
      },
    ],
  };

  it('returns no errors for valid data', () => {
    const data = {
      invoice: { invoiceNumber: 'INV-0001', issueDate: '2026-07-22' },
      lineItems: [
        { description: 'Consulting', amount: 1600 },
        { description: 'Design', amount: 800 },
      ],
    };
    expect(validateRuntimeData('pdf', pdfContract, data)).toEqual([]);
  });

  it('returns error when required object field is missing', () => {
    const data = {
      invoice: { issueDate: '2026-07-22' }, // invoiceNumber missing
      lineItems: [{ description: 'Consulting', amount: 1600 }],
    };
    const errors = validateRuntimeData('pdf', pdfContract, data);
    expect(errors).toContain('data.invoice.invoiceNumber is required');
  });

  it('returns error when array is missing for table section', () => {
    const data = {
      invoice: { invoiceNumber: 'INV-0001', issueDate: '2026-07-22' },
      // lineItems missing
    };
    const errors = validateRuntimeData('pdf', pdfContract, data);
    expect(
      errors.some((e) => e.includes('data.lineItems must be an array')),
    ).toBe(true);
  });

  it('returns error when required column is missing in a row', () => {
    const data = {
      invoice: { invoiceNumber: 'INV-0001', issueDate: '2026-07-22' },
      lineItems: [{ amount: 1600 }], // description missing
    };
    const errors = validateRuntimeData('pdf', pdfContract, data);
    expect(
      errors.some((e) =>
        e.includes('data.lineItems[0].description is required'),
      ),
    ).toBe(true);
  });

  it('validates minimum constraint on amount', () => {
    const data = {
      invoice: { invoiceNumber: 'INV-0001', issueDate: '2026-07-22' },
      lineItems: [{ description: 'X', amount: -5 }],
    };
    const errors = validateRuntimeData('pdf', pdfContract, data);
    expect(
      errors.some((e) => e.includes('data.lineItems[0].amount must be >= 0')),
    ).toBe(true);
  });

  it('skips disabled sections', () => {
    const data = {
      invoice: { invoiceNumber: 'INV-0001', issueDate: '2026-07-22' },
      lineItems: [{ description: 'Consulting', amount: 1600 }],
      // payment is missing — but section is disabled so no error
    };
    expect(validateRuntimeData('pdf', pdfContract, data)).toEqual([]);
  });

  it('returns error for invalid email type', () => {
    const contract = {
      enabled: true,
      sections: [
        {
          key: 'contact',
          type: 'summary',
          enabled: true,
          dataPath: 'customer',
          dataType: 'object',
          fields: [{ key: 'email', type: 'email', required: true }],
          columns: [],
        },
      ],
    };
    const data = { customer: { email: 'not-an-email' } };
    const errors = validateRuntimeData('pdf', contract, data);
    expect(errors.some((e) => e.includes('valid email'))).toBe(true);
  });
});

describe('validateRuntimeData() — XLSX', () => {
  const xlsxContract = {
    enabled: true,
    renderer: 'xlsx',
    worksheets: [
      {
        key: 'items',
        label: 'Invoice Items',
        dataPath: 'lineItems',
        columns: [
          { key: 'date', type: 'date', required: true },
          { key: 'description', type: 'string', required: true },
          { key: 'amount', type: 'number', required: true, minimum: 0 },
          { key: 'notes', type: 'string', required: false },
        ],
      },
    ],
  };

  it('returns no errors for valid data', () => {
    const data = {
      lineItems: [
        { date: '2026-07-10', description: 'Consulting', amount: 1600 },
      ],
    };
    expect(validateRuntimeData('xlsx', xlsxContract, data)).toEqual([]);
  });

  it('returns error when dataPath is not an array', () => {
    const data = { lineItems: 'not-an-array' };
    const errors = validateRuntimeData('xlsx', xlsxContract, data);
    expect(errors.some((e) => e.includes('must be an array'))).toBe(true);
  });

  it('returns error for missing required column in row', () => {
    const data = { lineItems: [{ date: '2026-07-10', amount: 1600 }] }; // description missing
    const errors = validateRuntimeData('xlsx', xlsxContract, data);
    expect(
      errors.some((e) => e.includes('lineItems[0].description is required')),
    ).toBe(true);
  });

  it('supports legacy dataSource when dataPath is empty', () => {
    const legacyContract = {
      enabled: true,
      renderer: 'xlsx',
      worksheets: [
        {
          key: 'items',
          dataSource: 'lineItems',
          dataPath: '',
          columns: [{ key: 'date', required: true }],
        },
      ],
    };
    const data = { lineItems: [{}] }; // date missing
    const errors = validateRuntimeData('xlsx', legacyContract, data);
    expect(
      errors.some((e) => e.includes('lineItems[0].date is required')),
    ).toBe(true);
  });
});

describe('validateRuntimeData() — CSV', () => {
  const csvContract = {
    enabled: true,
    renderer: 'csv',
    dataPath: 'lineItems',
    columns: [
      { key: 'date', required: true },
      { key: 'description', required: true },
      { key: 'amount', required: true },
    ],
  };

  it('returns no errors for valid data', () => {
    const data = {
      lineItems: [
        { date: '2026-07-10', description: 'Consulting', amount: 1600 },
      ],
    };
    expect(validateRuntimeData('csv', csvContract, data)).toEqual([]);
  });

  it('returns error when rows are missing', () => {
    const errors = validateRuntimeData('csv', csvContract, {});
    expect(
      errors.some((e) => e.includes('lineItems') && e.includes('array')),
    ).toBe(true);
  });

  it('returns error for missing required column value', () => {
    const data = { lineItems: [{ date: '2026-07-10', amount: 1600 }] }; // description missing
    const errors = validateRuntimeData('csv', csvContract, data);
    expect(
      errors.some((e) => e.includes('lineItems[0].description is required')),
    ).toBe(true);
  });

  it('supports legacy dataSource', () => {
    const legacyContract = {
      ...csvContract,
      dataPath: '',
      dataSource: 'lineItems',
    };
    const data = {
      lineItems: [
        { date: '2026-07-10', description: 'Consulting', amount: 1600 },
      ],
    };
    expect(validateRuntimeData('csv', legacyContract, data)).toEqual([]);
  });
});

describe('validateRuntimeData() — unknown format', () => {
  it('returns a graceful error', () => {
    const errors = validateRuntimeData('docx', {}, {});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('not implemented');
  });
});
