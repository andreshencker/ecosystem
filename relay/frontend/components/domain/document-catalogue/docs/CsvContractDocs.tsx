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
  CSV_CONTRACT_EXAMPLE,
  CSV_GENERATION_PAYLOAD_EXAMPLE,
  CSV_LEGACY_PAYLOAD_EXAMPLE,
  CSV_EXPECTED_OUTPUT,
} from './examples/csv-contract.example';

const CSV_PROPERTIES: PropertyDef[] = [
  { name: 'enabled',        type: 'boolean',  required: 'Yes',          description: 'Activates this format contract.',                                                                                         example: 'true'         },
  { name: 'version',        type: 'string',   required: 'When enabled', description: 'Schema version. Use "2.0" for contracts with dataPath and typed column definitions.',                                    example: '"2.0"'        },
  { name: 'renderer',       type: '"csv"',    required: 'No',           description: 'Must be "csv" when set. Legacy contracts without renderer are still accepted.',                                           example: '"csv"'        },
  { name: 'dataPath',       type: 'string',   required: 'No',           description: 'v2: dot-path into runtime data (e.g. "lineItems" reads data.lineItems). Preferred over legacy dataSource.',              example: '"lineItems"'  },
  { name: 'dataSource',     type: 'string',   required: 'No',           description: 'Legacy: logical source name. Replaced by dataPath in v2. Both accepted; dataPath takes precedence.',                    example: '"line_items"' },
  { name: 'includeHeaders', type: 'boolean',  required: 'No',           description: 'Informational — the CSV renderer always writes headers. Defaults to true.',                                              example: 'true'         },
  { name: 'columns',        type: 'object[]', required: 'When enabled', description: 'Column definitions. Each has key, label, type, required, format, minimum, maximum. Used for headers and row mapping.', example: 'see below'    },
  { name: 'columns[].key',  type: 'string',   required: 'Yes',          description: 'Object key read from each data row.',                                                                                    example: '"amount"'     },
  { name: 'columns[].label',type: 'string',   required: 'No',           description: 'Header label in the CSV first row. Auto-humanised from key if omitted.',                                                example: '"Amount"'     },
  { name: 'columns[].type', type: 'string',   required: 'No',           description: 'FieldType for runtime validation: string | number | currency | date | boolean | ...',                                   example: '"currency"'   },
  { name: 'columns[].required', type: 'boolean', required: 'No',        description: 'When true, runtime validator requires this value in every row.',                                                         example: 'true'         },
  { name: 'notes',          type: 'string',   required: 'No',           description: 'Internal documentation comment. Not written to CSV.',                                                                    example: '"Line items"' },
];

const CSV_RUNTIME_PROPERTIES: PropertyDef[] = [
  { name: 'payload.table',         type: 'object',  required: 'Yes', description: 'Required. Contains columns[] and rows[].', example: '' },
  { name: 'payload.table.columns', type: 'array',   required: 'Yes', description: 'Column definitions: string or { key, label }. Determines header row and cell mapping.', example: '' },
  { name: 'payload.table.rows',    type: 'array',   required: 'Yes', description: 'Row data. Each row is a plain object keyed by column key, or a positional array. Rows with __kind: "subtotal"|"total" are included in "full" mode, excluded in "clean" mode.', example: '' },
  { name: 'payload.mode',          type: '"clean" | "full"', required: 'No', description: 'Default: "full". "clean" strips rows with __kind (subtotal/total rows). Use "clean" for pure data exports.', example: '"clean"' },
];

interface CsvContractDocsProps {
  onUseExample: (json: string) => void;
}

