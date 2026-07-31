'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormDrawer,
  PermissionGuard,
  RowActions,
  SearchToolbar,
  StatusBadge,
  type MobileCardConfig,
} from '@/components/shared';
import { FormatHelpDialog } from './docs/FormatHelpDialog';
import { DocumentStructurePreviewDialog } from './DocumentStructurePreviewDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useListState } from '@/hooks/useListState';
import { useDocumentDomainCatalogues } from '@/hooks/api/useDocumentDomainCatalogue';
import {
  useDocumentCatalogues,
  useCreateDocumentCatalogueMutation,
  useUpdateDocumentCatalogueMutation,
  useDeleteDocumentCatalogueMutation,
  type CreateDocumentCatalogueDto,
} from '@/hooks/api/useDocumentCatalogue';
import type {
  DocumentDomainCatalogue,
  DocumentCatalogue,
  DocumentFormat,
  DocumentFormatContracts,
} from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_COLORS: Record<DocumentFormat, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pdf:  'error',
  xlsx: 'success',
  csv:  'default',
  html: 'primary',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDomainDisplayName(v: string | DocumentDomainCatalogue | undefined): string {
  if (!v) return '—';
  if (typeof v === 'object') return v.displayName;
  return '—';
}

function getDomainKey(v: string | DocumentDomainCatalogue | undefined): string {
  if (typeof v === 'object' && v !== null) return v.domainKey;
  return '';
}

function getFormatContracts(doc: DocumentCatalogue): string[] {
  const fc = doc.formatContracts ?? {};
  return Object.keys(fc).filter((k) => (fc as any)[k]?.enabled !== false);
}

function canPreviewPdf(doc: DocumentCatalogue): boolean {
  if (!doc.isActive) return false;
  if (!doc.formatContracts?.pdf?.enabled) return false;
  const domain = typeof doc.documentDomainCatalogueId === 'object' ? doc.documentDomainCatalogueId as DocumentDomainCatalogue : null;
  if (domain && !domain.allowedFormats?.includes('pdf')) return false;
  return true;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.8} display="block" mb={1.5}>
      {children}
    </Typography>
  );
}

// ─── Contract defaults & validation ──────────────────────────────────────────

const slugRegex = /^[a-z0-9_-]+$/;

// v2 defaults include dataPath, typed columns and field definitions.
// All new properties have defaults on the backend so old contracts still load.

const PDF_DEFAULT = JSON.stringify(
  {
    enabled: true,
    version: '1.0',
    renderer: 'pdf',
    layoutType: 'pdf',
    layoutKey: '',
    sections: [
      {
        key: 'header',
        type: 'html',
        label: 'Header',
        enabled: true,
        dataPath: '',
        dataType: 'object',
        fields: [
          { key: 'field1', label: 'Field 1', type: 'string', required: true },
        ],
        columns: [],
      },
      {
        key: 'items',
        type: 'table',
        label: 'Items',
        enabled: true,
        dataPath: 'items',
        dataType: 'array',
        fields: [],
        columns: [
          { key: 'col1', label: 'Column 1', type: 'string', required: true },
          { key: 'col2', label: 'Column 2', type: 'number', required: true, minimum: 0 },
        ],
      },
    ],
    notes: '',
  },
  null, 2,
);

const XLSX_DEFAULT = JSON.stringify(
  {
    enabled: true,
    version: '1.0',
    renderer: 'xlsx',
    worksheets: [
      {
        key: 'data',
        label: 'Data',
        dataPath: 'items',
        columns: [
          { key: 'col1', label: 'Column 1', type: 'string', required: true },
          { key: 'col2', label: 'Column 2', type: 'number', required: true, minimum: 0 },
        ],
      },
    ],
    notes: '',
  },
  null, 2,
);

const CSV_DEFAULT = JSON.stringify(
  {
    enabled: true,
    version: '1.0',
    renderer: 'csv',
    dataPath: 'items',
    includeHeaders: true,
    columns: [
      { key: 'col1', label: 'Column 1', type: 'string', required: true },
      { key: 'col2', label: 'Column 2', type: 'number', required: true },
    ],
    notes: '',
  },
  null, 2,
);

