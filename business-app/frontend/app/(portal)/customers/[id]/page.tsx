'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box          from '@mui/material/Box';
import Button       from '@mui/material/Button';
import Card         from '@mui/material/Card';
import CardContent  from '@mui/material/CardContent';
import Chip         from '@mui/material/Chip';
import Divider      from '@mui/material/Divider';
import IconButton   from '@mui/material/IconButton';
import List         from '@mui/material/List';
import ListItem     from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Skeleton     from '@mui/material/Skeleton';
import Stack        from '@mui/material/Stack';
import Tooltip      from '@mui/material/Tooltip';
import Typography   from '@mui/material/Typography';
import ArrowBackIcon             from '@mui/icons-material/ArrowBack';
import BlockOutlinedIcon         from '@mui/icons-material/BlockOutlined';
import EditOutlinedIcon          from '@mui/icons-material/EditOutlined';
import EmailOutlinedIcon         from '@mui/icons-material/EmailOutlined';
import LocationOnOutlinedIcon    from '@mui/icons-material/LocationOnOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import PeopleOutlinedIcon        from '@mui/icons-material/PeopleOutlined';
import SmsOutlinedIcon           from '@mui/icons-material/SmsOutlined';
import StarIcon                  from '@mui/icons-material/Star';

import { usePurposes } from '@/hooks/api/useCommunicationPurposes';

import { PageHeader }       from '@/components/layout';
import { ConfirmDialog, EmptyState, StatusBadge } from '@/components/shared';
import {
  useCustomer,
  useDeactivateCustomerMutation,
} from '@/hooks/api/useCustomers';
import type { CustomerContact } from '@/types/customer';
import { contactDisplayName } from '@/types/customer';

