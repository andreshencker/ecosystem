"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHIFT_INVOICE_DOCUMENT_DOMAIN = void 0;
const field = (key, label, type = 'string', required = false, format = '') => ({ key, label, type, required, format });
exports.SHIFT_INVOICE_DOCUMENT_DOMAIN = {
    domainKey: 'invoice',
    displayName: 'Invoices',
    description: 'Documents generated for approved customer invoices.',
    domainCategory: 'billing',
    allowedFormats: ['pdf', 'xlsx', 'csv'],
    documents: [
        {
            documentKey: 'shift-invoice',
            displayName: 'Shift Invoice',
            description: 'Customer invoice generated from approved shifts and additional concepts.',
            formatContracts: {
                pdf: {
                    enabled: true,
                    version: '2.0',
                    renderer: 'pdf',
                    layoutType: 'pdf',
                    layoutKey: 'default_invoice',
                    sections: [
                        {
                            key: 'company_header', type: 'html', label: 'From', enabled: true,
                            dataPath: 'header.company', dataType: 'object', columns: [],
                            fields: [
                                field('companyName', 'Company', 'string', true),
                                field('abn', 'ABN'), field('address', 'Address'),
                                field('email', 'Email', 'email'), field('phone', 'Phone'),
                            ],
                        },
                        {
                            key: 'customer_header', type: 'summary', label: 'Bill To', enabled: true,
                            dataPath: 'header.customer', dataType: 'object', columns: [],
                            fields: [
                                field('customerName', 'Customer', 'string', true),
                                field('email', 'Email', 'email'), field('phone', 'Phone'),
                                field('address', 'Address'),
                            ],
                        },
                        {
                            key: 'invoice_details', type: 'summary', label: 'Invoice Details', enabled: true,
                            dataPath: 'invoice', dataType: 'object', columns: [],
                            fields: [
                                field('invoiceNumber', 'Invoice Number', 'string', true),
                                field('invoiceDate', 'Invoice Date', 'date', true),
                                field('dueDate', 'Due Date', 'date'),
                                field('status', 'Status'), field('currency', 'Currency', 'string', true),
                                field('contractTitle', 'Contract'),
                            ],
                        },
                        {
                            key: 'line_items', type: 'table', label: 'Invoice Items', enabled: true,
                            dataPath: 'lineItems', dataType: 'array', fields: [],
                            columns: [
                                field('workDate', 'Date', 'date', true),
                                field('description', 'Concept'),
                                field('startTime', 'Start Time', 'time'),
                                field('endTime', 'End Time', 'time'),
                                field('workedHours', 'Worked Hours', 'number', true),
                                field('hourlyRate', 'Rate', 'currency', true, 'currency'),
                                field('amount', 'Balance', 'currency', true, 'currency'),
                            ],
                        },
                        {
                            key: 'totals', type: 'totals', label: 'Totals', enabled: true,
                            dataPath: 'totals', dataType: 'object', columns: [],
                            fields: [
                                field('subtotal', 'Subtotal', 'currency', true, 'currency'),
                                field('taxAmount', 'GST', 'currency', true, 'currency'),
                                field('total', 'Total', 'currency', true, 'currency'),
                            ],
                        },
                        {
                            key: 'payment_notes', type: 'notes', label: 'Payment Information', enabled: true,
                            dataPath: 'paymentNotes', dataType: 'array', fields: [], columns: [],
                        },
                    ],
                    requiredFields: [],
                    optionalFields: [],
                    notes: 'Business App shift invoice PDF contract.',
                },
                xlsx: {
                    enabled: true,
                    version: '2.0',
                    renderer: 'xlsx',
                    worksheets: [{
                            key: 'line_items',
                            label: 'Invoice Items',
                            dataPath: 'lineItems',
                            dataSource: 'lineItems',
                            columns: [
                                field('workDate', 'Date', 'date', true),
                                field('description', 'Concept'),
                                field('startTime', 'Start Time', 'time'),
                                field('endTime', 'End Time', 'time'),
                                field('workedHours', 'Worked Hours', 'number', true),
                                field('hourlyRate', 'Rate', 'currency', true, 'currency'),
                                field('amount', 'Balance', 'currency', true, 'currency'),
                            ],
                        }],
                    requiredFields: [],
                    optionalFields: [],
                    notes: 'Business App shift invoice XLSX contract.',
                },
                csv: {
                    enabled: true,
                    version: '2.0',
                    renderer: 'csv',
                    dataPath: 'lineItems',
                    dataSource: 'lineItems',
                    includeHeaders: true,
                    columns: [
                        field('workDate', 'Date', 'date', true),
                        field('description', 'Concept'),
                        field('startTime', 'Start Time', 'time'),
                        field('endTime', 'End Time', 'time'),
                        field('workedHours', 'Worked Hours', 'number', true),
                        field('hourlyRate', 'Rate', 'currency', true, 'currency'),
                        field('amount', 'Balance', 'currency', true, 'currency'),
                    ],
                    requiredFields: [],
                    optionalFields: [],
                    notes: 'Business App shift invoice CSV contract.',
                },
            },
        },
    ],
};
//# sourceMappingURL=shift-invoice.seed.js.map