const VALID_FIELD_TYPES = ['string', 'number', 'boolean', 'date', 'time', 'datetime', 'currency', 'percentage', 'email', 'object', 'array'];
const VALID_PDF_SECTION_TYPES = ['html', 'summary', 'table', 'totals', 'notes'];

function validateFieldDefs(fields: any[], path: string): string[] {
  const errs: string[] = [];
  const keys = new Set<string>();
  fields.forEach((f, i) => {
    if (!f.key?.trim()) errs.push(`${path}[${i}].key is required`);
    if (f.type && !VALID_FIELD_TYPES.includes(f.type)) errs.push(`${path}[${i}].type "${f.type}" is not valid. Allowed: ${VALID_FIELD_TYPES.join(', ')}`);
    if (f.key) {
      if (keys.has(f.key)) errs.push(`${path}: duplicate key "${f.key}"`);
      keys.add(f.key);
    }
    if (typeof f.minimum === 'number' && typeof f.maximum === 'number' && f.minimum > f.maximum) {
      errs.push(`${path}[${i}].minimum must not exceed maximum`);
    }
  });
  return errs;
}

function validateContractJson(format: string, json: string, allowedFormats: string[]): string[] {
  const errors: string[] = [];
  if (!allowedFormats.includes(format)) {
    errors.push(`Format "${format}" is not permitted by this domain`);
    return errors;
  }
  let contract: any;
  try { contract = JSON.parse(json); }
  catch { errors.push('Invalid JSON syntax'); return errors; }

  if (contract.enabled === true) {
    if (!contract.version?.trim()) errors.push('version is required when enabled');
    // renderer: only fail when explicitly set to the wrong value (backward compat for old contracts)
    if (contract.renderer && contract.renderer !== format) errors.push(`renderer must be "${format}" (got "${contract.renderer}")`);

    if (format === 'pdf') {
      if (!contract.layoutType?.trim()) errors.push('layoutType is required when enabled');
      if (Array.isArray(contract.sections)) {
        contract.sections.forEach((s: any, i: number) => {
          if (s.type && !VALID_PDF_SECTION_TYPES.includes(s.type)) {
            errors.push(`sections[${i}].type "${s.type}" is not valid. Allowed: ${VALID_PDF_SECTION_TYPES.join(', ')}`);
          }
          if (s.type === 'table' && s.enabled !== false && (!Array.isArray(s.columns) || s.columns.length === 0)) {
            errors.push(`sections[${i}] (table "${s.key || '?'}"): needs at least one column when enabled`);
          }
          if (Array.isArray(s.fields))  errors.push(...validateFieldDefs(s.fields,  `sections[${i}].fields`));
          if (Array.isArray(s.columns)) errors.push(...validateFieldDefs(s.columns, `sections[${i}].columns`));
        });
      }
    }

    if (format === 'xlsx') {
      if (!Array.isArray(contract.worksheets) || contract.worksheets.length === 0) {
        errors.push('worksheets must have at least one entry when enabled');
      } else {
        contract.worksheets.forEach((ws: any, i: number) => {
          if (!ws.key?.trim()) errors.push(`worksheets[${i}].key is required`);
          if (!Array.isArray(ws.columns) || ws.columns.length === 0) errors.push(`Worksheet "${ws.key || '?'}" needs at least one column`);
          if (Array.isArray(ws.columns)) errors.push(...validateFieldDefs(ws.columns, `worksheets[${i}].columns`));
        });
      }
    }

    if (format === 'csv') {
      if (!Array.isArray(contract.columns) || contract.columns.length === 0) {
        errors.push('columns must have at least one entry when enabled');
      } else {
        errors.push(...validateFieldDefs(contract.columns, 'columns'));
      }
    }
  }

  if (Array.isArray(contract.requiredFields) && Array.isArray(contract.optionalFields)) {
    const reqSet = new Set<string>(contract.requiredFields);
    const overlap = (contract.optionalFields as string[]).filter((f) => reqSet.has(f));
    if (overlap.length > 0) errors.push(`Fields in both requiredFields and optionalFields: ${overlap.join(', ')}`);
  }
  return errors;
}

// ─── DocumentFormDrawer ───────────────────────────────────────────────────────

