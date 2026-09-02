import {
  validateFieldDefinition,
  validateFieldDefinitions,
  validateContractFieldDefinitions,
} from '../validators/contract-field.validator';

describe('validateFieldDefinition()', () => {
  it('returns no errors for a valid field', () => {
    expect(
      validateFieldDefinition(
        { key: 'amount', type: 'currency', required: true },
        'fields[0]',
      ),
    ).toEqual([]);
  });

  it('requires key', () => {
    const errors = validateFieldDefinition({ key: '', type: 'string' }, 'f[0]');
    expect(errors.some((e) => e.path.includes('key'))).toBe(true);
  });

  it('rejects invalid field type', () => {
    const errors = validateFieldDefinition({ key: 'x', type: 'money' }, 'f[0]');
    expect(
      errors.some((e) => e.message.includes('not a valid field type')),
    ).toBe(true);
  });

  it('rejects minimum > maximum', () => {
    const errors = validateFieldDefinition(
      { key: 'x', type: 'number', minimum: 10, maximum: 5 },
      'f[0]',
    );
    expect(errors.some((e) => e.message.includes('must not exceed'))).toBe(
      true,
    );
  });

  it('rejects non-array allowedValues', () => {
    const errors = validateFieldDefinition(
      { key: 'x', allowedValues: 'active' as any },
      'f[0]',
    );
    expect(errors.some((e) => e.message.includes('must be an array'))).toBe(
      true,
    );
  });
});

describe('validateFieldDefinitions()', () => {
  it('returns no errors for valid unique fields', () => {
    const fields = [
      { key: 'a', type: 'string' },
      { key: 'b', type: 'number' },
    ];
    expect(validateFieldDefinitions(fields, 'fields')).toEqual([]);
  });

  it('detects duplicate keys', () => {
    const fields = [
      { key: 'amount', type: 'number' },
      { key: 'amount', type: 'currency' },
    ];
    const errors = validateFieldDefinitions(fields, 'fields');
    expect(
      errors.some((e) => e.message.includes('duplicate field key "amount"')),
    ).toBe(true);
  });
});

describe('validateContractFieldDefinitions() — PDF', () => {
  it('validates fields inside pdf sections', () => {
    const contract = {
      sections: [
        {
          fields: [{ key: 'inv', type: 'unknown_type' }],
          columns: [],
        },
      ],
    };
    const errors = validateContractFieldDefinitions('pdf', contract);
    expect(errors.some((e) => e.includes('not a valid field type'))).toBe(true);
  });

  it('validates columns inside pdf sections', () => {
    const contract = {
      sections: [
        {
          fields: [],
          columns: [{ key: '', type: 'string' }], // empty key
        },
      ],
    };
    const errors = validateContractFieldDefinitions('pdf', contract);
    expect(errors.some((e) => e.includes('key is required'))).toBe(true);
  });
});

describe('validateContractFieldDefinitions() — XLSX', () => {
  it('validates worksheet columns', () => {
    const contract = {
      worksheets: [
        { key: 'items', columns: [{ key: 'amount', type: 'invalid_type' }] },
      ],
    };
    const errors = validateContractFieldDefinitions('xlsx', contract);
    expect(errors.some((e) => e.includes('not a valid field type'))).toBe(true);
  });
});

describe('validateContractFieldDefinitions() — CSV', () => {
  it('validates csv columns', () => {
    const contract = {
      columns: [{ key: 'x', type: 'number', minimum: 100, maximum: 10 }], // min > max
    };
    const errors = validateContractFieldDefinitions('csv', contract);
    expect(errors.some((e) => e.includes('must not exceed'))).toBe(true);
  });

  it('returns no errors for valid csv columns', () => {
    const contract = {
      columns: [
        { key: 'date', type: 'date', required: true },
        { key: 'amount', type: 'number', required: false, minimum: 0 },
      ],
    };
    expect(validateContractFieldDefinitions('csv', contract)).toEqual([]);
  });
});
