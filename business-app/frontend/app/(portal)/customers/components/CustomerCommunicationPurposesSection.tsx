'use client';

import React, { useState } from 'react';
import Box         from '@mui/material/Box';
import Button      from '@mui/material/Button';
import Chip        from '@mui/material/Chip';
import Divider     from '@mui/material/Divider';
import IconButton  from '@mui/material/IconButton';
import Paper       from '@mui/material/Paper';
import Tooltip     from '@mui/material/Tooltip';
import Typography  from '@mui/material/Typography';
import AddIcon         from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon  from '@mui/icons-material/EditOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SmsOutlinedIcon   from '@mui/icons-material/SmsOutlined';

import { ConfirmDialog } from '@/components/shared';
import { usePurposes }   from '@/hooks/api/useCommunicationPurposes';
import type { CommPurposeFormEntry } from '@/types/customer';
import type { ContactFormRow } from './CustomerContactsFieldArray';
import { PurposeConfigDrawer, type ContactOption } from './PurposeConfigDrawer';
import { buildEmailSuggestions, buildSmsSuggestions } from './purposeAutocomplete.utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomerCommunicationPurposesSectionProps {
  value:    CommPurposeFormEntry[];
  onChange: (next: CommPurposeFormEntry[]) => void;
  contacts: ContactFormRow[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerCommunicationPurposesSection({
  value,
  onChange,
  contacts,
}: CustomerCommunicationPurposesSectionProps) {
  const { data: purposesData } = usePurposes({ limit: 200 });
  const allPurposes = purposesData?.data ?? [];

  // Resolve purpose display name from its domain ID
  function purposeName(domainId: string): string {
    return allPurposes.find((p) => p.id === domainId)?.displayName ?? domainId;
  }

  function purposeKey(domainId: string): string {
    return allPurposes.find((p) => p.id === domainId)?.domainKey ?? '';
  }

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [editingIndex,  setEditingIndex]  = useState<number | null>(null);

  // ── Confirm delete state ──────────────────────────────────────────────────
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  function openAdd() {
    setEditingIndex(null);
    setDrawerOpen(true);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingIndex(null);
  }

  function handleSave(entry: CommPurposeFormEntry) {
    if (editingIndex !== null) {
      // Replace existing entry
      const next = [...value];
      next[editingIndex] = entry;
      onChange(next);
    } else {
      onChange([...value, entry]);
    }
  }

  function handleDelete() {
    if (confirmDeleteIndex === null) return;
    onChange(value.filter((_, i) => i !== confirmDeleteIndex));
    setConfirmDeleteIndex(null);
  }

  const usedDomainIds = value.map((e) => e.communicationDomainId);
  const editingEntry  = editingIndex !== null ? value[editingIndex] : null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={0.5}>
        <Box>
          <Typography variant="subtitle2">Communication Purposes</Typography>
          <Typography variant="caption" color="text.secondary">
            Define where communications are sent for each configured purpose.
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={openAdd}
          sx={{ ml: 1, flexShrink: 0, mt: 0.25 }}
        >
          Add Purpose
        </Button>
      </Box>

      {/* ── Table / Empty ────────────────────────────────────────────── */}
      {value.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
          No Communication Purposes configured yet.
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ mt: 1 }}>
          {value.map((entry, index) => {
            const emailCh = entry.emailRecipients.length > 0;
            const smsCh   = entry.smsRecipients.length   > 0;

            return (
              <React.Fragment key={`${entry.communicationDomainId}-${index}`}>
                {index > 0 && <Divider />}
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  px={1.5}
                  py={1.25}
                >
                  {/* Purpose name + channels */}
                  <Box minWidth={0} flex={1}>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {purposeName(entry.communicationDomainId)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace', mr: 1 }}
                    >
                      {purposeKey(entry.communicationDomainId)}
                    </Typography>
                    <Box display="inline-flex" gap={0.5} mt={0.25}>
                      {emailCh && (
                        <Chip
                          icon={<EmailOutlinedIcon />}
                          label={`Email (${entry.emailRecipients.length})`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      {smsCh && (
                        <Chip
                          icon={<SmsOutlinedIcon />}
                          label={`SMS (${entry.smsRecipients.length})`}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box display="flex" gap={0.5} ml={1} flexShrink={0}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(index)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setConfirmDeleteIndex(index)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </React.Fragment>
            );
          })}
        </Paper>
      )}

      {/* ── Config drawer ────────────────────────────────────────────── */}
      <PurposeConfigDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onSave={handleSave}
        entry={editingEntry}
        usedDomainIds={
          editingIndex !== null
            ? usedDomainIds.filter((_, i) => i !== editingIndex)
            : usedDomainIds
        }
        emailSuggestions={buildEmailSuggestions(contacts)}
        smsSuggestions={buildSmsSuggestions(contacts)}
      />

      {/* ── Delete confirmation ──────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDeleteIndex !== null}
        title="Remove Communication Purpose?"
        description={
          confirmDeleteIndex !== null
            ? `"${purposeName(value[confirmDeleteIndex]?.communicationDomainId ?? '')}" and all its recipient configuration will be removed from this customer. The Communication Purpose itself will not be affected.`
            : undefined
        }
        confirmLabel="Remove"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteIndex(null)}
      />
    </Box>
  );
}
