'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DriveFolderUploadOutlinedIcon from '@mui/icons-material/DriveFolderUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import {
  ConfirmDialog,
  EmptyState,
  PermissionGuard,
} from '@/components/shared';
import { useAllCompanyCredentials } from '@/hooks/api/useProviderCredentials';
import { useStorageDomainCatalogues } from '@/hooks/api/useStorageDomainCatalogue';
import { useDomainFiles, type StorageBrowserFile } from '@/hooks/api/useStorageBrowser';
import { useDeleteStorageMutation } from '@/hooks/api/useFiles';
import { useUIStore } from '@/stores/ui.store';
import { usePermissions } from '@/hooks/usePermissions';
import type { ProviderCredentials } from '@/types/api';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif']);

function credentialLabel(c: ProviderCredentials): string {
  return c.displayIdentifier || c.tag;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function isImage(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

interface StorageBrowserProps {
  companyId: string;
}

export function StorageBrowser({ companyId }: StorageBrowserProps) {
  const { canManageDomains } = usePermissions();
  const pushSnack = useUIStore((s) => s.pushSnack);

  const { data: credentialsData, isLoading: credentialsLoading } = useAllCompanyCredentials(companyId, { active: true });
  const storageCredentials = useMemo(
    () => (credentialsData?.items ?? []).filter((c) => c.companyChannelProvider?.channel?.channelKey === 'storage'),
    [credentialsData],
  );
  const [selectedCredentialId, setSelectedCredentialId] = useState('');

  const { data: domainsData, isLoading: domainsLoading } = useStorageDomainCatalogues(
    selectedCredentialId ? companyId : null,
    { providerCredentialsId: selectedCredentialId, active: true, limit: 200 },
  );
  const domains = domainsData?.items ?? [];
  const [selectedDomain, setSelectedDomain] = useState('');

  const { data, isLoading, error } = useDomainFiles(companyId, selectedDomain);
  const files = data?.items ?? [];

  const deleteMutation = useDeleteStorageMutation();
  const [deleteTarget, setDeleteTarget] = useState<StorageBrowserFile | null>(null);

  const handleCredentialChange = useCallback((value: string) => {
    setSelectedCredentialId(value);
    setSelectedDomain('');
  }, []);

  const handleCopyLink = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(
      () => pushSnack({ type: 'success', message: 'Link copied' }),
      () => pushSnack({ type: 'error', message: 'Could not copy link' }),
    );
  }, [pushSnack]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync({ companyId, key: deleteTarget.key });
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation, companyId]);

  if (!credentialsLoading && storageCredentials.length === 0) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <EmptyState
          icon={DriveFolderUploadOutlinedIcon}
          title="No storage credentials configured"
          description="Add a storage credential (S3, Cloudflare R2, …) to browse its files."
          action={
            <PermissionGuard allowed={canManageDomains}>
              <Button variant="contained" href="/provider-credentials">Go to Credentials</Button>
            </PermissionGuard>
          }
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 240 }} disabled={credentialsLoading || storageCredentials.length === 0}>
          <InputLabel>Storage credential</InputLabel>
          <Select
            value={selectedCredentialId}
            label="Storage credential"
            onChange={(e) => handleCredentialChange(e.target.value)}
            renderValue={(value) => {
              const c = storageCredentials.find((x) => x.id === value);
              return c ? credentialLabel(c) : '';
            }}
          >
            {storageCredentials.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                <Box>
                  <Typography variant="body2">{credentialLabel(c)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.companyChannelProvider?.provider?.displayName ?? c.companyChannelProvider?.provider?.providerKey} · {c.tag}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }} disabled={!selectedCredentialId || domainsLoading || domains.length === 0}>
          <InputLabel>Domain</InputLabel>
          <Select value={selectedDomain} label="Domain" onChange={(e) => setSelectedDomain(e.target.value)}>
            {domains.map((d) => (
              <MenuItem key={d.id} value={d.domainKey}>{d.displayName} ({d.domainKey})</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {!selectedCredentialId ? (
        <EmptyState icon={DriveFolderUploadOutlinedIcon} title="Select a storage credential" description="Choose a credential above to see its domains." />
      ) : !selectedDomain ? (
        <EmptyState
          icon={DriveFolderUploadOutlinedIcon}
          title={domains.length === 0 ? 'No domains for this credential' : 'Select a domain'}
          description={domains.length === 0 ? 'Create a storage domain first under Storage Domains.' : 'Choose a domain above to browse its files.'}
        />
      ) : (
        <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(180px, 1fr))" gap={2}>
          {files.map((file) => (
            <Box key={file.key} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {file.url && isImage(file.fileName) ? (
                  <Box component="img" src={file.url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <InsertDriveFileOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                )}
              </Box>
              <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Tooltip title={file.fileName}>
                  <Typography variant="body2" fontWeight={600} noWrap>{file.fileName}</Typography>
                </Tooltip>
                <Box display="flex" alignItems="center" gap={0.75}>
                  <Chip label={file.visibility} size="small" color={file.visibility === 'public' ? 'success' : 'default'} variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                  <Typography variant="caption" color="text.secondary">{formatBytes(file.size)}</Typography>
                </Box>
                {file.lastModified && (
                  <Typography variant="caption" color="text.secondary">{new Date(file.lastModified).toLocaleDateString()}</Typography>
                )}
                <Box display="flex" gap={0.5} mt="auto" pt={0.5}>
                  {file.url && (
                    <>
                      <Tooltip title="Copy link">
                        <IconButton size="small" onClick={() => handleCopyLink(file.url!)}><ContentCopyOutlinedIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Open">
                        <IconButton size="small" component="a" href={file.url} target="_blank" rel="noopener noreferrer"><OpenInNewOutlinedIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </>
                  )}
                  <PermissionGuard allowed={canManageDomains}>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" sx={{ ml: 'auto' }} onClick={() => setDeleteTarget(file)}><DeleteOutlinedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </PermissionGuard>
                </Box>
              </Box>
            </Box>
          ))}

          {!isLoading && !error && files.length === 0 && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <EmptyState icon={DriveFolderUploadOutlinedIcon} title="This domain is empty" description="No files have been uploaded here yet." />
            </Box>
          )}
        </Box>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete file?"
        description={deleteTarget ? `"${deleteTarget.fileName}" will be permanently deleted from storage.` : ''}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