const metaSchema = z.object({
  documentDomainCatalogueId: z.string().min(1, 'Domain is required'),
  documentKey:  z.string().min(1, 'Required').max(200).regex(slugRegex, 'Lowercase, numbers, _ and - only'),
  displayName:  z.string().min(1, 'Required').max(300),
  description:  z.string().max(1000).optional().default(''),
  isActive:     z.boolean().default(true),
  pdfEnabled:   z.boolean().default(false),
  xlsxEnabled:  z.boolean().default(false),
  csvEnabled:   z.boolean().default(false),
});
type MetaValues = z.infer<typeof metaSchema>;

interface DocumentFormDrawerProps {
  open: boolean;
  doc: DocumentCatalogue | null;
  domains: DocumentDomainCatalogue[];
  defaultDomainId: string;
  onClose: () => void;
}

function DocumentFormDrawer({ open, doc, domains, defaultDomainId, onClose }: DocumentFormDrawerProps) {
  const createMutation = useCreateDocumentCatalogueMutation();
  const updateMutation = useUpdateDocumentCatalogueMutation();
  const isEditing = Boolean(doc);

  // Per-format contract JSON strings — independent state from the metadata form
  const [contractJson, setContractJson] = useState<Record<string, string>>({
    pdf: PDF_DEFAULT, xlsx: XLSX_DEFAULT, csv: CSV_DEFAULT,
  });

  // Validation feedback
  const [validation, setValidation] = useState<{ errors: string[]; success: boolean } | null>(null);

  // Help dialog — tracks which format's documentation is open (null = closed)
  const [helpFormat, setHelpFormat] = useState<string | null>(null);

  const form = useForm<MetaValues>({
    resolver: zodResolver(metaSchema),
    defaultValues: {
      documentDomainCatalogueId: defaultDomainId,
      documentKey: '', displayName: '', description: '',
      isActive: true, pdfEnabled: false, xlsxEnabled: false, csvEnabled: false,
    },
  });

  const { control, watch, handleSubmit, formState: { errors } } = form;

  // Reset form and contracts whenever the drawer opens for a (different) document
  useEffect(() => {
    if (!open) return;
    const fc = doc?.formatContracts ?? {};

    // The list query uses populateDocumentDomain: true, so documentDomainCatalogueId
    // arrives as a raw populated MongoDB object with _id (not id).
    // DocumentCatalogueMapper passes it through without running DocumentDomainCatalogueMapper,
    // so we must handle both the populated-object (_id) and unpopulated-string shapes.
    const rawDomain = doc?.documentDomainCatalogueId;
    const domainId = !doc
      ? defaultDomainId
      : typeof rawDomain === 'string'
        ? rawDomain
        : rawDomain && typeof rawDomain === 'object'
          ? String((rawDomain as any)._id ?? (rawDomain as DocumentDomainCatalogue).id ?? '')
          : defaultDomainId;

    form.reset({
      documentDomainCatalogueId: domainId,
      documentKey:  doc?.documentKey  ?? '',
      displayName:  doc?.displayName  ?? '',
      description:  doc?.description  ?? '',
      isActive:     doc?.isActive     ?? true,
      pdfEnabled:   Boolean(fc.pdf?.enabled),
      xlsxEnabled:  Boolean(fc.xlsx?.enabled),
      csvEnabled:   Boolean(fc.csv?.enabled),
    });
    setContractJson({
      pdf:  fc.pdf  ? JSON.stringify(fc.pdf,  null, 2) : PDF_DEFAULT,
      xlsx: fc.xlsx ? JSON.stringify(fc.xlsx, null, 2) : XLSX_DEFAULT,
      csv:  fc.csv  ? JSON.stringify(fc.csv,  null, 2) : CSV_DEFAULT,
    });
    setValidation(null);
  }, [open, doc, defaultDomainId]); // eslint-disable-line react-hooks/exhaustive-deps

  const watchDomainId = watch('documentDomainCatalogueId');
  const pdfEnabled  = watch('pdfEnabled');
  const xlsxEnabled = watch('xlsxEnabled');
  const csvEnabled  = watch('csvEnabled');
  const documentKey = watch('documentKey');

  const selectedDomain = useMemo(() => domains.find((d) => d.id === watchDomainId), [domains, watchDomainId]);
  const allowedFormats: DocumentFormat[] = selectedDomain?.allowedFormats ?? [];
  const domainKey = selectedDomain?.domainKey ?? '';

  const isPending = createMutation.isPending || updateMutation.isPending;
  const anyEnabled = pdfEnabled || xlsxEnabled || csvEnabled;

  function updateJson(fmt: string, value: string) {
    setContractJson((prev) => ({ ...prev, [fmt]: value }));
    setValidation(null);
  }

  function handleValidate() {
    const allErrors: string[] = [];
    const enabled: Array<[string, string]> = [];
    if (pdfEnabled)  enabled.push(['pdf',  contractJson.pdf]);
    if (xlsxEnabled) enabled.push(['xlsx', contractJson.xlsx]);
    if (csvEnabled)  enabled.push(['csv',  contractJson.csv]);
    if (enabled.length === 0) { allErrors.push('Enable at least one format before validating'); }
    for (const [fmt, json] of enabled) {
      validateContractJson(fmt, json, allowedFormats).forEach((e) => allErrors.push(`${fmt.toUpperCase()}: ${e}`));
    }
    setValidation({ errors: allErrors, success: allErrors.length === 0 });
  }

  function buildContracts(): DocumentFormatContracts {
    const result: DocumentFormatContracts = {};
    try { if (pdfEnabled)  result.pdf  = { ...JSON.parse(contractJson.pdf),  enabled: true }; } catch {}
    try { if (xlsxEnabled) result.xlsx = { ...JSON.parse(contractJson.xlsx), enabled: true }; } catch {}
    try { if (csvEnabled)  result.csv  = { ...JSON.parse(contractJson.csv),  enabled: true }; } catch {}
    return result;
  }

  async function onSubmit(values: MetaValues) {
    // Auto-validate every enabled format contract before sending the request.
    // This prevents a silent no-op when the JSON is invalid and avoids requiring
    // the user to click "Validate Contract" manually first.
    const enabledFormats: Array<[string, string]> = [];
    if (pdfEnabled)  enabledFormats.push(['pdf',  contractJson.pdf]);
    if (xlsxEnabled) enabledFormats.push(['xlsx', contractJson.xlsx]);
    if (csvEnabled)  enabledFormats.push(['csv',  contractJson.csv]);

    if (enabledFormats.length > 0) {
      const contractErrors: string[] = [];
      for (const [fmt, json] of enabledFormats) {
        validateContractJson(fmt, json, allowedFormats).forEach((e) => contractErrors.push(`${fmt.toUpperCase()}: ${e}`));
      }
      if (contractErrors.length > 0) {
        setValidation({ errors: contractErrors, success: false });
        return;
      }
    }

    const formatContracts = buildContracts();
    try {
      if (isEditing && doc) {
        await updateMutation.mutateAsync({ id: doc.id, displayName: values.displayName, description: values.description, isActive: values.isActive, formatContracts });
      } else {
        await createMutation.mutateAsync({ documentDomainCatalogueId: values.documentDomainCatalogueId, documentKey: values.documentKey, displayName: values.displayName, description: values.description, formatContracts } as CreateDocumentCatalogueDto);
      }
      onClose();
    } catch { /* mutations handle error toasts */ }
  }

  // ── Shared contract editor ─────────────────────────────────────────────────
  function ContractEditor({ format, rows = 16 }: { format: string; rows?: number }) {
    const color = FORMAT_COLORS[format as DocumentFormat] ?? 'default';
    const canonicalKey = domainKey && documentKey ? `${domainKey}.${documentKey}.${format}` : `*.*.${format}`;
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Chip label={format.toUpperCase()} size="small" color={color} variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
          <Typography variant="caption" color="text.secondary" fontFamily="monospace">{canonicalKey}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            variant="text"
            startIcon={<HelpOutlineOutlinedIcon sx={{ fontSize: '0.9rem !important' }} />}
            onClick={() => setHelpFormat(format)}
            aria-label={`Help and examples for ${format.toUpperCase()} contract`}
            sx={{ fontSize: '0.72rem', fontWeight: 500, color: 'text.secondary', minWidth: 0, px: 1 }}
          >
            Help &amp; Examples
          </Button>
        </Box>
        <TextField
          fullWidth multiline rows={rows}
          value={contractJson[format] ?? ''}
          onChange={(e) => updateJson(format, e.target.value)}
          InputProps={{ sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.8rem', lineHeight: 1.65 } }}
          aria-label={`${format.toUpperCase()} format contract JSON editor`}
        />
      </Box>
    );
  }

  return (
    <>
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Document' : 'New Document'}
      width={720}
      actions={
        <Box display="flex" gap={1} alignItems="center" width="100%">
          <Button variant="outlined" size="small" onClick={handleValidate} disabled={!anyEnabled}>
            Validate Contract
          </Button>
          {pdfEnabled && (
            <Tooltip title="PDF preview will be available once the document renderer is connected">
              <span>
                <Button variant="outlined" size="small" disabled>Preview PDF</Button>
              </span>
            </Tooltip>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Document'}
          </Button>
        </Box>
      }
    >
      <Stack spacing={0}>

        {/* ── SECTION 1: General Information ── */}
        <Box>
          <SectionLabel>General Information</SectionLabel>
          <Stack spacing={2}>
            <Controller name="documentDomainCatalogueId" control={control} render={({ field }) => (
              <TextField {...field} select label="Domain" fullWidth size="small" required disabled={isEditing}
                error={Boolean(errors.documentDomainCatalogueId)}
                helperText={errors.documentDomainCatalogueId?.message ?? (isEditing ? 'Domain cannot be changed after creation' : undefined)}>
                {domains.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.displayName}
                    <Typography component="span" variant="caption" color="text.secondary" ml={1}>({d.domainKey})</Typography>
                  </MenuItem>
                ))}
              </TextField>
            )} />

            <Controller name="documentKey" control={control} render={({ field }) => (
              <TextField {...field} label="Document Key" fullWidth size="small" required disabled={isEditing}
                placeholder="customer_invoice"
                error={Boolean(errors.documentKey)}
                helperText={errors.documentKey?.message ?? (isEditing ? 'Cannot be changed after creation' : 'Unique slug — e.g. customer_invoice')}
                InputProps={isEditing ? { sx: { fontFamily: 'monospace' } } : undefined}
              />
            )} />

            <Controller name="displayName" control={control} render={({ field }) => (
              <TextField {...field} label="Display Name" fullWidth size="small" required
                error={Boolean(errors.displayName)} helperText={errors.displayName?.message} />
            )} />

            <Controller name="description" control={control} render={({ field }) => (
              <TextField {...field} label="Description" fullWidth size="small" multiline rows={2}
                placeholder="Optional — internal documentation" />
            )} />

            {isEditing && (
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Active"
                />
              )} />
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* ── SECTION 2: Formats ── */}
        <Box>
          <SectionLabel>Formats</SectionLabel>
          {allowedFormats.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              The selected domain has no allowed formats. Update the domain to add output formats first.
            </Typography>
          ) : (
            <FormGroup row sx={{ gap: 2 }}>
              {allowedFormats.includes('pdf') && (
                <Controller name="pdfEnabled" control={control} render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox size="small" checked={Boolean(field.value)} onChange={(e) => { field.onChange(e.target.checked); setValidation(null); }} />}
                    label={<Chip label="PDF" size="small" color="error" variant="outlined" sx={{ fontSize: '0.75rem', cursor: 'pointer' }} />}
                  />
                )} />
              )}
              {allowedFormats.includes('xlsx') && (
                <Controller name="xlsxEnabled" control={control} render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox size="small" checked={Boolean(field.value)} onChange={(e) => { field.onChange(e.target.checked); setValidation(null); }} />}
                    label={<Chip label="XLSX" size="small" color="success" variant="outlined" sx={{ fontSize: '0.75rem', cursor: 'pointer' }} />}
                  />
                )} />
              )}
              {allowedFormats.includes('csv') && (
                <Controller name="csvEnabled" control={control} render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox size="small" checked={Boolean(field.value)} onChange={(e) => { field.onChange(e.target.checked); setValidation(null); }} />}
                    label={<Chip label="CSV" size="small" color="default" variant="outlined" sx={{ fontSize: '0.75rem', cursor: 'pointer' }} />}
                  />
                )} />
              )}
              {allowedFormats.includes('html') && (
                <Tooltip title="HTML contracts are configured via the API">
                  <Chip label="HTML" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.75rem', opacity: 0.45, cursor: 'not-allowed' }} />
                </Tooltip>
              )}
            </FormGroup>
          )}
        </Box>

        {/* ── SECTION 3: Contract ── */}
        {anyEnabled && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <SectionLabel>Contract</SectionLabel>
              <Stack spacing={3}>
                {/* Validation feedback */}
                {validation && (
                  validation.errors.length > 0 ? (
                    <Alert severity="error" sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} mb={0.5}>Validation failed</Typography>
                      {validation.errors.map((e, i) => (
                        <Typography key={i} variant="caption" display="block">• {e}</Typography>
                      ))}
                    </Alert>
                  ) : (
                    <Alert severity="success" sx={{ py: 0.5 }}>Contract is valid</Alert>
                  )
                )}

                {pdfEnabled  && <ContractEditor format="pdf"  rows={16} />}
                {xlsxEnabled && <ContractEditor format="xlsx" rows={16} />}
                {csvEnabled  && <ContractEditor format="csv"  rows={14} />}
              </Stack>
            </Box>
          </>
        )}
      </Stack>
    </FormDrawer>

    <FormatHelpDialog
      format={helpFormat}
      onClose={() => setHelpFormat(null)}
      onUseExample={(json) => {
        if (!helpFormat) return;
        updateJson(helpFormat, json);
        // Run client-side validation immediately so feedback appears in the editor
        const errs = validateContractJson(helpFormat, json, allowedFormats);
        setValidation({
          errors: errs.map((e) => `${helpFormat.toUpperCase()}: ${e}`),
          success: errs.length === 0,
        });
      }}
    />
    </>
  );
}