// ─── Layout helpers ────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={1} py={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box flex={1}>
        {value ?? <Typography variant="body2" color="text.disabled">—</Typography>}
      </Box>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: customer, isLoading } = useCustomer(id);
  const { data: purposesData } = usePurposes({ limit: 200 });
  const allPurposes = purposesData?.data ?? [];

  const deactivateMutation = useDeactivateCustomerMutation();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const handleDeactivate = async () => {
    await deactivateMutation.mutateAsync(id);
    setConfirmDeactivate(false);
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 2 }} />
      </Box>
    );
  }

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        description="This customer may have been removed."
        action={<Button onClick={() => router.push('/customers')}>Back to Customers</Button>}
      />
    );
  }

  // Contacts from the main response — already includes the synthesized primary
  const contacts: CustomerContact[] = customer.contacts ?? [];
  const primaryContact = contacts.find((c) => c.isPrimary);

  return (
    <Box>
      <PageHeader
        title={customer.displayName}
        subtitle={customer.type === 'company' ? 'Company' : 'Individual'}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push('/customers')}>
              Back
            </Button>
            <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => router.push(`/customers/${id}/edit`)}>
              Edit
            </Button>
            {customer.isActive && (
              <Button variant="outlined" color="error" startIcon={<BlockOutlinedIcon />} onClick={() => setConfirmDeactivate(true)}>
                Deactivate
              </Button>
            )}
          </Stack>
        }
      />

      {/* ── Details ──────────────────────────────────────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Details</Typography>
          <Divider sx={{ mb: 2 }} />

          <DetailRow label="Status"  value={<StatusBadge active={customer.isActive} />} />
          <DetailRow label="Type"    value={<Chip label={customer.type === 'company' ? 'Company' : 'Individual'} size="small" variant="outlined" />} />
          <DetailRow label="ABN"     value={customer.abn} />
          {customer.notes && (
            <DetailRow label="Notes" value={<Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{customer.notes}</Typography>} />
          )}
          <DetailRow label="Created" value={
            <Typography variant="body2">{new Date(customer.createdAt).toLocaleDateString('en-AU', { dateStyle: 'medium' })}</Typography>
          } />
        </CardContent>
      </Card>

      {/* ── Contacts ─────────────────────────────────────────────────────── */}
      {/* contacts[] from the API already includes the primary contact (synthesized if needed) */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <PeopleOutlinedIcon fontSize="small" color="action" />
              <Typography variant="subtitle2">
                Contacts ({contacts.length})
              </Typography>
            </Box>
            <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => router.push(`/customers/${id}/edit`)}>
              Edit
            </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />

          {contacts.length === 0 ? (
            <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
              No contacts recorded.
            </Typography>
          ) : (
            <List disablePadding>
              {contacts.map((c, i) => (
                <React.Fragment key={c.id}>
                  {i > 0 && <Divider component="li" />}
                  <ListItem disableGutters>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={0.75}>
                          <Typography variant="body2">{contactDisplayName(c)}</Typography>
                          {c.isPrimary && (
                            <Chip
                              icon={<StarIcon sx={{ fontSize: '0.75rem !important' }} />}
                              label="Primary"
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
                            />
                          )}
                          {c.role && (
                            <Typography variant="caption" color="text.secondary">— {c.role}</Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        (() => {
                          const locationTag = c.locationId
                            ? (customer.locations ?? []).find((l) => l.id === c.locationId)?.tag
                            : null;
                          return [c.email, c.phone, locationTag].filter(Boolean).join(' · ') || undefined;
                        })()
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* ── Communication Purposes ──────────────────────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <NotificationsOutlinedIcon fontSize="small" color="action" />
              <Typography variant="subtitle2">
                Communication Purposes ({(customer.communicationPurposes ?? []).length})
              </Typography>
            </Box>
            <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => router.push(`/customers/${id}/edit`)}>
              Edit
            </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />

          {(customer.communicationPurposes ?? []).length === 0 ? (
            <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
              No Communication Purposes configured.
            </Typography>
          ) : (
            <List disablePadding>
              {(customer.communicationPurposes ?? []).map((p, i) => {
                const purpose = allPurposes.find((ap) => ap.id === p.communicationDomainId);
                const name    = purpose?.displayName ?? p.communicationDomainId;
                const key     = purpose?.domainKey   ?? '';
                const hasEmail = p.channels.some((ch) => ch.channel === 'email');
                const hasSms   = p.channels.some((ch) => ch.channel === 'sms');
                const emailCount = p.channels.find((ch) => ch.channel === 'email')?.recipients.length ?? 0;
                const smsCount   = p.channels.find((ch) => ch.channel === 'sms')?.recipients.length  ?? 0;
                return (
                  <React.Fragment key={`${p.communicationDomainId}-${i}`}>
                    {i > 0 && <Divider component="li" />}
                    <ListItem disableGutters>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="body2" fontWeight={500}>{name}</Typography>
                            {key && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {key}
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={
                          <Box display="inline-flex" gap={0.5} mt={0.5}>
                            {hasEmail && (
                              <Chip
                                icon={<EmailOutlinedIcon />}
                                label={`Email (${emailCount})`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {hasSms && (
                              <Chip
                                icon={<SmsOutlinedIcon />}
                                label={`SMS (${smsCount})`}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* ── Locations ────────────────────────────────────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <LocationOnOutlinedIcon fontSize="small" color="action" />
              <Typography variant="subtitle2">
                Locations ({(customer.locations ?? []).length})
              </Typography>
            </Box>
            <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => router.push(`/customers/${id}/edit`)}>
              Edit
            </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />

          {(customer.locations ?? []).length === 0 ? (
            <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
              No locations recorded.
            </Typography>
          ) : (
            <List disablePadding>
              {(customer.locations ?? []).map((loc, i) => (
                <React.Fragment key={`${loc.id}-${i}`}>
                  {i > 0 && <Divider component="li" />}
                  <ListItem disableGutters>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={0.75}>
                          <Typography variant="body2" fontWeight={500}>{loc.tag}</Typography>
                        </Box>
                      }
                      secondary={[loc.line1, loc.line2, loc.city, loc.state, loc.postalCode, loc.country]
                        .filter(Boolean).join(', ')}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate customer?"
        description={`"${customer.displayName}" will be marked inactive.`}
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
        loading={deactivateMutation.isPending}
        danger
      />
    </Box>
  );
}
