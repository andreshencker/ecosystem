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
import {
  PDF_CONTRACT_EXAMPLE,
  PDF_GENERATION_PAYLOAD_EXAMPLE,
  PDF_LEGACY_PAYLOAD_EXAMPLE,
} from './examples/pdf-contract.example';

const FIELD_TYPES = 'string | number | boolean | date | time | datetime | currency | percentage | email | object | array';

const PDF_PROPERTIES: PropertyDef[] = [
  { name: 'enabled',     type: 'boolean', required: 'Yes',          description: 'Activates this format contract.',                                                                        example: 'true'              },
  { name: 'version',     type: 'string',  required: 'When enabled', description: 'Schema version. Use "2.0" for contracts with dataPath and typed field definitions.',                     example: '"2.0"'             },
  { name: 'renderer',    type: '"pdf"',   required: 'No',           description: 'Must be "pdf" when set. Legacy contracts without renderer are still accepted.',                           example: '"pdf"'             },
  { name: 'layoutType',  type: 'string',  required: 'When enabled', description: 'Layout type identifier passed to SourceOfTruthService for layout resolution. Use "pdf".',               example: '"pdf"'             },
  { name: 'layoutKey',   type: 'string',  required: 'No',           description: 'Specific layout template key. If empty, the company default PDF layout is resolved.',                   example: '"default_invoice"' },
  { name: 'sections',    type: 'object[]', required: 'No',          description: 'Array of section declarations. Each section is format-aware — type must be html, summary, table, totals or notes.', example: 'see below' },
  { name: 'notes',       type: 'string',  required: 'No',           description: 'Internal documentation comment. Not rendered.',                                                          example: '"Customer invoice"'},
];

const SECTION_PROPERTIES: PropertyDef[] = [
  { name: 'key',      type: 'string',   required: 'Yes',          description: 'Unique identifier for this section within the document.',                                             example: '"items_table"'        },
  { name: 'type',     type: 'string',   required: 'Yes',          description: 'Section type — html | summary | table | totals | notes. Controls how the builder renders this section.', example: '"table"'          },
  { name: 'label',    type: 'string',   required: 'No',           description: 'Title displayed above the section.',                                                                   example: '"Items"'              },
  { name: 'enabled',  type: 'boolean',  required: 'No',           description: 'When false, this section is skipped entirely. Defaults to true.',                                     example: 'true'                 },
  { name: 'dataPath', type: 'string',   required: 'No',           description: 'v2: dot-path into runtime data object. "lineItems" reads data.lineItems. Empty = uses entire data object.', example: '"lineItems"'  },
  { name: 'dataType', type: 'string',   required: 'No',           description: 'v2: "array" | "object" | "value". Tells the builder how to traverse the resolved value.',             example: '"array"'              },
  { name: 'fields',   type: 'object[]', required: 'No',           description: 'v2: Typed field definitions for html / summary / totals / notes sections.',                           example: 'see field ref'        },
  { name: 'columns',  type: 'object[]', required: 'When table',   description: 'v2: Typed column definitions for table sections. At least one required when type is "table".',        example: 'see field ref'        },
];

const FIELD_DEFINITION_PROPERTIES: PropertyDef[] = [
  { name: 'key',           type: 'string',  required: 'Yes', description: 'Data key read from the runtime value at the resolved dataPath.',                     example: '"invoiceNumber"'   },
  { name: 'label',         type: 'string',  required: 'No',  description: 'Display label in the rendered output.',                                              example: '"Invoice Number"'  },
  { name: 'type',          type: 'string',  required: 'No',  description: FIELD_TYPES,                                                                          example: '"currency"'        },
  { name: 'required',      type: 'boolean', required: 'No',  description: 'When true, runtime data validator requires this key to have a non-empty value.',     example: 'true'              },
  { name: 'format',        type: 'string',  required: 'No',  description: 'Formatting hint: "currency", "percentage", "YYYY-MM-DD", etc.',                     example: '"YYYY-MM-DD"'      },
  { name: 'minimum',       type: 'number',  required: 'No',  description: 'Minimum value constraint for numeric types.',                                        example: '0'                 },
  { name: 'maximum',       type: 'number',  required: 'No',  description: 'Maximum value constraint for numeric types.',                                        example: '100'               },
  { name: 'allowedValues', type: 'string[]', required: 'No', description: 'If set, the value must be one of these strings.',                                   example: '["draft","paid"]'  },
];

