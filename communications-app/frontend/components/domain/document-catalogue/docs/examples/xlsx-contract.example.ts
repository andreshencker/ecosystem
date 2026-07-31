// Frontend documentation constant only — not a database record, not a seed.

export const XLSX_CONTRACT_EXAMPLE = JSON.stringify(
  {
    enabled: true,
    version: '2.0',
    renderer: 'xlsx',
    worksheets: [
      {
        key: 'items',
        label: 'Invoice Items',
        dataPath: 'lineItems',
        columns: [
          { key: 'date',        label: 'Date',        type: 'date',     required: true,  format: 'YYYY-MM-DD' },
          { key: 'description', label: 'Description', type: 'string',   required: true  },
          { key: 'qty',         label: 'Qty / Hours', type: 'number',   required: true,  minimum: 0           },
          { key: 'rate',        label: 'Rate',        type: 'currency', required: true,  minimum: 0           },
          { key: 'amount',      label: 'Amount',      type: 'currency', required: true,  minimum: 0           },
        ],
      },
    ],
    notes: 'Customer invoice — XLSX format contract (v2 with dataPath and typed columns)',
  },
  null,
  2,
);

// v2 contract-driven generation (POST /files/documents/generate)
export const XLSX_GENERATION_PAYLOAD_EXAMPLE = JSON.stringify(
  {
    companyId:    '<your-company-id>',
    canonicalKey: 'invoices.customer-invoice.xlsx',
    filename:     'invoice-INV-0001',
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

// Legacy direct payload for POST /files/generate (format: "xlsx")
export const XLSX_LEGACY_PAYLOAD_EXAMPLE = JSON.stringify(
  {
    format:   'xlsx',
    filename: 'invoice-INV-0001',
    payload: {
      meta: {
        title:      'Invoice INV-0001 — Business App Pty Ltd',
        sheetName:  'Invoice Items',
        createdBy:  'Business App',
      },
      table: {
        columns: [
          { key: 'date',        label: 'Date'        },
          { key: 'description', label: 'Description' },
          { key: 'qty',         label: 'Qty / Hours' },
          { key: 'rate',        label: 'Rate'        },
          { key: 'amount',      label: 'Amount'      },
        ],
        rows: [
          { date: '2026-07-10', description: 'Software consulting', qty: 8,   rate: 200, amount: 1600 },
          { date: '2026-07-18', description: 'Frontend integration', qty: 6,  rate: 200, amount: 1200 },
        ],
      },
      totals: {
        title: 'Totals',
        items: [
          { label: 'Subtotal',  value: 2800 },
          { label: 'GST (10%)', value: 280  },
          { label: 'Total Due', value: 3080, emphasis: 'strong' },
        ],
      },
      notes: {
        title: 'Payment Information',
        items: ['BSB: 062-000 · Account: 1234 5678', 'Reference: INV-0001'],
      },
    },
  },
  null,
  2,
);
