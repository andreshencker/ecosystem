// Frontend documentation constant only — not a database record, not a seed.

export const CSV_CONTRACT_EXAMPLE = JSON.stringify(
  {
    enabled: true,
    version: '2.0',
    renderer: 'csv',
    dataPath: 'lineItems',
    includeHeaders: true,
    columns: [
      { key: 'date',        label: 'Date',        type: 'date',     required: true,  format: 'YYYY-MM-DD' },
      { key: 'description', label: 'Description', type: 'string',   required: true  },
      { key: 'qty',         label: 'Qty / Hours', type: 'number',   required: true,  minimum: 0           },
      { key: 'rate',        label: 'Rate',        type: 'currency', required: true,  minimum: 0           },
      { key: 'amount',      label: 'Amount',      type: 'currency', required: true,  minimum: 0           },
    ],
    notes: 'Customer invoice line items — CSV format contract (v2 with dataPath and typed columns)',
  },
  null,
  2,
);

// v2 contract-driven generation (POST /files/documents/generate)
export const CSV_GENERATION_PAYLOAD_EXAMPLE = JSON.stringify(
  {
    companyId:    '<your-company-id>',
    canonicalKey: 'invoices.customer-invoice.csv',
    filename:     'invoice-INV-0001-items',
    data: {
      lineItems: [
        { date: '2026-07-10', description: 'Software consulting — API architecture', qty: 8,   rate: 200, amount: 1600 },
        { date: '2026-07-18', description: 'Frontend integration — Portal UI',       qty: 6,   rate: 200, amount: 1200 },
      ],
    },
  },
  null,
  2,
);

// Legacy direct payload for POST /files/generate (format: "csv")
export const CSV_LEGACY_PAYLOAD_EXAMPLE = JSON.stringify(
  {
    format:   'csv',
    filename: 'invoice-INV-0001-items',
    payload: {
      mode: 'clean',
      table: {
        columns: [
          { key: 'date',        label: 'Date'        },
          { key: 'description', label: 'Description' },
          { key: 'qty',         label: 'Qty / Hours' },
          { key: 'rate',        label: 'Rate'        },
          { key: 'amount',      label: 'Amount'      },
        ],
        rows: [
          { date: '2026-07-10', description: 'Software consulting — API architecture', qty: '8', rate: '$200.00', amount: '$1,600.00' },
          { date: '2026-07-18', description: 'Frontend integration — Portal UI',       qty: '6', rate: '$200.00', amount: '$1,200.00' },
        ],
      },
    },
  },
  null,
  2,
);

export const CSV_EXPECTED_OUTPUT = `Date,Description,Qty / Hours,Rate,Amount
2026-07-10,"Software consulting — API architecture",8,$200.00,"$1,600.00"
2026-07-18,"Frontend integration — Portal UI",6,$200.00,"$1,200.00"`;
