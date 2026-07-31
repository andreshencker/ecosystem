'use client';

import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { ContractPropertyRef, type PropertyDef } from './ContractPropertyRef';
import { JsonExampleBlock } from './JsonExampleBlock';
import { XLSX_CONTRACT_EXAMPLE, XLSX_GENERATION_PAYLOAD_EXAMPLE, XLSX_LEGACY_PAYLOAD_EXAMPLE } from './examples/xlsx-contract.example';

const XLSX_PROPERTIES: PropertyDef[] = [
  { name: 'enabled',              type: 'boolean',  required: 'Yes',          description: 'Activates this format contract.',                                                                           example: 'true'           },
  { name: 'version',              type: 'string',   required: 'When enabled', description: 'Schema version. Use "2.0" for contracts with dataPath and typed column definitions.',                      example: '"2.0"'          },
  { name: 'renderer',             type: '"xlsx"',   required: 'No',           description: 'Must be "xlsx" when set. Legacy contracts without renderer are still accepted.',                           example: '"xlsx"'         },
  { name: 'worksheets',           type: 'object[]', required: 'When enabled', description: 'Worksheet descriptors. At least one required when enabled.',                                              example: 'see below'      },
  { name: 'worksheets[].key',     type: 'string',   required: 'Yes',          description: 'Unique key for this worksheet.',                                                                           example: '"items"'        },
  { name: 'worksheets[].label',   type: 'string',   required: 'No',           description: 'Worksheet tab name used in the Excel file.',                                                              example: '"Invoice Items"'},
  { name: 'worksheets[].dataPath', type: 'string',  required: 'No',           description: 'v2: dot-path into runtime data (e.g. "lineItems" reads data.lineItems). Preferred over dataSource.',     example: '"lineItems"'    },
  { name: 'worksheets[].dataSource', type: 'string', required: 'No',          description: 'Legacy: logical source name. Replaced by dataPath in v2. Both accepted; dataPath takes precedence.',     example: '"line_items"'   },
  { name: 'worksheets[].columns', type: 'object[]', required: 'Yes',          description: 'Column definitions. Each has key, label, type, required, format, minimum, maximum.',                     example: 'see below'      },
  { name: 'notes',                type: 'string',   required: 'No',           description: 'Internal documentation comment. Not written to the workbook.',                                            example: '"Invoice XLSX"' },
];

const XLSX_RUNTIME_PROPERTIES: PropertyDef[] = [
  { name: 'payload.meta.title',     type: 'string', required: 'No', description: 'Title cell written above the table (bold, 14pt).', example: '"Invoice INV-0001"' },
  { name: 'payload.meta.sheetName', type: 'string', required: 'No', description: 'Worksheet tab name. Defaults to "Report".',        example: '"Invoice Items"'   },
  { name: 'payload.meta.createdBy', type: 'string', required: 'No', description: 'Workbook creator metadata.',                       example: '"Business App"'    },
  { name: 'payload.table',          type: 'object', required: 'Yes', description: 'Required. Contains columns[] and rows[].',         example: ''                  },
  { name: 'payload.table.columns',  type: 'array',  required: 'Yes', description: 'Column definitions: string or { key, label }.',   example: ''                  },
  { name: 'payload.table.rows',     type: 'array',  required: 'Yes', description: 'Row data. Rows with __kind:"subtotal"|"total" get distinct background fill and bold font.', example: '' },
  { name: 'payload.totals',         type: 'object', required: 'No', description: 'Optional totals block below the table. Each item: { label, value, emphasis? }. Numeric values use #,##0.00 format.', example: '' },
  { name: 'payload.notes',          type: 'object', required: 'No', description: 'Optional notes block. Items array of strings, rendered as bullet points.',         example: '' },
];

interface XlsxContractDocsProps {
  onUseExample: (json: string) => void;
}