// ─── Table columns ────────────────────────────────────────────────────────────

const docColumns: GridColDef<DocumentCatalogue>[] = [
  {
    field: 'domain', headerName: 'Domain', width: 140, sortable: false,
    renderCell: (p) => {
      const name = getDomainDisplayName(p.row.documentDomainCatalogueId);
      const key  = getDomainKey(p.row.documentDomainCatalogueId);
      return (
        <Box>
          <Typography variant="body2" noWrap fontWeight={500}>{name}</Typography>
          {key && <Typography variant="caption" color="text.secondary" fontFamily="monospace" display="block" noWrap>{key}</Typography>}
        </Box>
      );
    },
  },
  {
    field: 'documentKey', headerName: 'Document Key', flex: 1, minWidth: 140,
    renderCell: (p) => <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem" noWrap>{p.row.documentKey}</Typography>,
  },
  {
    field: 'displayName', headerName: 'Display Name', flex: 1.5, minWidth: 150,
    renderCell: (p) => (
      <Box>
        <Typography variant="body2" fontWeight={500} noWrap>{p.row.displayName}</Typography>
        {p.row.description && <Typography variant="caption" color="text.secondary" display="block" noWrap>{p.row.description.slice(0, 50)}{p.row.description.length > 50 ? '…' : ''}</Typography>}
      </Box>
    ),
  },
  {
    field: 'formats', headerName: 'Formats', width: 180, sortable: false,
    renderCell: (p) => {
      const active = getFormatContracts(p.row);
      return (
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {active.map((f) => <Chip key={f} label={f.toUpperCase()} size="small" color={FORMAT_COLORS[f as DocumentFormat] ?? 'default'} variant="outlined" sx={{ fontSize: '0.65rem' }} />)}
          {active.length === 0 && <Typography variant="caption" color="text.disabled">None</Typography>}
        </Box>
      );
    },
  },
  {
    field: 'isActive', headerName: 'Status', width: 100,
    renderCell: (p) => <StatusBadge active={p.row.isActive} />,
  },
  {
    field: 'updatedAt', headerName: 'Updated', width: 110,
    renderCell: (p) => (
      <Typography variant="caption" color="text.secondary">
        {p.row.updatedAt ? new Date(p.row.updatedAt).toLocaleDateString() : '—'}
      </Typography>
    ),
  },
];