export function CsvContractDocs({ onUseExample }: CsvContractDocsProps) {
  const [tab, setTab] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" aria-label="CSV contract documentation tabs">
        <Tab label="Overview"           aria-controls="csv-tab-0" id="csv-tabBtn-0" />
        <Tab label="Property Reference" aria-controls="csv-tab-1" id="csv-tabBtn-1" />
        <Tab label="Complete Example"   aria-controls="csv-tab-2" id="csv-tabBtn-2" />
        <Tab label="Expected Output"    aria-controls="csv-tab-3" id="csv-tabBtn-3" />
        <Tab label="Validation Rules"   aria-controls="csv-tab-4" id="csv-tabBtn-4" />
      </Tabs>

      <Divider />

      {/* ── Overview ── */}
      <Box role="tabpanel" id="csv-tab-0" hidden={tab !== 0} aria-labelledby="csv-tabBtn-0" pt={2.5}>
        {tab === 0 && (
          <Stack spacing={2}>
            <Typography variant="body2">
              The <strong>CSV contract</strong> describes the structure of a comma-separated values file generated via
              <code> POST /files/generate</code> (format: &quot;csv&quot;). It declares the column mapping and what runtime
              data fields are required.
            </Typography>

            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption" display="block" fontWeight={700} mb={0.5}>Generation flow</Typography>
              <Typography variant="caption" component="pre" fontFamily="monospace" display="block" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {`POST /files/generate   { format: "csv", filename, payload }
  → FilesController.generate()
  → GeneratorService.handle()
  → RendererRegistry.get("csv")
  → CsvRendererService.render({ payload })
  → UTF-8 text buffer → HTTP response`}
              </Typography>
            </Alert>

            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>
                Renderer behaviour
              </Typography>
              <Stack spacing={0.75}>
                {[
                  'Output encoding: UTF-8.',
                  'Delimiter: comma (,). Not configurable in the current renderer.',
                  'Values containing commas, quotes or newlines are automatically double-quoted and internal quotes are escaped as "".',
                  'Header row is always written first (one row per column label).',
                  'Row data: object rows are mapped by column key; array rows are mapped positionally.',
                  'mode: "clean" strips subtotal/total rows (__kind rows). mode: "full" (default) includes them.',
                  'No styling, formulas or metadata — plain text output only.',
                ].map((f) => (
                  <Box key={f} display="flex" gap={1} alignItems="flex-start">
                    <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ minWidth: 12 }}>·</Typography>
                    <Typography variant="caption" color="text.secondary">{f}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={0.5}>
                Column key auto-humanisation
              </Typography>
              <Typography variant="caption" color="text.secondary">
                If a column definition omits <code>label</code>, the renderer calls <code>normalizeColumns()</code>
                which humanises the key: camelCase splits become spaces, underscores and hyphens become spaces,
                and the first letter of each word is capitalised.
                Example: <code>invoiceDate</code> → <em>Invoice Date</em>.
              </Typography>
            </Box>
          </Stack>
        )}
      </Box>

      {/* ── Property Reference ── */}
      <Box role="tabpanel" id="csv-tab-1" hidden={tab !== 1} aria-labelledby="csv-tabBtn-1" pt={2.5}>
        {tab === 1 && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>
                Contract properties (stored in Document Catalogue)
              </Typography>
              <ContractPropertyRef properties={CSV_PROPERTIES} />
            </Box>
            <Divider />
            <Box>
              <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>
                Runtime payload properties (sent to POST /files/generate at generation time)
              </Typography>
              <ContractPropertyRef properties={CSV_RUNTIME_PROPERTIES} />
            </Box>
          </Stack>
        )}
      </Box>

      {/* ── Complete Example ── */}
      <Box role="tabpanel" id="csv-tab-2" hidden={tab !== 2} aria-labelledby="csv-tabBtn-2" pt={2.5}>
        {tab === 2 && (
          <Stack spacing={3}>
            <Alert severity="success" sx={{ py: 0.5 }}>
              <Typography variant="caption">
                Customer Invoice line-items CSV contract — five columns, maps to the <code>line_items</code> data source.
                Valid against the current client-side contract validator.
              </Typography>
            </Alert>

            {!confirmOpen ? (
              <JsonExampleBlock
                json={CSV_CONTRACT_EXAMPLE}
                label="CSV format contract — customer invoice line items"
                onUseExample={() => setConfirmOpen(true)}
              />
            ) : (
              <Box>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>Replace current CSV contract?</Typography>
                  <Typography variant="caption">The current unsaved JSON in the CSV editor will be replaced. Other editors and General Information are not affected.</Typography>
                </Alert>
                <Box display="flex" gap={1}>
                  <Box
                    component="button"
                    onClick={() => { onUseExample(CSV_CONTRACT_EXAMPLE); setConfirmOpen(false); }}
                    sx={{ px: 2, py: 0.75, bgcolor: 'primary.main', color: 'white', border: 'none', borderRadius: 1, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, '&:hover': { bgcolor: 'primary.dark' } }}
                    aria-label="Confirm: replace CSV contract with example"
                  >
                    Replace CSV contract
                  </Box>
                  <Box
                    component="button"
                    onClick={() => setConfirmOpen(false)}
                    sx={{ px: 2, py: 0.75, bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', fontSize: '0.8rem', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    Cancel
                  </Box>
                </Box>
              </Box>
            )}

            <Divider />

            <JsonExampleBlock
              json={CSV_GENERATION_PAYLOAD_EXAMPLE}
              label="Runtime generation payload (POST /files/generate) — for reference only"
              maxHeight={240}
            />
          </Stack>
        )}
      </Box>

      {/* ── Expected Output ── */}
      <Box role="tabpanel" id="csv-tab-3" hidden={tab !== 3} aria-labelledby="csv-tabBtn-3" pt={2.5}>
        {tab === 3 && (
          <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Expected CSV file output using <code>mode: &quot;clean&quot;</code> (no subtotal/total rows). File encoding: UTF-8.
            </Typography>

            <Box
              component="pre"
              sx={{
                m: 0, p: 2,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                fontSize: '0.78rem',
                fontFamily: '"JetBrains Mono","Fira Code","Consolas",monospace',
                lineHeight: 1.7,
                overflowX: 'auto',
                whiteSpace: 'pre',
              }}
              aria-label="Expected CSV output"
            >
              {CSV_EXPECTED_OUTPUT}
            </Box>

            <Typography variant="caption" color="text.secondary">
              Values containing commas (e.g. <code>$1,600.00</code>) are automatically wrapped in double quotes
              by the renderer&apos;s <code>escapeCsv()</code> function.
            </Typography>
          </Stack>
        )}
      </Box>

      {/* ── Validation Rules ── */}
      <Box role="tabpanel" id="csv-tab-4" hidden={tab !== 4} aria-labelledby="csv-tabBtn-4" pt={2.5}>
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
                'renderer must exactly equal "csv".',
                'columns must be an array with at least one entry when enabled is true.',
                'requiredFields and optionalFields must not overlap.',
                'The format (csv) must be listed in the parent Domain\'s allowedFormats.',
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
                The renderer requires <code>payload.table</code> and throws if missing. It does not validate
                that the columns in the payload match the columns declared in the contract, nor that required
                fields are present in the row data.
              </Typography>
            </Alert>

            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>Delimiter and encoding</Typography>
              <Typography variant="caption">
                The current renderer always uses comma delimiter and UTF-8 encoding. These are not configurable
                through the contract. Do not document or promise support for TSV, semicolons or other delimiters.
              </Typography>
            </Alert>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