const SECTION_TYPES = [
  { type: 'html',    use: 'v2: renders a key-value table from fields[]. Legacy: passes raw html string through. Use for letterheads and company/customer address blocks.' },
  { type: 'summary', use: 'KPI card row — one card per field in fields[]. Ideal for invoice number, issue date, due date, status.' },
  { type: 'table',   use: 'Full table from an array at dataPath. Columns defined in columns[]. Supports __kind:"subtotal"|"total" rows for styled row bands.' },
  { type: 'totals',  use: 'Right-aligned invoice totals block from fields[]. Set emphasis:"strong" on the final row.' },
  { type: 'notes',   use: 'Bulleted list. When dataPath resolves to an array of strings, each string becomes one bullet.' },
];

interface PdfContractDocsProps {
  onUseExample: (json: string) => void;
}

export function PdfContractDocs({ onUseExample }: PdfContractDocsProps) {
  const [tab, setTab] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" aria-label="PDF contract documentation tabs">
        <Tab label="Overview"           />
        <Tab label="Property Reference" />
        <Tab label="Contract Example"   />
        <Tab label="Expected Output"    />
        <Tab label="Validation Rules"   />
      </Tabs>

      <Divider />

      {/* ── Overview ── */}
      <Box role="tabpanel" hidden={tab !== 0} pt={2.5}>
        {tab === 0 && (
          <Stack spacing={2.5}>
            <Typography variant="body2">
              The <strong>PDF contract</strong> defines the visual structure of a document generated by the
              <code> ReportContentBuilder</code>. It declares sections, their types, the runtime data path
              for each section, and the typed field or column definitions the caller must supply.
            </Typography>

            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>v2 contract-driven flow (preferred)</Typography>
              <Typography variant="caption" component="pre" fontFamily="monospace" display="block" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {`POST /files/documents/generate
  { companyId, canonicalKey, filename, data }
  → DocumentGenerationService.generateFromContract()
  → DocumentCatalogueService.findByCompanyAndCanonicalKey()   ← resolves contract
  → validateRuntimeData(format, contract, data)               ← validates data against field defs
  → buildPdfContent(contract, data)                           ← builds ReportPayload from sections[]
  → ReportService.generatePdf({ companyId, report, data })
  → SourceOfTruthService.resolveForPdfReport()                ← company theme + layout
  → ReportContentBuilder.build()
  → PdfRendererService → Puppeteer → PDF buffer`}
              </Typography>
            </Alert>

            <Alert severity="warning" sx={{ py: 0.5 }}>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>Layout dependency</Typography>
              <Typography variant="caption">
                The company must have a <strong>default PDF layout</strong> in the Communications platform.
                Configure one via <em>Layout Templates</em> before generating PDFs.
              </Typography>
            </Alert>

            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>
                Section types supported by the PDF builder
              </Typography>
              <Stack spacing={1}>
                {SECTION_TYPES.map((s) => (
                  <Box key={s.type} display="flex" gap={1.5} alignItems="flex-start">
                    <Typography component="code" variant="caption" fontFamily="monospace" fontWeight={700} color="primary.main" sx={{ minWidth: 68, pt: 0.1 }}>{s.type}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.use}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={0.5}>
                How dataPath works
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Each section has a <code>dataPath</code> property. If set to <code>&quot;lineItems&quot;</code>,
                the builder reads <code>data.lineItems</code> from the runtime data object. Nested paths
                like <code>&quot;invoice.customer&quot;</code> are supported using dot notation.
                An empty <code>dataPath</code> means the entire <code>data</code> object is used.
              </Typography>
            </Box>
          </Stack>
        )}
      </Box>

      {/* ── Property Reference ── */}
      <Box role="tabpanel" hidden={tab !== 1} pt={2.5}>
        {tab === 1 && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>Contract root properties</Typography>
              <ContractPropertyRef properties={PDF_PROPERTIES} />
            </Box>
            <Divider />
            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>Section properties (sections[])</Typography>
              <ContractPropertyRef properties={SECTION_PROPERTIES} />
            </Box>
            <Divider />
            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>Field / column definition (fields[] and columns[])</Typography>
              <ContractPropertyRef properties={FIELD_DEFINITION_PROPERTIES} />
            </Box>
          </Stack>
        )}
      </Box>

      {/* ── Contract Example ── */}
      <Box role="tabpanel" hidden={tab !== 2} pt={2.5}>
        {tab === 2 && (
          <Stack spacing={3}>
            <Alert severity="success" sx={{ py: 0.5 }}>
              <Typography variant="caption">
                Customer Invoice contract (v2) — declares header, summary, table, totals and notes sections
                with dataPath and typed field definitions. Valid against the current validator.
              </Typography>
            </Alert>

            {!confirmOpen ? (
              <JsonExampleBlock
                json={PDF_CONTRACT_EXAMPLE}
                label="PDF format contract (v2)"
                onUseExample={() => setConfirmOpen(true)}
              />
            ) : (
              <Box>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>Replace current PDF contract?</Typography>
                  <Typography variant="caption">The current unsaved JSON in the PDF editor will be replaced. Other editors and General Information are unchanged.</Typography>
                </Alert>
                <Box display="flex" gap={1}>
                  <Box component="button" onClick={() => { onUseExample(PDF_CONTRACT_EXAMPLE); setConfirmOpen(false); }}
                    sx={{ px: 2, py: 0.75, bgcolor: 'primary.main', color: 'white', border: 'none', borderRadius: 1, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, '&:hover': { bgcolor: 'primary.dark' } }}
                    aria-label="Confirm: replace PDF contract with example">
                    Replace PDF contract
                  </Box>
                  <Box component="button" onClick={() => setConfirmOpen(false)}
                    sx={{ px: 2, py: 0.75, bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', fontSize: '0.8rem', '&:hover': { bgcolor: 'action.hover' } }}>
                    Cancel
                  </Box>
                </Box>
              </Box>
            )}

            <Divider />
            <JsonExampleBlock json={PDF_GENERATION_PAYLOAD_EXAMPLE} label="v2 runtime request — POST /files/documents/generate (values only)" maxHeight={280} />
            <Divider />
            <JsonExampleBlock json={PDF_LEGACY_PAYLOAD_EXAMPLE}     label="Legacy runtime request — POST /files/reports/generate/pdf (full structure)" maxHeight={280} />
          </Stack>
        )}
      </Box>

      {/* ── Expected Output ── */}
      <Box role="tabpanel" hidden={tab !== 3} pt={2.5}>
        {tab === 3 && (
          <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Expected visual output for the customer invoice contract example.
              Layout chrome comes from the company PDF layout template.
            </Typography>
            <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', fontSize: '11px', lineHeight: 1.7 }}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>Business App Pty Ltd</Typography>
                  <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>ABN 12 345 678 901</Typography>
                  <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>42 George Street, Sydney NSW 2000</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>Bill To</Typography>
                  <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>John Smith</Typography>
                  <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>john.smith@example.com</Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: '16px', fontWeight: 900, mb: 0.5 }}>INVOICE INV-0001</Typography>
              <Box display="flex" gap={2} mb={2} sx={{ '& > div': { flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 } }}>
                {[['Invoice Number', 'INV-0001'], ['Issue Date', '2026-07-22'], ['Due Date', '2026-08-05'], ['Status', 'Unpaid']].map(([l, v]) => (
                  <Box key={l}><Typography sx={{ fontSize: '9px', color: 'text.secondary' }}>{l}</Typography><Typography sx={{ fontSize: '12px', fontWeight: 900 }}>{v}</Typography></Box>
                ))}
              </Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 0.5 }}>ITEMS</Typography>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', mb: 2 }}>
                <Box component="thead"><Box component="tr" sx={{ bgcolor: 'grey.100' }}>
                  {['Date', 'Description', 'Qty / Hours', 'Rate', 'Amount'].map((h) => (
                    <Box component="th" key={h} sx={{ border: '1px solid', borderColor: 'divider', p: '4px 6px', textAlign: 'left', fontWeight: 700 }}>{h}</Box>
                  ))}
                </Box></Box>
                <Box component="tbody">
                  {[['2026-07-10','Software consulting','8','$200.00','$1,600.00'],['2026-07-18','Frontend integration','6','$200.00','$1,200.00']].map((row, i) => (
                    <Box component="tr" key={i} sx={{ bgcolor: i % 2 === 0 ? 'grey.50' : 'background.paper' }}>
                      {row.map((cell, j) => <Box component="td" key={j} sx={{ border: '1px solid', borderColor: 'divider', p: '4px 6px' }}>{cell}</Box>)}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box display="flex" justifyContent="flex-end" mb={2}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, minWidth: 200 }}>
                  {[['Subtotal','$2,800.00',false],['GST (10%)','$280.00',false],['Total Due','$3,080.00',true]].map(([l,v,strong]) => (
                    <Box key={l as string} display="flex" justifyContent="space-between" gap={3} sx={{ py: 0.25 }}>
                      <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>{l as string}</Typography>
                      <Typography sx={{ fontSize: strong ? '12px' : '11px', fontWeight: strong ? 900 : 700 }}>{v as string}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 0.5 }}>PAYMENT INFORMATION</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '10px', color: 'text.secondary' }}>
                {['Bank: CBA', 'BSB: 062-000 · Account: 1234 5678', 'Reference: INV-0001'].map((i) => <Box component="li" key={i}>{i}</Box>)}
              </Box>
            </Box>
          </Stack>
        )}
      </Box>

      {/* ── Validation Rules ── */}
      <Box role="tabpanel" hidden={tab !== 4} pt={2.5}>
        {tab === 4 && (
          <Stack spacing={2}>
            <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary">
              Contract-definition validation (enforced at save time)
            </Typography>
            <Stack spacing={0.75}>
              {[
                'JSON must be syntactically valid.',
                'enabled must be boolean.',
                'version must be a non-empty string when enabled.',
                'renderer, when set, must exactly equal "pdf".',
                'layoutType must be non-empty when enabled.',
                'sections[].type must be one of: html, summary, table, totals, notes.',
                'sections[] with type "table" must have at least one column when enabled.',
                'sections[].fields[] and sections[].columns[]: each entry must have a key.',
                'sections[].fields[]: type must be a valid FieldType.',
                'sections[].fields[]: minimum must not exceed maximum.',
                'sections[]: duplicate field/column keys within the same section are rejected.',
                'The format (pdf) must be in the parent Domain\'s allowedFormats.',
              ].map((rule) => (
                <Box key={rule} display="flex" gap={1} alignItems="flex-start">
                  <Typography variant="caption" color="success.main" fontWeight={700}>✓</Typography>
                  <Typography variant="caption" color="text.secondary">{rule}</Typography>
                </Box>
              ))}
            </Stack>

            <Divider />

            <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary">
              Runtime-data validation (enforced at generation time — v2 only)
            </Typography>
            <Stack spacing={0.75}>
              {[
                'Each enabled section with a dataPath must resolve to the declared dataType.',
                'When dataType is "array", the resolved value must be an array.',
                'Required fields in fields[] / columns[] must be present and non-empty in every row.',
                'Number type fields are validated against minimum / maximum constraints.',
                'Email type fields must match the standard email format.',
                'Array type fields must be actual arrays; object type fields must be plain objects.',
                'Errors include the full data path: "data.lineItems[0].amount must be >= 0".',
                'Generation is blocked and 422 Unprocessable Entity is returned when validation fails.',
                'Set skipDataValidation: true on the request to bypass during development.',
              ].map((rule) => (
                <Box key={rule} display="flex" gap={1} alignItems="flex-start">
                  <Typography variant="caption" color="success.main" fontWeight={700}>✓</Typography>
                  <Typography variant="caption" color="text.secondary">{rule}</Typography>
                </Box>
              ))}
            </Stack>

            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>Legacy contracts are backward compatible</Typography>
              <Typography variant="caption">
                Contracts without <code>dataPath</code>, <code>fields</code> or <code>columns</code> (pre-v2 contracts)
                continue to load and pass contract-definition validation. They will not benefit from runtime
                data validation since no field definitions are present. The generation endpoint still works.
              </Typography>
            </Alert>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