// ─── Mobile card config ───────────────────────────────────────────────────────

const docMobileConfig: MobileCardConfig<DocumentCatalogue> = {
  primaryText:   'displayName',
  secondaryText: (row) => { const key = getDomainKey(row.documentDomainCatalogueId); return key ? `${key} · ${row.documentKey}` : row.documentKey; },
  badge: (row) => <StatusBadge active={row.isActive} />,
  fields: [
    {
      field: 'formatContracts', label: 'Formats',
      render: (_v, row) => {
        const active = getFormatContracts(row);
        return (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {active.map((f) => <Chip key={f} label={f.toUpperCase()} size="small" color={FORMAT_COLORS[f as DocumentFormat] ?? 'default'} variant="outlined" sx={{ fontSize: '0.65rem' }} />)}
            {active.length === 0 && <Typography variant="caption" color="text.disabled">None</Typography>}
          </Box>
        );
      },
    },
  ],
};

// ─── DocumentCatalogueList ────────────────────────────────────────────────────

interface DocumentCatalogueListProps {
  companyId: string;
  initialDomainId?: string;
}

export function DocumentCatalogueList({ companyId, initialDomainId = '' }: DocumentCatalogueListProps) {
  const { canManageDomains } = usePermissions();
  const list = useListState();
  const router = useRouter();

  // Domain data
  const { data: domainsData, isLoading: domainsLoading } = useDocumentDomainCatalogues(companyId, { limit: 100 });
  const domains = useMemo(() => domainsData?.items ?? [], [domainsData]);

  // Domain selector — prefer initialDomainId from query param, then first domain
  const [selectedDomainId, setSelectedDomainId] = useState('');

  useEffect(() => {
    if (selectedDomainId) return;
    if (initialDomainId && domains.some((d) => d.id === initialDomainId)) {
      setSelectedDomainId(initialDomainId);
      return;
    }
    if (domains.length > 0) setSelectedDomainId(domains[0].id);
  }, [domains, selectedDomainId, initialDomainId]);

  // Documents data
  const { data: docsData, isLoading: docsLoading, error: docsError } =
    useDocumentCatalogues(selectedDomainId || null, { limit: 200, populateDocumentDomain: true });

  const deleteMutation = useDeleteDocumentCatalogueMutation();
  const allDocs = useMemo(() => docsData?.items ?? [], [docsData]);

  // Filters
  const statusFilter = list.filters['status'] ?? '';
  const formatFilter = list.filters['format'] ?? '';

  const filteredDocs = useMemo(() => {
    let result = allDocs;
    if (list.debouncedSearch.trim()) {
      const q = list.debouncedSearch.toLowerCase();
      result = result.filter(
        (d) =>
          d.documentKey.toLowerCase().includes(q) ||
          d.displayName.toLowerCase().includes(q) ||
          (d.description ?? '').toLowerCase().includes(q),
      );
    }
    if (statusFilter) result = result.filter((d) => statusFilter === 'active' ? d.isActive : !d.isActive);
    if (formatFilter) result = result.filter((d) => getFormatContracts(d).includes(formatFilter));
    return result;
  }, [allDocs, list.debouncedSearch, statusFilter, formatFilter]);

  // Drawers
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<DocumentCatalogue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentCatalogue | null>(null);

  // Structural PDF preview
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [previewTarget, setPreviewTarget] = useState<DocumentCatalogue | null>(null);

  function openCreate() { setEditTarget(null); setDrawerOpen(true); }
  function openEdit(doc: DocumentCatalogue) { setEditTarget(doc); setDrawerOpen(true); }
  function openPreview(doc: DocumentCatalogue) { setPreviewTarget(doc); setPreviewOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const rowActions = (doc: DocumentCatalogue) => (
    <RowActions>
      <Tooltip title={canPreviewPdf(doc) ? 'Preview document structure' : 'Preview requires an active document with an enabled PDF contract'}>
        <span>
          <IconButton
            size="small"
            onClick={() => openPreview(doc)}
            disabled={!canPreviewPdf(doc)}
            aria-label="Preview document structure"
          >
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <PermissionGuard allowed={canManageDomains}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => openEdit(doc)}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => setDeleteTarget(doc)}>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </PermissionGuard>
    </RowActions>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" gap={1} mb={1}>
        <PermissionGuard allowed={canManageDomains && Boolean(selectedDomainId)}>
          <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            Add Document
          </Button>
        </PermissionGuard>
      </Box>

      {/* Domain selector */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 360 } }} disabled={domainsLoading}>
          <InputLabel>Document Domain</InputLabel>
          <Select value={selectedDomainId} label="Document Domain" onChange={(e) => { setSelectedDomainId(e.target.value); list.clearFilters(); }}>
            {domainsLoading
              ? <MenuItem value=""><em>Loading…</em></MenuItem>
              : domains.length === 0
                ? <MenuItem value="" disabled>No document domains configured</MenuItem>
                : domains.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.displayName}
                      <Typography component="span" variant="caption" color="text.secondary" ml={1}>({d.domainKey})</Typography>
                    </MenuItem>
                  ))
            }
          </Select>
        </FormControl>
      </Paper>

      {/* Search + filters */}
      <SearchToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search name, key, description…"
        hasActiveFilters={list.hasActiveFilters}
        onClearFilters={list.clearFilters}
      >
        <FormControl size="small" sx={{ minWidth: 115 }} disabled={!selectedDomainId || docsLoading}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => list.setFilter('status', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }} disabled={!selectedDomainId || docsLoading}>
          <InputLabel>Format</InputLabel>
          <Select value={formatFilter} label="Format" onChange={(e) => list.setFilter('format', e.target.value)}>
            <MenuItem value="">All formats</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="xlsx">XLSX</MenuItem>
            <MenuItem value="csv">CSV</MenuItem>
            <MenuItem value="html">HTML</MenuItem>
          </Select>
        </FormControl>
      </SearchToolbar>

      {/* Content */}
      {!selectedDomainId ? (
        !domainsLoading && domains.length === 0 ? (
          <EmptyState
            icon={ArticleOutlinedIcon}
            title="No document domains configured"
            description="A Document Domain must be created first to define what document types are allowed and which output formats they support."
            action={
              <Button variant="contained" onClick={() => router.push('/document-domain-catalogue')}>
                Go to Document Domains
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ArticleOutlinedIcon}
            title="Select a domain to manage documents"
            description="Choose a document domain above to view, create and manage its document catalogue."
          />
        )
      ) : docsLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : docsError ? (
        <Alert severity="error">Failed to load documents. Please check your connection and try again.</Alert>
      ) : (
        <DataTable<DocumentCatalogue>
          rows={filteredDocs}
          columns={docColumns}
          total={filteredDocs.length}
          page={list.page}
          pageSize={Math.max(filteredDocs.length, 25)}
          onPageChange={list.setPage}
          onPageSizeChange={() => {}}
          rowActions={rowActions}
          mobileCardConfig={docMobileConfig}
          getRowId={(row) => row.id}
          noRowsLabel="No documents found."
          emptyState={
            allDocs.length === 0 ? (
              <EmptyState
                icon={ArticleOutlinedIcon}
                title="No documents configured"
                description="Create documents to define document types and their output format contracts."
                action={
                  <PermissionGuard allowed={canManageDomains}>
                    <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>Add Document</Button>
                  </PermissionGuard>
                }
              />
            ) : (
              <EmptyState title="No documents match your filters" description="Try adjusting or clearing your filters." action={<Button variant="outlined" onClick={list.clearFilters}>Clear filters</Button>} />
            )
          }
        />
      )}

      {/* Form drawer */}
      {selectedDomainId && (
        <DocumentFormDrawer
          open={drawerOpen}
          doc={editTarget}
          domains={domains}
          defaultDomainId={selectedDomainId}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete document?"
        description={`"${deleteTarget?.displayName}" (${deleteTarget?.documentKey}) will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        danger
      />

      {/* Structural PDF preview */}
      <DocumentStructurePreviewDialog
        open={previewOpen}
        doc={previewTarget}
        companyId={companyId}
        onClose={() => { setPreviewOpen(false); setPreviewTarget(null); }}
      />
    </Box>
  );
}
