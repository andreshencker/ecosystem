'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { PermissionGuard, RowActions, SearchToolbar } from '@/components/shared';
import { apiClient } from '@/lib/axios';
import { usePermissions } from '@/hooks/usePermissions';
import { useListState } from '@/hooks/useListState';
import {
  useLayoutTemplates,
  useLayoutTemplate,
  useCreateLayoutTemplateMutation,
  useUpdateLayoutTemplateMutation,
  useDeleteLayoutTemplateMutation,
  usePreviewLayoutHtmlMutation,
  type CreateLayoutTemplateDto,
  type ThemeSummary,
} from '@/hooks/api/useLayoutTemplates';
import type { LayoutTemplate } from '@/types/api';

// ─── HTML starters ────────────────────────────────────────────────────────────

const DEFAULT_EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{company.displayName}}</title>
  <style>
    body { margin:0; padding:0; background:{{theme.backgroundColor}}; font-family:{{theme.fontFamily}}; color:{{theme.textColor}}; }
    .wrapper { padding:32px 0; }
    .container { max-width:600px; margin:0 auto; background:{{theme.surfaceColor}}; border:1px solid {{theme.borderColor}}; border-radius:8px; overflow:hidden; }
    .header { background:{{theme.primaryColor}}; padding:24px 32px; text-align:center; color:#fff; font-weight:bold; font-size:18px; }
    .body { padding:32px; line-height:1.6; }
    .footer { border-top:1px solid {{theme.borderColor}}; padding:16px 32px; text-align:center; font-size:12px; color:{{theme.mutedTextColor}}; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">{{company.displayName}}</div>
      <div class="body">{{content}}</div>
      <div class="footer">{{company.copyrightText}}</div>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_PDF_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{company.displayName}}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:{{theme.fontFamily}};font-size:{{theme.fontSizeBase}};color:{{theme.textColor}};background:#fff;}
    .header{display:flex;align-items:center;justify-content:space-between;padding:20px 40px;border-bottom:2px solid {{theme.primaryColor}};margin-bottom:28px;}
    .header-title{font-size:20px;font-weight:bold;color:{{theme.primaryColor}};}
    .body{padding:0 40px;}
    .footer{position:fixed;bottom:0;left:0;right:0;padding:10px 40px;border-top:1px solid {{theme.borderColor}};display:flex;justify-content:space-between;font-size:11px;color:{{theme.mutedTextColor}};}
  </style>
</head>
<body>
  <div class="header"><span class="header-title">{{company.displayName}}</span></div>
  <div class="body">{{content}}</div>
  <div class="footer"><span>{{company.copyrightText}}</span></div>
</body>
</html>`;

// ─── Form schema ──────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9_-]+$/;

const templateSchema = z.object({
  templateType: z.enum(['email', 'pdf']),
  name:         z.string().min(1, 'Required').max(200),
  key:          z.string().min(1, 'Required').max(100).regex(slugRegex, 'Lowercase, numbers, underscores, hyphens'),
  html:         z.string().min(1, 'HTML is required').refine(
    (v) => v.includes('{{content}}'),
    { message: 'HTML must contain {{content}} — where the email/PDF body is injected' },
  ),
  css:       z.string().optional(),
  reqVars:   z.string().optional(),
  optVars:   z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive:  z.boolean().optional(),
});

type FormValues = z.infer<typeof templateSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseVars(csv: string | undefined): string[] {
  if (!csv) return [];
  return csv.split(',').map((s) => s.trim()).filter(Boolean);
}
function joinVars(arr: string[] | undefined): string { return (arr ?? []).join(', '); }
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ─── TemplateDrawer ───────────────────────────────────────────────────────────

interface TemplateDrawerProps {
  open: boolean;
  editId: string | null;
  themes: ThemeSummary[];
  defaultThemeId: string | null;
  onClose: () => void;
}

function TemplateDrawer({ open, editId, themes, defaultThemeId, onClose }: TemplateDrawerProps) {
  const isEditing      = Boolean(editId);
  const createMutation = useCreateLayoutTemplateMutation();
  const updateMutation = useUpdateLayoutTemplateMutation();
  const { data: editData, isLoading: editLoading } = useLayoutTemplate(editId);

  const form = useForm<FormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: { templateType: 'email', name: '', key: '', html: DEFAULT_EMAIL_HTML, css: '', reqVars: '', optVars: '', isDefault: false, isActive: true },
  });

  const watchName = form.watch('name');
  const watchType = form.watch('templateType');

  useEffect(() => {
    if (open && !isEditing) {
      form.reset({ templateType: 'email', name: '', key: '', html: DEFAULT_EMAIL_HTML, css: '', reqVars: '', optVars: '', isDefault: false, isActive: true });
    }
  }, [open, isEditing, form]);

  useEffect(() => {
    if (editData && isEditing) {
      form.reset({
        templateType: editData.templateType,
        name:         editData.name,
        key:          editData.key,
        html:         editData.html ?? '',
        css:          editData.css ?? '',
        reqVars:      joinVars(editData.requiredVariables),
        optVars:      joinVars(editData.optionalVariables),
        isDefault:    editData.isDefault,
        isActive:     editData.isActive,
      });
    }
  }, [editData, isEditing, form]);

  useEffect(() => {
    if (!isEditing && watchName) form.setValue('key', slugify(watchName), { shouldValidate: false });
  }, [watchName, isEditing, form]);

  useEffect(() => {
    if (!isEditing) form.setValue('html', watchType === 'pdf' ? DEFAULT_PDF_HTML : DEFAULT_EMAIL_HTML, { shouldValidate: false });
  }, [watchType, isEditing, form]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: FormValues) {
    const themeId = defaultThemeId ?? themes[0]?.themeId;
    if (!themeId && !isEditing) return;

    if (isEditing && editId) {
      await updateMutation.mutateAsync({
        id: editId,
        name:              values.name,
        html:              values.html,
        css:               values.css ?? '',
        requiredVariables: parseVars(values.reqVars),
        optionalVariables: parseVars(values.optVars),
        isDefault:         values.isDefault,
        isActive:          values.isActive,
      });
    } else {
      const dto: CreateLayoutTemplateDto = {
        companyThemeId:    themeId!,
        templateType:      values.templateType,
        key:               values.key,
        name:              values.name,
        html:              values.html,
        css:               values.css ?? '',
        requiredVariables: parseVars(values.reqVars),
        optionalVariables: parseVars(values.optVars),
        isDefault:         values.isDefault,
        isActive:          values.isActive,
      };
      await createMutation.mutateAsync(dto);
    }
    onClose();
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 720 } } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" px={3} py={2} borderBottom="1px solid" borderColor="divider">
        <Box>
          <Typography variant="h6">{isEditing ? 'Edit Template' : 'New Template'}</Typography>
          {isEditing && editData && (
            <Typography variant="caption" color="text.secondary">
              {editData.templateType === 'email' ? 'Email' : 'PDF'} · key: {editData.key}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small"><CloseOutlinedIcon /></IconButton>
      </Box>

      {isEditing && editLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          <Stack spacing={2.5}>
            {!isEditing && (
              <Controller
                name="templateType"
                control={form.control}
                render={({ field }) => (
                  <TextField {...field} select label="Template Type" fullWidth size="small" required>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="pdf">PDF</MenuItem>
                  </TextField>
                )}
              />
            )}

            <Controller
              name="name"
              control={form.control}
              render={({ field }) => (
                <TextField {...field} label="Name" fullWidth size="small" required
                  error={!!form.formState.errors.name}
                  helperText={form.formState.errors.name?.message}
                />
              )}
            />

            <Controller
              name="key"
              control={form.control}
              render={({ field }) => (
                <TextField {...field} label="Key" fullWidth size="small" required disabled={isEditing}
                  error={!!form.formState.errors.key}
                  helperText={form.formState.errors.key?.message ?? (isEditing ? 'Key is immutable after creation' : 'Auto-generated slug — must be unique per template type')}
                />
              )}
            />

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} display="block" mb={0.5}>
                HTML Layout
              </Typography>
              <Alert severity="info" variant="outlined" sx={{ mb: 1, py: 0.5 }}>
                Include <code>{'{{content}}'}</code> where the event body will be injected. Use <code>{'{{theme.*}}'}</code> and <code>{'{{company.*}}'}</code> for branding.
              </Alert>
              <Controller
                name="html"
                control={form.control}
                render={({ field }) => (
                  <TextField {...field} multiline rows={18} fullWidth size="small"
                    error={!!form.formState.errors.html}
                    helperText={form.formState.errors.html?.message}
                    InputProps={{ sx: { fontFamily: 'ui-monospace,"Cascadia Code","Source Code Pro",Menlo,monospace', fontSize: '0.78rem', lineHeight: 1.5 } }}
                  />
                )}
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} display="block" mb={0.5}>
                CSS (optional)
              </Typography>
              <Controller
                name="css"
                control={form.control}
                render={({ field }) => (
                  <TextField {...field} multiline rows={3} fullWidth size="small"
                    placeholder="/* Extra CSS injected alongside the HTML */"
                    InputProps={{ sx: { fontFamily: 'ui-monospace,"Cascadia Code","Source Code Pro",Menlo,monospace', fontSize: '0.78rem' } }}
                  />
                )}
              />
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                name="reqVars"
                control={form.control}
                render={({ field }) => (
                  <TextField {...field} label="Required Variables" fullWidth size="small"
                    placeholder="company.displayName, theme.primaryColor"
                    helperText="Comma-separated; must be present at render time"
                  />
                )}
              />
              <Controller
                name="optVars"
                control={form.control}
                render={({ field }) => (
                  <TextField {...field} label="Optional Variables" fullWidth size="small"
                    placeholder="company.logoFullUrl, company.supportEmail"
                    helperText="Comma-separated; rendered if present"
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={3}>
              <Controller
                name="isDefault"
                control={form.control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value ?? false} onChange={(e) => field.onChange(e.target.checked)} />}
                    label="Set as default"
                  />
                )}
              />
              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value ?? true} onChange={(e) => field.onChange(e.target.checked)} />}
                    label="Active"
                  />
                )}
              />
            </Stack>
          </Stack>
        </Box>
      )}

      <Box px={3} py={2} borderTop="1px solid" borderColor="divider" display="flex" justifyContent="flex-end" gap={1.5}>
        <Button variant="outlined" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isPending || (isEditing && editLoading)}
          startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Template'}
        </Button>
      </Box>
    </Drawer>
  );
}

// ─── PreviewDialog ────────────────────────────────────────────────────────────

interface PreviewDialogProps {
  open: boolean;
  templateId: string | null;
  templateName: string;
  onClose: () => void;
}

function PreviewDialog({ open, templateId, templateName, onClose }: PreviewDialogProps) {
  const previewMutation = usePreviewLayoutHtmlMutation();
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (open && templateId) {
      setHtml(null);
      previewMutation.mutate(templateId, { onSuccess: setHtml });
    }
    if (!open) setHtml(null);
  }, [open, templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Preview — {templateName}</Typography>
        <IconButton onClick={onClose} size="small"><CloseOutlinedIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: '#f0f0f0', minHeight: 560, position: 'relative' }}>
        {previewMutation.isPending && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={560}>
            <CircularProgress />
          </Box>
        )}
        {previewMutation.isError && (
          <Box p={3}>
            <Alert severity="error">
              Preview failed — the template may reference missing company/theme variables or contain invalid HTML.
            </Alert>
          </Box>
        )}
        {html && (
          <iframe
            srcDoc={html}
            title="Template Preview"
            style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
            sandbox="allow-same-origin"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── TemplateSection (table for one type) ────────────────────────────────────

interface TemplateSectionProps {
  type: 'email' | 'pdf';
  templates: LayoutTemplate[];
  canManage: boolean;
  onPreview:      (t: LayoutTemplate) => void;
  onEdit:         (t: LayoutTemplate) => void;
  onDuplicate:    (t: LayoutTemplate) => void;
  onSetDefault:   (t: LayoutTemplate) => void;
  onToggleActive: (t: LayoutTemplate) => void;
  onDelete:       (t: LayoutTemplate) => void;
}

function TemplateSection({ type, templates, canManage, onPreview, onEdit, onDuplicate, onSetDefault, onToggleActive, onDelete }: TemplateSectionProps) {
  const label = type === 'email' ? 'Email Templates' : 'PDF Templates';
  const icon  = type === 'email'
    ? <EmailOutlinedIcon fontSize="small" color="primary" />
    : <PictureAsPdfOutlinedIcon fontSize="small" color="error" />;

  if (templates.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center', py: 5 }}>
          {icon}
          <Typography variant="body2" color="text.secondary" mt={1}>
            No {type} templates yet.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <Box px={2} pt={1.5} pb={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          {icon}
          <Typography variant="subtitle2" fontWeight={600}>{label}</Typography>
          <Chip label={templates.length} size="small" variant="outlined" />
        </Stack>
      </Box>
      <Divider />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name / Key</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight={500}>{t.name}</Typography>
                        {t.isDefault && (
                          <Chip
                            label="Default"
                            size="small"
                            color="primary"
                            icon={<StarOutlinedIcon sx={{ fontSize: '0.8rem !important' }} />}
                            sx={{ height: 18, fontSize: '0.7rem' }}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {t.key}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={t.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={t.isActive ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <RowActions>
                    <Tooltip title="Preview">
                      <IconButton size="small" onClick={() => onPreview(t)}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <PermissionGuard allowed={canManage}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(t)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton size="small" onClick={() => onDuplicate(t)}>
                          <ContentCopyOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!t.isDefault && (
                        <Tooltip title="Set as default">
                          <IconButton size="small" onClick={() => onSetDefault(t)}>
                            <StarBorderOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={t.isActive ? 'Deactivate' : 'Activate'}>
                        <IconButton size="small" onClick={() => onToggleActive(t)}>
                          {t.isActive
                            ? <ToggleOnOutlinedIcon fontSize="small" color="success" />
                            : <ToggleOffOutlinedIcon fontSize="small" color="disabled" />}
                        </IconButton>
                      </Tooltip>
                      {!t.isDefault && (
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => onDelete(t)}>
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </PermissionGuard>
                  </RowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

// ─── TemplateList ─────────────────────────────────────────────────────────────

interface TemplateListProps {
  /** The company whose templates are managed. */
  companyId: string;
}

/**
 * Self-contained layout template management — search, type/status filters,
 * tabbed email/pdf view, create, edit, duplicate, preview, activate/deactivate, delete.
 *
 * Used in:
 *   - /layout-templates  (own-company view)
 *   - /companies/[id]    (modules-admin cross-company view via Templates tab)
 */
export function TemplateList({ companyId }: TemplateListProps) {
  const { canManageTemplates } = usePermissions();
  const list = useListState();

  const { data, isLoading, error } = useLayoutTemplates(companyId, { includeHtml: false });
  const createMutation = useCreateLayoutTemplateMutation();
  const updateMutation = useUpdateLayoutTemplateMutation();
  const deleteMutation = useDeleteLayoutTemplateMutation();

  const templates    = data?.templates ?? [];
  const themes       = data?.themes    ?? [];
  const defaultThemeId = useMemo(
    () => themes.find((t) => t.isDefault)?.themeId ?? themes[0]?.themeId ?? null,
    [themes],
  );

  // ── Active type filter + search filter ────────────────────────────────────
  const statusFilter = list.filters['status'] ?? '';

  const visibleTemplates = useMemo(() => {
    let rows = templates;
    if (list.debouncedSearch.trim()) {
      const q = list.debouncedSearch.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.key.toLowerCase().includes(q),
      );
    }
    if (statusFilter === 'active')   rows = rows.filter((t) =>  t.isActive);
    if (statusFilter === 'inactive') rows = rows.filter((t) => !t.isActive);
    return rows;
  }, [templates, list.debouncedSearch, statusFilter]);

  const emailTemplates = useMemo(() => visibleTemplates.filter((t) => t.templateType === 'email'), [visibleTemplates]);
  const pdfTemplates   = useMemo(() => visibleTemplates.filter((t) => t.templateType === 'pdf'),   [visibleTemplates]);

  // ── Active tab ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'email' | 'pdf'>('email');

  // ── Drawer ─────────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);

  // ── Preview ────────────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewId,   setPreviewId]   = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<LayoutTemplate | null>(null);

  function openCreate()                { setEditId(null); setDrawerOpen(true); }
  function openEdit(t: LayoutTemplate) { setEditId(t.id); setDrawerOpen(true); }
  function openPreview(t: LayoutTemplate) {
    setPreviewId(t.id);
    setPreviewName(t.name);
    setPreviewOpen(true);
  }

  async function handleSetDefault(t: LayoutTemplate) {
    await updateMutation.mutateAsync({ id: t.id, isDefault: true });
  }

  async function handleToggleActive(t: LayoutTemplate) {
    await updateMutation.mutateAsync({ id: t.id, isActive: !t.isActive });
  }

  async function handleDuplicate(t: LayoutTemplate) {
    try {
      const res = await apiClient.get(`/layout-templates/${t.id}`);
      const full: LayoutTemplate = res.data.layout ?? res.data;
      const themeId = defaultThemeId ?? themes[0]?.themeId;
      if (!themeId) return;
      await createMutation.mutateAsync({
        companyThemeId:    themeId,
        templateType:      full.templateType,
        key:               `${full.key}_copy_${Date.now()}`.slice(0, 100),
        name:              `${full.name} (Copy)`,
        html:              full.html ?? '',
        css:               full.css ?? '',
        requiredVariables: full.requiredVariables ?? [],
        optionalVariables: full.optionalVariables ?? [],
        isDefault:         false,
        isActive:          true,
      });
    } catch { /* createMutation shows snack on error */ }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const sectionActions = {
    onPreview:      openPreview,
    onEdit:         openEdit,
    onDuplicate:    handleDuplicate,
    onSetDefault:   handleSetDefault,
    onToggleActive: handleToggleActive,
    onDelete:       (t: LayoutTemplate) => setDeleteTarget(t),
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── Create button + search ──────────────────────────────────────────── */}
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <PermissionGuard allowed={canManageTemplates && Boolean(defaultThemeId)}>
          <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            New Template
          </Button>
        </PermissionGuard>
      </Box>

      <SearchToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search name or key…"
        hasActiveFilters={list.hasActiveFilters}
        onClearFilters={list.clearFilters}
      >
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => list.setFilter('status', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
      </SearchToolbar>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load templates. Make sure NEXT_PUBLIC_COMM_API_KEY is configured.
        </Alert>
      )}

      {/* ── Loading / empty / content ─────────────────────────────────────── */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : templates.length === 0 && !error ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <ArticleOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>No templates yet</Typography>
            <Typography variant="body2" color="text.disabled">
              Templates are provisioned automatically when a company is set up. Run provisioning from the Companies page or create templates manually once a Theme exists.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          <Tabs
            value={tab}
            onChange={(_, v: 'email' | 'pdf') => setTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
          >
            <Tab
              value="email"
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <EmailOutlinedIcon fontSize="small" />
                  <span>Email ({emailTemplates.length})</span>
                </Stack>
              }
            />
            <Tab
              value="pdf"
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PictureAsPdfOutlinedIcon fontSize="small" />
                  <span>PDF ({pdfTemplates.length})</span>
                </Stack>
              }
            />
          </Tabs>

          {tab === 'email' && <TemplateSection type="email" templates={emailTemplates} canManage={canManageTemplates} {...sectionActions} />}
          {tab === 'pdf'   && <TemplateSection type="pdf"   templates={pdfTemplates}   canManage={canManageTemplates} {...sectionActions} />}
        </Stack>
      )}

      {/* ── TemplateDrawer ────────────────────────────────────────────────── */}
      <TemplateDrawer
        open={drawerOpen}
        editId={editId}
        themes={themes}
        defaultThemeId={defaultThemeId}
        onClose={() => setDrawerOpen(false)}
      />

      {/* ── PreviewDialog ─────────────────────────────────────────────────── */}
      <PreviewDialog
        open={previewOpen}
        templateId={previewId}
        templateName={previewName}
        onClose={() => { setPreviewOpen(false); setPreviewId(null); }}
      />

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete template?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            <strong>{deleteTarget?.name}</strong> (<code>{deleteTarget?.key}</code>) will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
