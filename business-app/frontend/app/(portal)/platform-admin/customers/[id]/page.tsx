'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';

import { PageHeader } from '@/components/layout';
import { StatusBadge } from '@/components/shared';
import { usePlatformAdminCustomer } from '@/hooks/api/usePlatformAdminCustomers';
import { formatDataQualityIssue } from '@/types/platform-admin-customer';
import type {
  BiCustomerDetailResponse,
  BiCustomerLocationDetail,
  BiCustomerContactDetail,
  BiCustomerPurposeDetail,
} from '@/types/platform-admin-customer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box mb={1.5}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        title={title}
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
        sx={{ pb: 0 }}
      />
      <Divider />
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Section: Overview ────────────────────────────────────────────────────────

function OverviewSection({ customer }: { customer: BiCustomerDetailResponse }) {
  return (
    <SectionCard title="Overview">
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Field label="Customer Name" value={customer.customerName} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field
            label="Business"
            value={customer.businessName ?? (
              <Typography variant="body2" color="text.disabled">—</Typography>
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field
            label="Type"
            value={
              <Chip
                label={customer.customerType === 'company' ? 'Company' : 'Individual'}
                size="small"
                variant="outlined"
                color={customer.customerType === 'company' ? 'primary' : 'default'}
              />
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field label="ABN" value={customer.abn ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field label="Status" value={<StatusBadge active={customer.isActive} />} />
        </Grid>
        {customer.notes && (
          <Grid item xs={12}>
            <Field label="Notes" value={customer.notes} />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={4}>
          <Field label="Source Created" value={fmtDate(customer.sourceCreatedAt)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field label="Source Updated" value={fmtDate(customer.sourceUpdatedAt)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field label="BI Synced" value={fmtDate(customer.syncedAt)} />
        </Grid>
      </Grid>
    </SectionCard>
  );
}

// ─── Section: Locations ───────────────────────────────────────────────────────

function LocationsSection({ locations }: { locations: BiCustomerLocationDetail[] }) {
  if (locations.length === 0) {
    return (
      <SectionCard title="Locations">
        <Typography variant="body2" color="text.secondary">No locations configured.</Typography>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Locations">
      {locations.map((loc, i) => (
        <Box key={i} mb={i < locations.length - 1 ? 2 : 0}>
          {i > 0 && <Divider sx={{ mb: 2 }} />}
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <LocationOnOutlinedIcon fontSize="small" color="action" />
            <Typography variant="subtitle2">{loc.tag ?? `Location ${i + 1}`}</Typography>
            {!loc.isValidAddress && (
              <Chip label="Invalid address" size="small" color="warning" />
            )}
          </Box>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Full Address" value={loc.fullAddress ?? '—'} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Field label="Country" value={loc.country ?? '—'} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Field label="City" value={loc.city ?? '—'} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Field label="Postcode" value={loc.postcode ?? '—'} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Field label="State" value={loc.state ?? '—'} />
            </Grid>
          </Grid>
        </Box>
      ))}
    </SectionCard>
  );
}

// ─── Section: Contacts ────────────────────────────────────────────────────────

function ContactsSection({ contacts }: { contacts: BiCustomerContactDetail[] }) {
  if (contacts.length === 0) {
    return (
      <SectionCard title="Contacts">
        <Typography variant="body2" color="text.secondary">No contacts configured.</Typography>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Contacts">
      {contacts.map((con, i) => (
        <Box key={i} mb={i < contacts.length - 1 ? 2 : 0}>
          {i > 0 && <Divider sx={{ mb: 2 }} />}
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <PersonOutlinedIcon fontSize="small" color="action" />
            <Typography variant="subtitle2">{con.contactName ?? `Contact ${i + 1}`}</Typography>
            {con.isPrimary && <Chip label="Primary" size="small" color="primary" />}
          </Box>
          <Grid container spacing={1}>
            {con.roleOrPosition && (
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Role / Position" value={con.roleOrPosition} />
              </Grid>
            )}
            {con.email && (
              <Grid item xs={12} sm={6} md={3}>
                <Field
                  label="Email"
                  value={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <EmailOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2">{con.email}</Typography>
                    </Box>
                  }
                />
              </Grid>
            )}
            {con.phone && (
              <Grid item xs={12} sm={6} md={3}>
                <Field
                  label="Phone"
                  value={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <PhoneOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2">{con.phone}</Typography>
                    </Box>
                  }
                />
              </Grid>
            )}
            {con.locationTag && (
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Location" value={con.locationTag} />
              </Grid>
            )}
          </Grid>
        </Box>
      ))}
    </SectionCard>
  );
}

// ─── Section: Communication Purposes ─────────────────────────────────────────

function PurposesSection({ purposes }: { purposes: BiCustomerPurposeDetail[] }) {
  if (purposes.length === 0) {
    return (
      <SectionCard title="Communication Purposes">
        <Typography variant="body2" color="text.secondary">No communication purposes configured.</Typography>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Communication Purposes">
      {purposes.map((p, i) => {
        const shortId = p.communicationDomainId.slice(-8);
        return (
          <Box key={i} mb={i < purposes.length - 1 ? 2 : 0}>
            {i > 0 && <Divider sx={{ mb: 2 }} />}
            <Typography variant="subtitle2" mb={1}>
              Communication Purpose <Typography component="span" variant="caption" color="text.secondary">{shortId}</Typography>
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6} sm={3}>
                <Field label="Configured Channels" value={p.configuredChannelCount} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Field label="Email Recipients" value={p.emailRecipientCount} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Field label="SMS Recipients" value={p.smsRecipientCount} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Field
                  label="Channels"
                  value={
                    <Box display="flex" gap={0.5}>
                      {p.hasEmailChannel && <Chip label="Email" size="small" />}
                      {p.hasSmsChannel && <Chip label="SMS" size="small" />}
                    </Box>
                  }
                />
              </Grid>
            </Grid>

            {p.recipients.length > 0 && (
              <Box mt={1.5}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Recipients
                </Typography>
                {p.recipients.map((r, ri) => (
                  <Box
                    key={ri}
                    display="flex"
                    alignItems="center"
                    gap={1}
                    py={0.5}
                    borderBottom={ri < p.recipients.length - 1 ? '1px solid' : 'none'}
                    borderColor="divider"
                  >
                    <Chip label={r.channel.toUpperCase()} size="small" variant="outlined" sx={{ minWidth: 50 }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {r.destination ?? '—'}
                    </Typography>
                    {r.recipientType && (
                      <Chip label={r.recipientType} size="small" variant="outlined" />
                    )}
                    {r.isValidDestination ? (
                      <CheckCircleOutlineIcon fontSize="small" color="success" />
                    ) : (
                      <Tooltip title="Invalid destination">
                        <ErrorOutlineIcon fontSize="small" color="error" />
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </SectionCard>
  );
}

// ─── Section: Data Quality ────────────────────────────────────────────────────

function DataQualitySection({ customer }: { customer: BiCustomerDetailResponse }) {
  if (customer.dataQualityIssueCount === 0) {
    return (
      <SectionCard title="Data Quality">
        <Box display="flex" alignItems="center" gap={1}>
          <CheckCircleOutlineIcon color="success" />
          <Typography variant="body2" color="success.main">No data quality issues detected.</Typography>
        </Box>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Data Quality">
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <WarningAmberOutlinedIcon color="warning" />
        <Typography variant="body2" color="warning.main">
          {customer.dataQualityIssueCount} issue{customer.dataQualityIssueCount !== 1 ? 's' : ''} detected
        </Typography>
      </Box>
      {customer.dataQualityIssues.map((code, i) => (
        <Box key={i} display="flex" alignItems="center" gap={1} mb={0.5}>
          <ErrorOutlineIcon fontSize="small" color="warning" />
          <Typography variant="body2">{formatDataQualityIssue(code)}</Typography>
        </Box>
      ))}
    </SectionCard>
  );
}

// ─── Section: Sync Information ────────────────────────────────────────────────

function SyncSection({ customer }: { customer: BiCustomerDetailResponse }) {
  return (
    <SectionCard title="Sync Information">
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Field label="Source Created" value={fmtDate(customer.sourceCreatedAt)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field label="Source Updated" value={fmtDate(customer.sourceUpdatedAt)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field label="BI Synced" value={fmtDate(customer.syncedAt)} />
        </Grid>
      </Grid>
    </SectionCard>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <Box>
      <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 1 }} />
      {[1, 2, 3].map((i) => (
        <Card key={i} variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Skeleton variant="text" width="30%" height={28} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={80} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformAdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('businessId') ?? undefined;
  const customerId = params.id;

  const { data: customer, isLoading, error } = usePlatformAdminCustomer(customerId, {
    businessId,
  });

  if (isLoading) {
    return (
      <Box>
        <PageHeader
          title="Customer Detail"
          breadcrumbs={[
            { label: 'Platform Admin' },
            { label: 'Customers', href: '/platform-admin/customers' },
            { label: 'Loading…' },
          ]}
        />
        <DetailSkeleton />
      </Box>
    );
  }

  if (error || !customer) {
    return (
      <Box>
        <PageHeader
          title="Customer Not Found"
          breadcrumbs={[
            { label: 'Platform Admin' },
            { label: 'Customers', href: '/platform-admin/customers' },
          ]}
        />
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} py={2}>
              <ErrorOutlineIcon color="error" fontSize="large" />
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Customer could not be loaded
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {error
                    ? 'The Business Intelligence service is temporarily unavailable. Please try again later.'
                    : `Customer '${customerId}' was not found.`}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={customer.customerName}
        breadcrumbs={[
          { label: 'Platform Admin' },
          { label: 'Customers', href: '/platform-admin/customers' },
          { label: customer.customerName },
        ]}
        subtitle={customer.businessName ? `Business: ${customer.businessName}` : undefined}
      />

      <OverviewSection customer={customer} />
      <LocationsSection locations={customer.locations} />
      <ContactsSection contacts={customer.contacts} />
      <PurposesSection purposes={customer.purposes} />
      <DataQualitySection customer={customer} />
      <SyncSection customer={customer} />
    </Box>
  );
}
