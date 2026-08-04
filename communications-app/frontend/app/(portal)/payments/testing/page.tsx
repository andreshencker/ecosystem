'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { PageHeader } from '@/components/layout';
import { EmptyState, ErrorState, FormDrawer } from '@/components/shared';
import { PaymentsFilter } from '@/components/domain/payment/PaymentsFilter';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import {
  usePaymentsContext,
  connectionLabel,
} from '@/providers/PaymentsProvider';
import {
  usePaymentMethodConfigurations,
  usePaymentTestScenarios,
  usePaymentUnits,
  usePaymentTestingPageDefinition,
  useCreatePaymentTestMutation,
} from '@/hooks/api/usePayments';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';
import { formatAmountMinor } from '@/lib/formatBalance';
import type {
  PaymentTestResult,
  PaymentTestScenario,
  PaymentTestStatus,
  PaymentTestingFieldDefinition,
  PaymentTestingPageDefinition,
} from '@/types/payments';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCENARIO_LABELS: Record<PaymentTestScenario, string> = {
  success: 'Success',
  card_declined: 'Card Declined',
  insufficient_funds: 'Insufficient Funds',
  authentication_required: 'Authentication Required',
  processing_error: 'Processing Error',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayToMinor(display: number, currency: string): number {
  try {
    const fmt = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
    const fractionDigits = fmt.resolvedOptions().minimumFractionDigits ?? 2;
    return Math.round(display * Math.pow(10, fractionDigits));
  } catch {
    return Math.round(display * 100);
  }
}

function formatDate(iso: string | Date): string {
  return new Date(iso as string).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ─── Status badge ──────────────────────────────────────────────────────────────

type StatusColor = 'success' | 'error' | 'warning' | 'info' | 'default';

function statusColor(status: PaymentTestStatus): StatusColor {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'error';
    case 'requires_action':
      return 'warning';
    case 'processing':
      return 'info';
    case 'cancelled':
      return 'default';
  }
}

function StatusIcon({ status }: { status: PaymentTestStatus }) {
  switch (status) {
    case 'succeeded':
      return <CheckCircleOutlineOutlinedIcon fontSize="inherit" />;
    case 'failed':
      return <ErrorOutlineOutlinedIcon fontSize="inherit" />;
    case 'requires_action':
      return <WarningAmberOutlinedIcon fontSize="inherit" />;
    case 'processing':
      return <HourglassEmptyOutlinedIcon fontSize="inherit" />;
    case 'cancelled':
      return <ErrorOutlineOutlinedIcon fontSize="inherit" />;
  }
}

function statusLabel(status: PaymentTestStatus): string {
  switch (status) {
    case 'succeeded':
      return 'Succeeded';
    case 'failed':
      return 'Failed';
    case 'requires_action':
      return 'Requires Action';
    case 'processing':
      return 'Processing';
    case 'cancelled':
      return 'Cancelled';
  }
}

// ─── Result drawer ─────────────────────────────────────────────────────────────

function ResultDrawer({
  result,
  onClose,
}: {
  result: PaymentTestResult | null;
  onClose: () => void;
}) {
  if (!result) return null;

  return (
    <FormDrawer
      open={Boolean(result)}
      onClose={onClose}
      title="Payment Test Result"
      actions={
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      }
    >
      <Stack spacing={3}>
        {/* Status */}
        <Box display="flex" alignItems="center" gap={1.5}>
          <Chip
            icon={<StatusIcon status={result.status} />}
            label={statusLabel(result.status)}
            color={statusColor(result.status)}
            size="medium"
          />
          {result.requiresUserAction && (
            <Typography variant="caption" color="warning.main">
              User action required
            </Typography>
          )}
        </Box>

        {/* IDs */}
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mb={0.5}
          >
            Test ID
          </Typography>
          <Typography variant="body2" fontFamily="monospace">
            {result.testId}
          </Typography>
        </Box>

        {result.providerPaymentId && (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Provider Payment ID
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {result.providerPaymentId}
            </Typography>
          </Box>
        )}

        <Divider />

        {/* Payment details */}
        <Stack spacing={1.5}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Amount
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatAmountMinor(result.amountMinor, result.currency)}
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Currency
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {result.currency.toUpperCase()}
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Payment Method
            </Typography>
            <Typography variant="body2">{result.paymentMethod}</Typography>
          </Box>

          {result.scenario && (
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Scenario
              </Typography>
              <Typography variant="body2">
                {SCENARIO_LABELS[result.scenario] ?? result.scenario}
              </Typography>
            </Box>
          )}

          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Environment
            </Typography>
            <Chip
              label={result.environment}
              size="small"
              color={result.environment === 'test' ? 'warning' : 'error'}
            />
          </Box>

          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Provider
            </Typography>
            <Typography variant="body2">{result.providerKey}</Typography>
          </Box>
        </Stack>

        {/* Redirect payment URL — for CoinGate and redirect-flow providers */}
        {result.paymentUrl && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Complete Payment
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Open the sandbox payment page to simulate the crypto payment flow.
              </Typography>
              <Button
                variant="contained"
                href={result.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
                startIcon={<OpenInNewOutlinedIcon />}
              >
                Open Payment Page
              </Button>
            </Box>
          </>
        )}

        {/* Failure details */}
        {(result.failureCode ?? result.failureMessage) && (
          <>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="error.main">
                Failure Details
              </Typography>
              {result.failureCode && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Code
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {result.failureCode}
                  </Typography>
                </Box>
              )}
              {result.failureMessage && (
                <Typography variant="body2" color="error.main">
                  {result.failureMessage}
                </Typography>
              )}
            </Stack>
          </>
        )}

        <Divider />

        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mb={0.5}
          >
            Tested at
          </Typography>
          <Typography variant="body2">{formatDate(result.createdAt)}</Typography>
        </Box>
      </Stack>
    </FormDrawer>
  );
}

