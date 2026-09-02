import { buildCsvContent } from '../builders/csv-content.builder';

describe('buildCsvContent()', () => {
  const BASE_CONTRACT = {
    enabled: true,
    renderer: 'csv',
    dataPath: 'lineItems',
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount' },
    ],
  };

  it('builds a correct csv payload', () => {
    const data = {
      lineItems: [
        { date: '2026-07-10', description: 'Consulting', amount: 1600 },
        { date: '2026-07-18', description: 'Design', amount: 800 },
      ],
    };
    const result = buildCsvContent(BASE_CONTRACT, data);

    expect(result.mode).toBe('clean');
    expect(result.table.columns).toHaveLength(3);
    expect(result.table.columns[0]).toEqual({ key: 'date', label: 'Date' });
    expect(result.table.rows).toHaveLength(2);
  });

  it('throws when rows are not an array', () => {
    const data = { lineItems: 'not-an-array' };
    expect(() => buildCsvContent(BASE_CONTRACT, data)).toThrow(
      'is not an array',
    );
  });

  it('throws when no columns are defined', () => {
    const contract = {
      enabled: true,
      renderer: 'csv',
      dataPath: 'rows',
      columns: [],
    };
    const data = { rows: [{ a: 1 }] };
    expect(() => buildCsvContent(contract, data)).toThrow('no columns defined');
  });

  it('uses legacy dataSource when dataPath is empty', () => {
    const legacyContract = {
      ...BASE_CONTRACT,
      dataPath: '',
      dataSource: 'lineItems',
    };
    const data = {
      lineItems: [
        { date: '2026-07-10', description: 'Consulting', amount: 1600 },
      ],
    };
    const result = buildCsvContent(legacyContract, data);

    expect(result.table.rows).toHaveLength(1);
  });

  it('defaults mode to clean', () => {
    const data = {
      lineItems: [{ date: '2026-07-10', description: 'X', amount: 100 }],
    };
    expect(buildCsvContent(BASE_CONTRACT, data).mode).toBe('clean');
  });

  it('sets mode to full when contract.mode is "full"', () => {
    const fullContract = { ...BASE_CONTRACT, mode: 'full' };
    const data = {
      lineItems: [{ date: '2026-07-10', description: 'X', amount: 100 }],
    };
    expect(buildCsvContent(fullContract, data).mode).toBe('full');
  });

  it('uses key as label fallback when column label is missing', () => {
    const contract = {
      enabled: true,
      renderer: 'csv',
      dataPath: 'rows',
      columns: [{ key: 'amount' }],
    };
    const data = { rows: [{ amount: 100 }] };
    const result = buildCsvContent(contract, data);

    expect(result.table.columns[0]).toEqual({ key: 'amount', label: 'amount' });
  });
});