export function XlsxContractDocs({ onUseExample }: XlsxContractDocsProps) {
  const [tab, setTab] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" aria-label="XLSX contract documentation tabs">
        <Tab label="Overview"           aria-controls="xlsx-tab-0" id="xlsx-tabBtn-0" />
        <Tab label="Property Reference" aria-controls="xlsx-tab-1" id="xlsx-tabBtn-1" />
        <Tab label="Complete Example"   aria-controls="xlsx-tab-2" id="xlsx-tabBtn-2" />
        <Tab label="Expected Output"    aria-controls="xlsx-tab-3" id="xlsx-tabBtn-3" />
        <Tab label="Validation Rules"   aria-controls="xlsx-tab-4" id="xlsx-tabBtn-4" />
      </Tabs>

      <Divider />

      <Box role="tabpanel" id="xlsx-tab-0" hidden={tab !== 0} aria-labelledby="xlsx-tabBtn-0" pt={2.5}>
        {tab === 0 && (
          <Stack spacing={2}>
            <Typography variant="body2">
              The <strong>XLSX contract</strong> describes the structure of an Excel workbook. It declares worksheets,
              columns, the runtime data path for each worksheet, and typed column definitions the caller must supply.
            </Typography>

            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption" display="block" fontWeight={700} mb={0.5}>v2 contract-driven flow (preferred)</Typography>
              <Typography variant="caption" component="pre" fontFamily="monospace" display="block" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {`POST /files/documents/generate
  { companyId, canonicalKey, filename, data }
  → DocumentGenerationService.generateFromContract()
  → DocumentCatalogueService.findByCompanyAndCanonicalKey()   ← resolves contract
  → validateRuntimeData("xlsx", contract, data)               ← validates data against column defs
  → buildXlsxContent(contract, data)                          ← builds XlsxPayload from worksheets[]
  → GeneratorService.generate({ format: "xlsx", payload })
  → XlsxRendererService → ExcelJS Workbook → Buffer`}
              </Typography>
            </Alert>

            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption" display="block" fontWeight={700} mb={0.5}>Legacy flow (still supported)</Typography>
              <Typography variant="caption" component="pre" fontFamily="monospace" display="block" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {`POST /files/generate   { format: "xlsx", filename, payload }
  → FilesController.generate()
  → GeneratorService.handle()
  → XlsxRendererService.render({ payload })
  → ExcelJS Workbook → Buffer → HTTP response`}
              </Typography>
            </Alert>

            <Alert severity="warning" sx={{ py: 0.5 }}>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>Single-worksheet limitation</Typography>
              <Typography variant="caption">
                The current <code>XlsxRendererService</code> creates <strong>one worksheet</strong> per call,
                defined by <code>payload.table</code>. The contract&apos;s <code>worksheets[]</code> array can
                describe multiple sheets as a blueprint, but generating a multi-sheet workbook requires
                multiple renderer calls and manual workbook assembly. This is not yet supported automatically.
              </Typography>
            </Alert>

            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>
                Automatic column features
              </Typography>
              <Stack spacing={0.75}>
                {[
                  'Column auto-filter is applied to the header row.',
                  'Column widths are auto-fitted (min 10, max 45 characters).',
                  'Columns with keys matching amount|balance|qty|price|total|fee|debit|credit|value are right-aligned and formatted as #,##0.00 when the cell contains a numeric value.',
                  'Rows with __kind: "subtotal" receive a light yellow background; rows with __kind: "total" receive a darker gold background.',
                ].map((f) => (
                  <Box key={f} display="flex" gap={1} alignItems="flex-start">
                    <Typography variant="caption" color="success.main" fontWeight={700}>✓</Typography>
                    <Typography variant="caption" color="text.secondary">{f}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </Box>

      <Box role="tabpanel" id="xlsx-tab-1" hidden={tab !== 1} aria-labelledby="xlsx-tabBtn-1" pt={2.5}>
        {tab === 1 && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>
                Contract properties (stored in Document Catalogue)
              </Typography>
              <ContractPropertyRef properties={XLSX_PROPERTIES} />
            </Box>
            <Divider />
            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>
                Runtime payload properties (sent to POST /files/generate at generation time)
              </Typography>
              <ContractPropertyRef properties={XLSX_RUNTIME_PROPERTIES} />
            </Box>
          </Stack>
        )}
      </Box>

      <Box role="tabpanel" id="xlsx-tab-2" hidden={tab !== 2} aria-labelledby="xlsx-tabBtn-2" pt={2.5}>
        {tab === 2 && (
          <Stack spacing={3}>
            <Alert severity="success" sx={{ py: 0.5 }}>
              <Typography variant="caption">
                Customer Invoice XLSX contract — one worksheet with date, description, qty, rate, amount columns.
                Valid against the current client-side contract validator.
              </Typography>
            </Alert>

            {!confirmOpen ? (
              <JsonExampleBlock
                json={XLSX_CONTRACT_EXAMPLE}
                label="XLSX format contract — customer invoice"
                onUseExample={() => setConfirmOpen(true)}
              />
            ) : (
              <Box>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>Replace current XLSX contract?</Typography>
                  <Typography variant="caption">The current unsaved JSON in the XLSX editor will be replaced. Other editors and General Information are not affected.</Typography>
                </Alert>
                <Box display="flex" gap={1}>
                  <Box component="button" onClick={() => { onUseExample(XLSX_CONTRACT_EXAMPLE); setConfirmOpen(false); }}
                    sx={{ px: 2, py: 0.75, bgcolor: 'primary.main', color: 'white', border: 'none', borderRadius: 1, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, '&:hover': { bgcolor: 'primary.dark' } }}
                    aria-label="Confirm: replace XLSX contract with example">
                    Replace XLSX contract
                  </Box>
                  <Box component="button" onClick={() => setConfirmOpen(false)}
                    sx={{ px: 2, py: 0.75, bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', fontSize: '0.8rem', '&:hover': { bgcolor: 'action.hover' } }}>
                    Cancel
                  </Box>
                </Box>
              </Box>
            )}

            <Divider />
            <JsonExampleBlock json={XLSX_GENERATION_PAYLOAD_EXAMPLE} label="v2 runtime request — POST /files/documents/generate (values only)" maxHeight={240} />
            <Divider />
            <JsonExampleBlock json={XLSX_LEGACY_PAYLOAD_EXAMPLE}     label="Legacy runtime request — POST /files/generate (full payload)" maxHeight={240} />
          </Stack>
        )}
      </Box>

      <Box role="tabpanel" id="xlsx-tab-3" hidden={tab !== 3} aria-labelledby="xlsx-tabBtn-3" pt={2.5}>
        {tab === 3 && (
          <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Expected Excel workbook structure for the customer invoice contract.
            </Typography>

            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.78rem' }}>
              <Typography variant="caption" fontWeight={700} display="block" mb={1}>Workbook: invoice-INV-0001.xlsx</Typography>
              <Typography variant="caption" display="block" color="primary.main" fontWeight={700} mb={0.5}>│ Sheet: Invoice Items │</Typography>
              <Box component="pre" sx={{ m: 0, fontSize: '0.72rem', overflowX: 'auto' }}>
                {`┌────────────────────────────────────────────────────────────────────┐
│ Invoice INV-0001 — Business App Pty Ltd            (title, bold 14pt) │
│                                                                         │
│ Date ▼    │ Description ▼              │ Qty/Hours ▼ │ Rate ▼  │ Amount ▼│
├───────────┼────────────────────────────┼─────────────┼─────────┼─────────┤
│ 2026-07-10│ Software consulting — API  │ 8           │ 200.00  │ 1600.00 │
│ 2026-07-18│ Frontend integration       │ 6           │ 200.00  │ 1200.00 │
│           │                            │             │         │         │
│ Totals    (bold, gold bg)                                               │
│   Subtotal                                                    2,800.00  │
│   GST (10%)                                                     280.00  │
│   Total Due                                           (bold) 3,080.00   │
│                                                                         │
│ Payment Information  (bold)                                             │
│ • BSB: 062-000 · Account: 1234 5678                                     │
│ • Reference: INV-0001                                                   │
│ • Due: 2026-08-05                                                       │
└─────────────────────────────────────────────────────────────────────────┘`}
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Numeric columns (amount, qty, rate) are auto-detected by key name and formatted as #,##0.00.
              Column widths are auto-fitted. Auto-filter controls appear on every header cell.
            </Typography>
          </Stack>
        )}
      </Box>

      <Box role="tabpanel" id="xlsx-tab-4" hidden={tab !== 4} aria-labelledby="xlsx-tabBtn-4" pt={2.5}>
        {tab === 4 && (
          <Stack spacing={2}>
            <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary">
              Contract-definition validation (enforced now)
            </Typography>
            <Stack spacing={0.75}>
              {[
                'JSON must be syntactically valid.',
                'enabled must be boolean.',
                'version must be a non-empty string when enabled is true.',
                'renderer must exactly equal "xlsx".',
                'worksheets must be an array with at least one entry when enabled is true.',
                'Each worksheet must have a non-empty key.',
                'Each worksheet must have a columns array with at least one entry.',
                'requiredFields and optionalFields must not overlap.',
                'The format (xlsx) must be listed in the parent Domain\'s allowedFormats.',
              ].map((rule) => (
                <Box key={rule} display="flex" gap={1} alignItems="flex-start">
                  <Typography variant="caption" color="success.main" fontWeight={700}>✓</Typography>
                  <Typography variant="caption" color="text.secondary">{rule}</Typography>
                </Box>
              ))}
            </Stack>
            <Divider />
            <Alert severity="warning" sx={{ py: 0.5 }}>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>Runtime-payload validation — not yet implemented</Typography>
              <Typography variant="caption">
                The renderer does not validate that required runtime fields are present before generating the workbook.
                If <code>payload.table</code> is missing, an error is thrown. Other missing optional fields are silently ignored.
              </Typography>
            </Alert>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
