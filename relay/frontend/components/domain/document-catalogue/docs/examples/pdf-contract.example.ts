// Frontend documentation constant only — not a database record, not a seed.
// This string is only ever loaded into the unsaved JSON editor after user confirmation.

export const PDF_CONTRACT_EXAMPLE = JSON.stringify(
  {
    enabled: true,
    version: '2.0',
    renderer: 'pdf',
    layoutType: 'pdf',
    layoutKey: 'default_invoice',
    sections: [
      {
        key: 'company_header',
        type: 'html',
        label: 'Company & Customer Header',
        enabled: true,
        dataPath: 'header',
        dataType: 'object',
        fields: [
          { key: 'companyName',    label: 'Company Name',    type: 'string', required: true  },
          { key: 'companyAbn',     label: 'ABN',             type: 'string', required: false },
          { key: 'companyAddress', label: 'Company Address', type: 'string', required: false },
          { key: 'customerName',   label: 'Customer Name',   type: 'string', required: true  },
          { key: 'customerEmail',  label: 'Customer Email',  type: 'email',  required: false },
          { key: 'customerAddress',label: 'Customer Address',type: 'string', required: false },
        ],
        columns: [],
      },
      {
        key: 'invoice_details',
        type: 'summary',
        label: 'Invoice Details',
        enabled: true,
        dataPath: 'invoice',
        dataType: 'object',
        fields: [
          { key: 'invoiceNumber', label: 'Invoice Number', type: 'string',   required: true  },
          { key: 'issueDate',     label: 'Issue Date',     type: 'date',     required: true  },
          { key: 'dueDate',       label: 'Due Date',       type: 'date',     required: true  },
          { key: 'status',        label: 'Status',         type: 'string',   required: false },
        ],
        columns: [],
      },
      {
        key: 'items_table',
        type: 'table',
        label: 'Items',
        enabled: true,
        dataPath: 'lineItems',
        dataType: 'array',
        fields: [],
        columns: [
          { key: 'date',        label: 'Date',        type: 'date',     required: true,  format: 'YYYY-MM-DD' },
          { key: 'description', label: 'Description', type: 'string',   required: true  },
          { key: 'qty',         label: 'Qty / Hours', type: 'number',   required: true,  minimum: 0           },
          { key: 'rate',        label: 'Rate',        type: 'currency', required: true,  minimum: 0           },
          { key: 'amount',      label: 'Amount',      type: 'currency', required: true,  minimum: 0           },
        ],
      },
      {
        key: 'totals',
        type: 'totals',
        label: 'Totals',
        enabled: true,
        dataPath: 'totals',
        dataType: 'object',
        fields: [
          { key: 'subtotal', label: 'Subtotal',  type: 'currency', required: true  },
          { key: 'gst',      label: 'GST (10%)', type: 'currency', required: true  },
          { key: 'total',    label: 'Total Due', type: 'currency', required: true, emphasis: 'strong' },
        ],
        columns: [],
      },
      {
        key: 'payment_info',
        type: 'notes',
        label: 'Payment Information',
        enabled: true,
        dataPath: 'paymentNotes',
        dataType: 'array',
        fields: [],
        columns: [],
      },
    ],
    notes: 'Customer invoice — PDF format contract (v2 with dataPath and typed fields)',
  },
  null,
  2,
);

// The v2 runtime generation request for POST /files/documents/generate
// The caller only provides values — the structure is resolved from the contract.
export const PDF_GENERATION_PAYLOAD_EXAMPLE = JSON.stringify(
  {
    companyId: '<your-company-id>',
    canonicalKey: 'invoices.customer-invoice.pdf',
    filename: 'invoice-INV-0001',
    data: {
      header: {
        companyName:     'Business App Pty Ltd',
        companyAbn:      'ABN 12 345 678 901',
        companyAddress:  '42 George Street, Sydney NSW 2000',
        customerName:    'John Smith',
        customerEmail:   'john.smith@example.com',
        customerAddress: '17 Harbour Road, Melbourne VIC 3000',
      },
      invoice: {
        invoiceNumber: 'INV-0001',
        issueDate:     '2026-07-22',
        dueDate:       '2026-08-05',
        status:        'Unpaid',
      },
      lineItems: [
        { date: '2026-07-10', description: 'Software consulting — API architecture', qty: 8, rate: 200, amount: 1600 },
        { date: '2026-07-18', description: 'Frontend integration — Portal UI',       qty: 6, rate: 200, amount: 1200 },
      ],
      totals: {
        subtotal: 2800,
        gst:      280,
        total:    3080,
      },
      paymentNotes: [
        'Bank: Commonwealth Bank of Australia',
        'Account Name: Business App Pty Ltd',
        'BSB: 062-000  ·  Account: 1234 5678',
        'Reference: INV-0001',
        'Please pay within 14 days of the issue date.',
        'Late payments may attract interest at 2% per month.',
      ],
    },
  },
  null,
  2,
);

// Legacy direct-content payload for POST /files/reports/generate/pdf
// Use this when you do not have a saved contract but still need PDF generation.
export const PDF_LEGACY_PAYLOAD_EXAMPLE = JSON.stringify(
  {
    companyId: '<your-company-id>',
    filename: 'invoice-INV-0001',
    report: {
      meta: {
        title:    'INVOICE INV-0001',
        subtitle: 'Business App Pty Ltd  ·  ABN 12 345 678 901',
      },
      sections: [
        {
          type: 'html',
          html: '<table style="width:100%;font-size:11px"><tr><td><strong>Business App Pty Ltd</strong></td><td style="text-align:right"><strong>Bill To</strong><br>John Smith</td></tr></table>',
        },
        {
          type:  'summary',
          title: 'Invoice Details',
          cards: [
            { label: 'Invoice Number', value: 'INV-0001'    },
            { label: 'Issue Date',     value: '2026-07-22'  },
            { label: 'Due Date',       value: '2026-08-05'  },
            { label: 'Status',         value: 'Unpaid'      },
          ],
        },
        {
          type:    'table',
          title:   'Items',
          columns: [
            { key: 'date',        label: 'Date'        },
            { key: 'description', label: 'Description' },
            { key: 'qty',         label: 'Qty / Hours' },
            { key: 'rate',        label: 'Rate'        },
            { key: 'amount',      label: 'Amount'      },
          ],
          rows: [
            { date: '2026-07-10', description: 'Software consulting', qty: '8', rate: '$200.00', amount: '$1,600.00' },
            { date: '2026-07-18', description: 'Frontend integration', qty: '6', rate: '$200.00', amount: '$1,200.00' },
          ],
        },
        {
          type:  'totals',
          title: 'Summary',
          items: [
            { label: 'Subtotal',  value: '$2,800.00'                      },
            { label: 'GST (10%)', value: '$280.00'                        },
            { label: 'Total Due', value: '$3,080.00', emphasis: 'strong'  },
          ],
        },
        {
          type:  'notes',
          title: 'Payment Information',
          items: ['Bank: CBA', 'BSB: 062-000 · Account: 1234 5678', 'Reference: INV-0001'],
        },
      ],
    },
    data: {},
  },
  null,
  2,
);