// ─── Session history ──────────────────────────────────────────────────────────

function SessionHistory({
  history,
  onView,
}: {
  history: PaymentTestResult[];
  onView: (result: PaymentTestResult) => void;
}) {
  if (history.length === 0) return null;

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Recent tests in this session
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
        This list clears when you refresh the page.
      </Typography>
      <Stack spacing={1}>
        {[...history].reverse().map((r) => (
          <Card
            key={r.testId}
            variant="outlined"
            sx={{ borderRadius: 1.5, cursor: 'pointer' }}
            onClick={() => onView(r)}
          >
            <CardContent
              sx={{
                py: 1.5,
                px: 2,
                '&:last-child': { pb: 1.5 },
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box minWidth={0}>
                <Typography variant="body2" fontFamily="monospace" noWrap>
                  {r.testId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.scenario ? (SCENARIO_LABELS[r.scenario] ?? r.scenario) : 'sandbox test'}
                  {' · '}
                  {formatAmountMinor(r.amountMinor, r.currency)}
                  {' · '}
                  {formatDate(r.createdAt)}
                </Typography>
              </Box>
              <Chip
                label={statusLabel(r.status)}
                color={statusColor(r.status)}
                size="small"
                sx={{ flexShrink: 0 }}
              />
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Definition-driven form field renderer ────────────────────────────────────

interface FieldRendererProps {
  field: PaymentTestingFieldDefinition;
  connectionId: string;
  formValues: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  // For scenario type, we need the selected paymentMethodKey
  selectedMethodKey?: string;
}

function FieldRenderer({
  field,
  connectionId,
  formValues,
  onValueChange,
  selectedMethodKey,
}: FieldRendererProps) {
  const value = formValues[field.key] ?? '';

  // Scenario field — loads options from usePaymentTestScenarios
  if (field.type === 'scenario') {
    return (
      <ScenarioField
        fieldDef={field}
        connectionId={connectionId}
        value={value}
        methodKey={selectedMethodKey}
        onChange={(v) => onValueChange(field.key, v)}
      />
    );
  }

  // Payment unit / currency field — loads options from usePaymentUnits
  if (field.type === 'payment_unit' && field.optionsSource === 'payment_units') {
    return (
      <PaymentUnitField
        fieldDef={field}
        connectionId={connectionId}
        value={value}
        onChange={(v) => onValueChange(field.key, v)}
      />
    );
  }

  // Provider select (payment methods)
  if (field.type === 'select' && field.optionsSource === 'provider') {
    return (
      <PaymentMethodField
        fieldDef={field}
        connectionId={connectionId}
        value={value}
        onChange={(v) => onValueChange(field.key, v)}
      />
    );
  }

  // Amount field
  if (field.type === 'amount') {
    return (
      <TextField
        label={field.label}
        size="small"
        type="number"
        fullWidth
        value={value || String(field.defaultValue ?? '')}
        onChange={(e) => onValueChange(field.key, e.target.value)}
        inputProps={{ min: '0.01', step: '0.01' }}
        placeholder={field.placeholder}
        helperText={field.helpText}
        required={field.required}
      />
    );
  }

  // Text / email fields
  return (
    <TextField
      label={field.label}
      size="small"
      fullWidth
      type={field.type === 'email' ? 'email' : 'text'}
      value={value}
      onChange={(e) => onValueChange(field.key, e.target.value)}
      placeholder={field.placeholder}
      helperText={field.helpText}
      required={field.required}
    />
  );
}

// Sub-components for complex field types

function ScenarioField({
  fieldDef,
  connectionId,
  value,
  methodKey,
  onChange,
}: {
  fieldDef: PaymentTestingFieldDefinition;
  connectionId: string;
  value: string;
  methodKey?: string;
  onChange: (v: string) => void;
}) {
  const { data: scenarios, isLoading } = usePaymentTestScenarios(
    connectionId,
    methodKey || null,
  );

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1} py={1}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Loading scenarios…
        </Typography>
      </Box>
    );
  }

  return (
    <FormControl fullWidth size="small" required={fieldDef.required}>
      <InputLabel id={`${fieldDef.key}-label`}>{fieldDef.label}</InputLabel>
      <Select
        labelId={`${fieldDef.key}-label`}
        label={fieldDef.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!scenarios?.length}
      >
        {(scenarios ?? []).map((s) => (
          <MenuItem key={s} value={s}>
            {SCENARIO_LABELS[s as PaymentTestScenario] ?? s}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function PaymentUnitField({
  fieldDef,
  connectionId,
  value,
  onChange,
}: {
  fieldDef: PaymentTestingFieldDefinition;
  connectionId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: unitsData, isLoading } = usePaymentUnits(connectionId);
  const units = unitsData?.data ?? [];

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1} py={1}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Loading currencies…
        </Typography>
      </Box>
    );
  }

  return (
    <FormControl fullWidth size="small" required={fieldDef.required}>
      <InputLabel id={`${fieldDef.key}-label`}>{fieldDef.label}</InputLabel>
      <Select
        labelId={`${fieldDef.key}-label`}
        label={fieldDef.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty={Boolean(fieldDef.placeholder)}
      >
        {units.map((u) => (
          <MenuItem key={u.code} value={u.code}>
            {u.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function PaymentMethodField({
  fieldDef,
  connectionId,
  value,
  onChange,
}: {
  fieldDef: PaymentTestingFieldDefinition;
  connectionId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: methodsData, isLoading } = usePaymentMethodConfigurations(connectionId);
  const enabledMethods = methodsData?.data.filter((m) => m.enabled) ?? [];

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1} py={1}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Loading methods…
        </Typography>
      </Box>
    );
  }

  if (enabledMethods.length === 0) {
    return (
      <Box py={1}>
        <Typography variant="caption" color="text.secondary">
          No enabled payment methods for this connection.
        </Typography>
      </Box>
    );
  }

  return (
    <FormControl fullWidth size="small" required={fieldDef.required}>
      <InputLabel id={`${fieldDef.key}-label`}>{fieldDef.label}</InputLabel>
      <Select
        labelId={`${fieldDef.key}-label`}
        label={fieldDef.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {enabledMethods.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            {m.displayName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// ─── Definition-driven test form ──────────────────────────────────────────────

function DefinitionDrivenForm({
  definition,
  connectionId,
  onSubmit,
  isPending,
}: {
  definition: PaymentTestingPageDefinition;
  connectionId: string;
  onSubmit: (formValues: Record<string, string>) => void;
  isPending: boolean;
}) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    // Pre-populate default values from the definition
    const defaults: Record<string, string> = {};
    for (const field of definition.form.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = String(field.defaultValue);
      }
    }
    return defaults;
  });

  const handleValueChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Check if all required fields are filled
  const allRequiredFilled = definition.form.fields
    .filter((f) => f.required)
    .every((f) => {
      const v = formValues[f.key];
      return v !== undefined && v.trim() !== '';
    });

  const canSubmit =
    allRequiredFilled &&
    !isPending &&
    definition.environment === 'test';

  // The paymentMethodKey field value — needed for scenario options
  const selectedMethodKey = formValues['paymentMethodKey'];

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2.5}>
          <Typography variant="subtitle2">
            {definition.form.title}
          </Typography>

          {definition.form.description && (
            <Typography variant="body2" color="text.secondary">
              {definition.form.description}
            </Typography>
          )}

          {definition.instructions && definition.instructions.length > 0 && (
            <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
              <Stack spacing={0.5}>
                {definition.instructions.map((inst, i) => (
                  <Typography key={i} variant="caption" display="block">
                    {inst}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          )}

          {definition.form.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              connectionId={connectionId}
              formValues={formValues}
              onValueChange={handleValueChange}
              selectedMethodKey={selectedMethodKey}
            />
          ))}

          {definition.limitations && definition.limitations.length > 0 && (
            <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
              <Stack spacing={0.5}>
                {definition.limitations.map((lim, i) => (
                  <Typography key={i} variant="caption" display="block">
                    {lim}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={() => onSubmit(formValues)}
            disabled={!canSubmit}
            startIcon={
              isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <ScienceOutlinedIcon />
              )
            }
            sx={{ alignSelf: 'flex-start' }}
          >
            {isPending ? 'Running…' : definition.form.submitLabel}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsTestingPage() {
  const {
    connections,
    connectionsLoading,
    connectionsError,
    resolvedConnectionId,
    selectedConnection,
    resolvedProviderKey,
    selectedProvider,
    getCapabilityStatus,
  } = usePaymentsContext();

  const capabilityStatus = getCapabilityStatus(PAGE_CAPABILITY.paymentTesting);
  const capabilityBlocks =
    Boolean(resolvedProviderKey) &&
    Boolean(capabilityStatus) &&
    capabilityStatus !== 'available';

  // ── Session history + result drawer ───────────────────────────────────────
  const [sessionHistory, setSessionHistory] = useState<PaymentTestResult[]>([]);
  const [viewingResult, setViewingResult] = useState<PaymentTestResult | null>(
    null,
  );

  // ── Clear session history when connection changes ─────────────────────────
  useEffect(() => {
    setSessionHistory([]);
  }, [resolvedConnectionId]);

  // ── Data queries ──────────────────────────────────────────────────────────
  const {
    data: definition,
    isLoading: definitionLoading,
    isError: definitionError,
  } = usePaymentTestingPageDefinition(
    capabilityBlocks ? null : resolvedConnectionId || null,
  );

  const mutation = useCreatePaymentTestMutation();

  // ── Derived state ─────────────────────────────────────────────────────────
  const pageSubtitle = selectedConnection
    ? `Connection: ${connectionLabel(selectedConnection)}`
    : undefined;

  // Determine if this is a test connection:
  // Prefer the definition's environment (authoritative from server), fall back
  // to the selectedConnection.environment derived from displayIdentifier.
  const definitionEnvironment = definition?.environment;
  const isTestConnection =
    definitionEnvironment === 'test' ||
    (definitionEnvironment === undefined && selectedConnection?.environment === 'test');

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (formValues: Record<string, string>) => {
      if (!resolvedConnectionId || !definition) return;

      const amountRaw = parseFloat(formValues['amount'] ?? '');
      if (isNaN(amountRaw) || amountRaw <= 0) return;

      // The currency/unit key — look for 'price_currency' (CoinGate) first,
      // then 'currency' (Stripe generic), default to empty string
      const unitCode =
        formValues['price_currency'] ??
        formValues['currency'] ??
        '';

      const amountMinor = displayToMinor(amountRaw, unitCode || 'USD');

      mutation.mutate(
        {
          connectionId: resolvedConnectionId,
          paymentMethodKey: formValues['paymentMethodKey'] || undefined,
          amountMinor,
          paymentUnitCode: unitCode || undefined,
          scenario: (formValues['scenario'] as PaymentTestScenario) || undefined,
          description: formValues['description']?.trim() || undefined,
        },
        {
          onSuccess: (result) => {
            setSessionHistory((prev) => [...prev, result]);
            setViewingResult(result);
          },
        },
      );
    },
    [resolvedConnectionId, definition, mutation],
  );

  // ── Loading / error states ────────────────────────────────────────────────

  if (connectionsLoading) {
    return (
      <Box display="flex" justifyContent="center" pt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (connectionsError) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader title="Payment Testing" />
        <ErrorState
          title="Could not load payment connections"
          description="There was a problem loading your configured connections. Please try again."
        />
      </Box>
    );
  }

  if (connections.length === 0) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader
          title="Payment Testing"
          breadcrumbs={[
            { label: 'Payments', href: '/payments' },
            { label: 'Payment Testing' },
          ]}
        />
        <EmptyState
          icon={ScienceOutlinedIcon}
          title="No payment providers configured"
          description="Configure a payment provider credential in the Credentials page to use payment testing."
        />
      </Box>
    );
  }

  if (capabilityBlocks && capabilityStatus) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader
          title="Payment Testing"
          breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Payment Testing' }]}
        />
        <PaymentsFilter />
        <ProviderFeatureUnavailable
          featureDisplayName={PAGE_FEATURE_DISPLAY_NAME.paymentTesting}
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey}
          status={capabilityStatus as 'planned' | 'unsupported'}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Payment Testing"
        subtitle={pageSubtitle}
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'Payment Testing' },
        ]}
      />

      {/* Shared filter: Provider + Connection — always visible so user can switch */}
      <PaymentsFilter />

      {/* No connection resolved */}
      {!resolvedConnectionId && (
        <EmptyState
          icon={LinkOutlinedIcon}
          title="No connection selected"
          description="Select a provider and connection above to run payment tests."
        />
      )}

      {resolvedConnectionId && (
        <Stack spacing={3}>
          {/* Live connection guard — shown when definition reports live OR when we can't determine */}
          {resolvedConnectionId && !isTestConnection && !definitionLoading && (
            <Alert
              severity="warning"
              icon={<WarningAmberOutlinedIcon />}
            >
              <strong>Test mode only.</strong> Payment Testing requires a
              connection using test or sandbox credentials. The selected
              connection appears to use live credentials and cannot be used for
              testing. Switch to a test connection to continue.
            </Alert>
          )}

          {/* Definition loading */}
          {definitionLoading && (
            <Box display="flex" alignItems="center" gap={1.5} py={2}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Loading test configuration…
              </Typography>
            </Box>
          )}

          {/* Definition error */}
          {definitionError && !definitionLoading && (
            <Alert severity="error">
              Could not load the testing configuration for this connection.
              Please try again.
            </Alert>
          )}

          {/* Definition-driven form — shown only for test connections */}
          {definition && isTestConnection && (
            <DefinitionDrivenForm
              definition={definition}
              connectionId={resolvedConnectionId}
              onSubmit={handleSubmit}
              isPending={mutation.isPending}
            />
          )}

          {/* Session history */}
          <SessionHistory
            history={sessionHistory}
            onView={setViewingResult}
          />
        </Stack>
      )}

      {/* Result drawer */}
      <ResultDrawer
        result={viewingResult}
        onClose={() => setViewingResult(null)}
      />
    </Box>
  );
}
