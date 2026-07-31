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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
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
  useCreatePaymentTestMutation,
} from '@/hooks/api/usePayments';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';
import { formatAmountMinor } from '@/lib/formatBalance';
import type {
  PaymentTestResult,
  PaymentTestScenario,
  PaymentTestStatus,
} from '@/types/payments';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'NZD'];

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


function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
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

          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Scenario
            </Typography>
            <Typography variant="body2">
              {SCENARIO_LABELS[result.scenario] ?? result.scenario}
            </Typography>
          </Box>

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
                  {SCENARIO_LABELS[r.scenario] ?? r.scenario}
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

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedScenario, setSelectedScenario] =
    useState<PaymentTestScenario | ''>('');
  const [amountDisplay, setAmountDisplay] = useState<string>('10');
  const [currency, setCurrency] = useState<string>('AUD');
  const [description, setDescription] = useState<string>('');

  // ── Session history + result drawer ───────────────────────────────────────
  const [sessionHistory, setSessionHistory] = useState<PaymentTestResult[]>([]);
  const [viewingResult, setViewingResult] = useState<PaymentTestResult | null>(
    null,
  );

  // ── Clear selections when connection changes ──────────────────────────────
  useEffect(() => {
    setSelectedMethod('');
    setSelectedScenario('');
    setSessionHistory([]);
  }, [resolvedConnectionId]);

  // ── Clear scenario when method changes ────────────────────────────────────
  useEffect(() => {
    setSelectedScenario('');
  }, [selectedMethod]);

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: methodsData, isLoading: methodsLoading } =
    usePaymentMethodConfigurations(capabilityBlocks ? null : resolvedConnectionId || null);

  const enabledMethods =
    methodsData?.data.filter((m) => m.enabled) ?? [];

  const { data: scenarios, isLoading: scenariosLoading } =
    usePaymentTestScenarios(
      capabilityBlocks ? null : resolvedConnectionId || null,
      selectedMethod || null,
    );

  const mutation = useCreatePaymentTestMutation();

  // ── Derived state ─────────────────────────────────────────────────────────
  const isTestConnection = selectedConnection?.environment === 'test';

  const pageSubtitle = selectedConnection
    ? `Connection: ${connectionLabel(selectedConnection)}`
    : undefined;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRunTest = useCallback(() => {
    if (
      !resolvedConnectionId ||
      !selectedMethod ||
      !selectedScenario ||
      !amountDisplay
    )
      return;

    const parsedDisplay = parseFloat(amountDisplay);
    if (isNaN(parsedDisplay) || parsedDisplay <= 0) return;

    const amountMinor = displayToMinor(parsedDisplay, currency);

    mutation.mutate(
      {
        connectionId: resolvedConnectionId,
        paymentMethodKey: selectedMethod,
        amountMinor,
        currency,
        scenario: selectedScenario,
        description: description.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          setSessionHistory((prev) => [...prev, result]);
          setViewingResult(result);
        },
      },
    );
  }, [
    resolvedConnectionId,
    selectedMethod,
    selectedScenario,
    amountDisplay,
    currency,
    description,
    mutation,
  ]);

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
          {/* Live connection guard */}
          {!isTestConnection && (
            <Alert
              severity="warning"
              icon={<WarningAmberOutlinedIcon />}
            >
              <strong>Test mode only.</strong> Payment Testing requires a
              connection using test credentials (pk_test_...). The selected
              connection uses live credentials and cannot be used for testing.
              Switch to a test connection to continue.
            </Alert>
          )}

          {/* Test form — only shown for test connections */}
          {isTestConnection && (
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack spacing={2.5}>
                  <Typography variant="subtitle2">Run a payment test</Typography>

                  {/* Payment method selector */}
                  <FormControl fullWidth size="small">
                    <InputLabel id="method-label">Payment Method</InputLabel>
                    {methodsLoading ? (
                      <Box display="flex" alignItems="center" gap={1} py={1}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">
                          Loading methods…
                        </Typography>
                      </Box>
                    ) : enabledMethods.length === 0 ? (
                      <Box py={1}>
                        <Typography variant="caption" color="text.secondary">
                          No enabled payment methods for this connection.
                        </Typography>
                      </Box>
                    ) : (
                      <Select
                        labelId="method-label"
                        label="Payment Method"
                        value={selectedMethod}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                      >
                        {enabledMethods.map((m) => (
                          <MenuItem key={m.id} value={m.id}>
                            {m.displayName}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </FormControl>

                  {/* Scenario selector */}
                  <FormControl fullWidth size="small" disabled={!selectedMethod}>
                    <InputLabel id="scenario-label">Scenario</InputLabel>
                    {scenariosLoading ? (
                      <Box display="flex" alignItems="center" gap={1} py={1}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">
                          Loading scenarios…
                        </Typography>
                      </Box>
                    ) : selectedMethod && scenarios && scenarios.length === 0 ? (
                      <Box py={1}>
                        <Tooltip
                          title={`${resolvedProviderKey} does not support programmatic testing for this method.`}
                        >
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <ConstructionOutlinedIcon
                              fontSize="small"
                              color="disabled"
                            />
                            <Typography variant="caption" color="text.secondary">
                              No test scenarios available for this method.
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Select
                        labelId="scenario-label"
                        label="Scenario"
                        value={selectedScenario}
                        onChange={(e) =>
                          setSelectedScenario(
                            e.target.value as PaymentTestScenario,
                          )
                        }
                        disabled={!selectedMethod || !scenarios?.length}
                      >
                        {(scenarios ?? []).map((s) => (
                          <MenuItem key={s} value={s}>
                            {SCENARIO_LABELS[s] ?? s}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </FormControl>

                  {/* Amount + Currency row */}
                  <Box display="flex" gap={1.5}>
                    <TextField
                      label="Amount"
                      size="small"
                      type="number"
                      value={amountDisplay}
                      onChange={(e) => setAmountDisplay(e.target.value)}
                      inputProps={{ min: '0.01', step: '0.01' }}
                      sx={{ flexGrow: 1 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel id="currency-label">Currency</InputLabel>
                      <Select
                        labelId="currency-label"
                        label="Currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <MenuItem key={c} value={c}>
                            {c}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Description (optional) */}
                  <TextField
                    label="Description (optional)"
                    size="small"
                    fullWidth
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Test payment for invoice #123"
                  />

                  {/* Amount preview */}
                  {amountDisplay && !isNaN(parseFloat(amountDisplay)) && (
                    <Typography variant="caption" color="text.secondary">
                      Will charge:{' '}
                      {formatAmountMinor(
                        displayToMinor(parseFloat(amountDisplay), currency),
                        currency,
                      )}
                    </Typography>
                  )}

                  {/* Submit */}
                  <Button
                    variant="contained"
                    onClick={handleRunTest}
                    disabled={
                      !selectedMethod ||
                      !selectedScenario ||
                      !amountDisplay ||
                      isNaN(parseFloat(amountDisplay)) ||
                      parseFloat(amountDisplay) <= 0 ||
                      mutation.isPending
                    }
                    startIcon={
                      mutation.isPending ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <ScienceOutlinedIcon />
                      )
                    }
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {mutation.isPending ? 'Running test…' : 'Run payment test'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
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
