import { buildXlsxContent } from '../builders/xlsx-content.builder';

describe('buildXlsxContent()', () => {
  const BASE_CONTRACT = {
    enabled: true,
    renderer: 'xlsx',
    worksheets: [
      {
        key: 'items',
        label: 'Invoice Items',
        dataPath: 'lineItems',
        columns: [
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'description', label: 'Description', type: 'string' },
          { key: 'amount', label: 'Amount', type: 'number' },
        ],
      },
    ],
  };

  it('builds a correct xlsx payload', () => {
    const data = {
      lineItems: [
        { date: '2026-07-10', description: 'Consulting', amount: 1600 },
        { date: '2026-07-18', description: 'Design', amount: 800 },
      ],
    };
    const result = buildXlsxContent(BASE_CONTRACT, data);

    expect(result.meta.sheetName).toBe('Invoice Items');
    expect(result.table.columns).toHaveLength(3);
    expect(result.table.columns[0]).toEqual({ key: 'date', label: 'Date' });
    expect(result.table.rows).toHaveLength(2);
    expect(result.table.rows[0].description).toBe('Consulting');
  });

  it('throws when no worksheets are defined', () => {
    expect(() =>
      buildXlsxContent({ enabled: true, renderer: 'xlsx', worksheets: [] }, {}),
    ).toThrow('XLSX contract has no worksheets defined');
  });

  it('throws when rows are not an array', () => {
    const data = { lineItems: 'not-an-array' };
    expect(() => buildXlsxContent(BASE_CONTRACT, data)).toThrow(
      'is not an array',
    );
  });

  it('uses legacy dataSource when dataPath is empty', () => {
    const legacyContract = {
      enabled: true,
      renderer: 'xlsx',
      worksheets: [
        {
          key: 'items',
          label: 'Items',
          dataSource: 'lineItems',
          dataPath: '',
          columns: [{ key: 'amount', label: 'Amount' }],
        },
      ],
    };
    const data = { lineItems: [{ amount: 1600 }] };
    const result = buildXlsxContent(legacyContract, data);

    expect(result.table.rows).toHaveLength(1);
    expect(result.table.rows[0].amount).toBe(1600);
  });

  it('uses key as fallback when column label is missing', () => {
    const contract = {
      enabled: true,
      renderer: 'xlsx',
      worksheets: [
        { key: 'items', dataPath: 'rows', columns: [{ key: 'amount' }] },
      ],
    };
    const data = { rows: [{ amount: 100 }] };
    const result = buildXlsxContent(contract, data);

    expect(result.table.columns[0]).toEqual({ key: 'amount', label: 'amount' });
  });
});
