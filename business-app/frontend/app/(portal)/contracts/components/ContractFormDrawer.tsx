'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller, useController, useWatch } from 'react-hook-form';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { FieldValues, Control, FieldErrors } from 'react-hook-form';

import { ConfirmDialog, FormDrawer, HelpDialog, LoadingButton } from '@/components/shared';
import type { HelpTopic } from '@/components/shared';
import {
  useCreateContractMutation,
  useUpdateContractMutation,
  useCancelContractMutation,
  useFinishContractMutation,
} from '@/hooks/api/useContracts';
import { useCustomers } from '@/hooks/api/useCustomers';
import {
  useCalendarOptions,
  useAvailableCalendarAccounts,
  useSetupPaymentCalendarMutation,
  useSetupAustralianHolidaysMutation,
} from '@/hooks/api/useLinkedCalendars';

import { extractApiMessage } from '@/lib/mapApiError';
import { useUIStore } from '@/stores/ui.store';
import type { AvailableCalendarAccount } from '@/types/linked-calendar';
import type {
  Contract,
  CreateContractPayload,
  UpdateContractPayload,
  BillingCycle,
  RateType,
  ContractStatus,
  WorkType,
  HolidayBehaviour,
  HolidayRules,
  SuperPaymentFrequency,
  SuperannuationRules,
  Currency,
  ScheduledPaymentDay,
} from '@/types/contract';
import {
  STATUS_LABELS,
  PAYMENT_TERMS_OPTIONS,
  WORK_TYPE_LABELS,
  HOLIDAY_BEHAVIOUR_LABELS,
  DEFAULT_HOLIDAY_RULES,
  SUPPORTED_CURRENCIES,
  CURRENCY_LABELS,
  SUPER_PAYMENT_FREQUENCY_LABELS,
  DEFAULT_SUPERANNUATION_RULES,
  SCHEDULED_PAYMENT_DAY_LABELS,
} from '@/types/contract';
import { RateRulesEditor, type RateRuleFormValue } from '../RateRulesEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrawerMode = 'create' | 'view' | 'edit';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_TERMS_VALUES = PAYMENT_TERMS_OPTIONS.map((o) => o.value);

// ─── Account selection dialog (one-click setup) ───────────────────────────────

interface AccountSelectionDialogProps {
  open:     boolean;
  accounts: AvailableCalendarAccount[];
  title:    string;
  onSelect: (connectionId: string) => void;
  onClose:  () => void;
}

function AccountSelectionDialog({
  open,
  accounts,
  title,
  onSelect,
  onClose,
}: AccountSelectionDialogProps) {
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (open) setSelected('');
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Multiple calendar accounts found. Select which account to use.
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel>Calendar Account</InputLabel>
          <Select
            label="Calendar Account"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <MenuItem value="">Select an account</MenuItem>
            {accounts.map((acc) => (
              <MenuItem key={acc.connectionId} value={acc.connectionId}>
                <Box>
                  <Typography variant="body2">{acc.accountIdentifier}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {acc.providerDisplayName}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!selected}
          onClick={() => { if (selected) onSelect(selected); }}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const INVOICE_DUE_RULE_OPTIONS = [
  { value: 'from_invoice_date', label: 'From Invoice Date' },
  { value: 'end_of_week',       label: 'End of Week' },
  { value: 'end_of_month',      label: 'End of Month' },
];

const STATUS_COLORS: Record<ContractStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft:     'default',
  active:    'success',
  inactive:  'warning',
  finished:  'primary',
  cancelled: 'error',
};

// ─── Form shape ───────────────────────────────────────────────────────────────

interface FormValues {
  // Section 1: General
  customerId:             string;
  positionName:           string;
  workType:               WorkType;
  invoiceDescription:     string;
  startDate:              string;
  hasEndDate:             boolean;
  endDate:                string;
  notes:                  string;

  // Section 2: Billing & Invoice
  billingCycle:              BillingCycle;
  paymentTermsDays:          number;
  invoiceDueRule:            string;
  scheduledPaymentEnabled:   boolean;
  scheduledPaymentDay:       string;

  // Section 3: Working Rules
  minimumHours:           number;
  defaultBreakMinutes:    number;

  // Section 4: Rate Configuration
  rateType:               RateType;
  rates:                  RateRuleFormValue[];

  // Section 5: Holiday Rules
  holidayEnabled:          boolean;
  holidayCalendarId:       string;
  holidayCalendarName:     string;
  holidayCalendarProvider: string;
  holidayBehaviour:        HolidayBehaviour;
  holidayMultiplier:       string;
  holidayFixedRate:        string;

  // Section 6: Invoice Settings
  invoiceUsePrefix:        boolean;
  invoicePrefix:           string;
  startingInvoiceNumber:   number;
  currency:                string;
  chargeGst:               boolean;
  gstRate:                 string;

  // Section 7: Superannuation
  superEnabled:            boolean;
  superRate:               string;
  superFrequency:          string;

  // Section 8: Payment Calendar
  paymentCalendarEnabled:          boolean;
  paymentCalendarSubscriptionId:   string;
}

const DEFAULT_VALUES: FormValues = {
  customerId:              '',
  positionName:            '',
  workType:                'contractor',
  invoiceDescription:      '',
  startDate:               '',
  hasEndDate:              false,
  endDate:                 '',
  notes:                   '',
  billingCycle:              'per_shift',
  paymentTermsDays:          14,
  invoiceDueRule:            'from_invoice_date',
  scheduledPaymentEnabled:   false,
  scheduledPaymentDay:       '',
  minimumHours:            4,
  defaultBreakMinutes:     30,
  rateType:                'fixed',
  rates:                   [],
  holidayEnabled:          false,
  holidayCalendarId:       '',
  holidayCalendarName:     '',
  holidayCalendarProvider: '',
  holidayBehaviour:        'normal_rate' as HolidayBehaviour,
  holidayMultiplier:       '',
  holidayFixedRate:        '',
  invoiceUsePrefix:        false,
  invoicePrefix:           '',
  startingInvoiceNumber:   1,
  currency:                'AUD',
  chargeGst:               false,
  gstRate:                 '10',
  superEnabled:            false,
  superRate:               '12',
  superFrequency:          'quarterly',
  paymentCalendarEnabled:          false,
  paymentCalendarSubscriptionId:   '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

function contractToFormValues(c: Contract): FormValues {
  const hr = c.holidayRules as any;
  let holidayEnabled = false;
  let holidayMultiplier = '';
  let holidayFixedRate = '';
  let holidayBehaviour: HolidayBehaviour = 'normal_rate';

  if (hr) {
    if ('behaviour' in hr) {
      holidayEnabled   = hr.enabled ?? (hr.calendarId != null);
      holidayBehaviour = hr.behaviour ?? 'normal_rate';
    } else {
      holidayEnabled = hr.enabled ?? false;
      const workAllowed: boolean = hr.workAllowed ?? true;
      const payMethod: string    = hr.payMethod ?? 'normal_rate';
      holidayBehaviour = !workAllowed ? 'no_work' : (payMethod as HolidayBehaviour);
    }
    holidayMultiplier = hr.multiplier      != null ? String(hr.multiplier)      : '';
    holidayFixedRate  = hr.fixedHourlyRate != null ? String(hr.fixedHourlyRate) : '';
  }

  const sr = (c as any).superannuationRules;
  const superEnabled   = sr?.enabled          ?? false;
  const superRate      = sr?.rate    != null  ? String(sr.rate)            : '12';
  const superFrequency = sr?.paymentFrequency ?? 'quarterly';

  return {
    customerId:              c.customerId,
    positionName:            c.positionName,
    workType:                c.workType ?? 'contractor',
    invoiceDescription:      c.invoiceDescription,
    startDate:               toDateInput(c.startDate),
    hasEndDate:              c.endDate != null,
    endDate:                 toDateInput(c.endDate),
    notes:                   c.notes ?? '',
    billingCycle:              c.billingCycle,
    paymentTermsDays:          c.paymentTermsDays ?? 14,
    invoiceDueRule:            c.invoiceDueRule ?? 'from_invoice_date',
    scheduledPaymentEnabled:   (c as any).scheduledPaymentEnabled ?? false,
    scheduledPaymentDay:       (c as any).scheduledPaymentDay     ?? '',
    minimumHours:            c.minimumHours,
    defaultBreakMinutes:     c.defaultBreakMinutes,
    rateType:                c.rateType,
    rates: c.rates.map((r) => ({
      days:       r.days,
      startTime:  r.startTime ?? '',
      endTime:    r.endTime   ?? '',
      hourlyRate: String(r.hourlyRate),
    })),
    holidayEnabled,
    holidayCalendarId:       hr?.calendarId           ?? '',
    holidayCalendarName:     hr?.calendarName         ?? '',
    holidayCalendarProvider: hr?.calendarProviderName ?? '',
    holidayBehaviour,
    holidayMultiplier,
    holidayFixedRate,
    invoiceUsePrefix: (c as any).useInvoicePrefix !== undefined
      ? (c as any).useInvoicePrefix
      : !!(c.invoicePrefix && c.invoicePrefix.trim()),
    invoicePrefix:           c.invoicePrefix ?? '',
    startingInvoiceNumber:   c.startingInvoiceNumber ?? 1,
    currency:                (c as any).currency ?? 'AUD',
    chargeGst:               (c as any).chargeGst ?? false,
    gstRate:                 (c as any).chargeGst && (c as any).gstRate != null
      ? String((c as any).gstRate) : '10',
    superEnabled,
    superRate,
    superFrequency,
    paymentCalendarEnabled:        (c as any).paymentCalendarEnabled ?? false,
    paymentCalendarSubscriptionId: (c as any).paymentCalendarSubscriptionId ?? '',
  };
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, help }: { title: string; help?: React.ReactNode }) {
  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
        {help}
      </Box>
      <Divider sx={{ mb: 2.5 }} />
    </Box>
  );
}

function ComingSoonField({ label }: { label: string }) {
  return (
    <Tooltip title="Coming soon" placement="right">
      <TextField
        label={label}
        value=""
        disabled
        size="small"
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <LockOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
        helperText="Not yet available"
      />
    </Tooltip>
  );
}

// ─── Section props ────────────────────────────────────────────────────────────

interface SectionProps {
  control:   Control<FormValues>;
  errors:    FieldErrors<FormValues>;
  isEditing: boolean;
  readonly:  boolean;
  customers: { id: string; displayName: string }[];
  status?:   ContractStatus;
}

// ─── Section 1: General ───────────────────────────────────────────────────────

const GENERAL_HELP_TOPICS: HelpTopic[] = [
  {
    heading: 'Work Type',
    body: (
      <Typography variant="body2" color="text.secondary">
        Work Type describes the commercial relationship under which your business provides
        services and invoices the customer. It does not affect Contract Status, rate
        calculations, or invoice generation — it is informational metadata that identifies
        the type of engagement.
      </Typography>
    ),
  },
  {
    heading: 'Open-ended Contracts',
    body: (
      <Typography variant="body2" color="text.secondary">
        If the agreement does not have a fixed finish date, leave "Contract has an end
        date" turned off. The Contract will run indefinitely until you manually change
        its status. Enable the toggle only when the agreement finishes on a known date.
      </Typography>
    ),
  },
];

function SectionGeneral({ control, errors, isEditing, readonly, customers, status }: SectionProps) {
  const hasEndDate = useWatch({ control, name: 'hasEndDate' });

  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      <SectionHeader
        title="General"
        help={<HelpDialog title="General" topics={GENERAL_HELP_TOPICS} />}
      />

      {/* Customer — create mode only */}
      {!isEditing && (
        <Controller
          name="customerId"
          control={control}
          rules={{ required: 'Customer is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Customer"
              required
              fullWidth
              disabled={readonly}
              error={!!errors.customerId}
              helperText={errors.customerId?.message}
            >
              <MenuItem value="" disabled>Select a customer</MenuItem>
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.displayName}</MenuItem>
              ))}
            </TextField>
          )}
        />
      )}

      {/* Status — edit/view mode (read-only display) */}
      {isEditing && status && (
        <Box display="flex" alignItems="center" gap={1.5}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>Status</Typography>
          <Chip
            label={STATUS_LABELS[status]}
            size="small"
            color={STATUS_COLORS[status] ?? 'default'}
            variant="outlined"
          />
        </Box>
      )}

      <Controller
        name="positionName"
        control={control}
        rules={{ required: 'Contract / Position is required', maxLength: { value: 200, message: 'Max 200 chars' } }}
        render={({ field }) => (
          <TextField
            {...field}
            label="Contract / Position"
            required
            fullWidth
            disabled={readonly}
            error={!!errors.positionName}
            helperText={errors.positionName?.message ?? 'e.g. Senior Developer, Security Guard'}
          />
        )}
      />

      <Controller
        name="workType"
        control={control}
        rules={{ required: 'Work Type is required' }}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="Work Type"
            required
            fullWidth
            disabled={readonly}
            error={!!errors.workType}
            helperText={errors.workType?.message ?? 'The commercial relationship for this contract'}
          >
            {(Object.entries(WORK_TYPE_LABELS) as [WorkType, string][]).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </TextField>
        )}
      />

      <Controller
        name="invoiceDescription"
        control={control}
        rules={{ required: 'Invoice description is required', maxLength: { value: 500, message: 'Max 500 chars' } }}
        render={({ field }) => (
          <TextField
            {...field}
            label="Invoice Description"
            required
            fullWidth
            multiline
            minRows={2}
            disabled={readonly}
            error={!!errors.invoiceDescription}
            helperText={errors.invoiceDescription?.message ?? 'This text appears on generated invoices'}
          />
        )}
      />

      <Controller
        name="startDate"
        control={control}
        rules={{ required: 'Start date is required' }}
        render={({ field }) => (
          <TextField
            {...field}
            type="date"
            label="Start Date"
            required
            fullWidth
            disabled={readonly}
            InputLabelProps={{ shrink: true }}
            error={!!errors.startDate}
            helperText={errors.startDate?.message}
          />
        )}
      />

      <Controller
        name="hasEndDate"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(e) => { field.onChange(e.target.checked); }}
                size="small"
                disabled={readonly}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Contract has an end date</Typography>
                <Typography variant="caption" color="text.secondary">
                  Enable this when the agreement finishes on a known date.
                </Typography>
              </Box>
            }
          />
        )}
      />

      {hasEndDate && (
        <Controller
          name="endDate"
          control={control}
          rules={{
            required: 'End date is required when "Contract has an end date" is enabled',
            validate: (value, formValues) => {
              if (!value) return 'End date is required';
              if (formValues.startDate && value < formValues.startDate) {
                return 'End date must be on or after Start Date';
              }
              return true;
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              type="date"
              label="End Date"
              required
              fullWidth
              disabled={readonly}
              InputLabelProps={{ shrink: true }}
              error={!!errors.endDate}
              helperText={errors.endDate?.message}
            />
          )}
        />
      )}

      <Controller
        name="notes"
        control={control}
        rules={{ maxLength: { value: 2000, message: 'Max 2000 characters' } }}
        render={({ field }) => (
          <TextField
            {...field}
            label="Internal Notes"
            fullWidth
            multiline
            minRows={2}
            disabled={readonly}
            error={!!errors.notes}
            helperText={errors.notes?.message ?? 'Visible only to your team'}
          />
        )}
      />
    </Box>
  );
}

// ─── Section 2: Billing & Invoice ─────────────────────────────────────────────

const BILLING_INVOICE_HELP_TOPICS: HelpTopic[] = [
  {
    heading: 'What this section is for',
    body: (
      <Typography variant="body2" color="text.secondary">
        This section controls the rhythm and timing of invoicing and payment for work done
        under this contract. Invoices are generated according to the Billing Cycle. Payment
        is expected according to one payment method — either Payment Terms or Scheduled Payment.
      </Typography>
    ),
  },
  {
    heading: 'Billing Cycle',
    body: (
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {[
          { label: 'Per Shift', desc: 'One invoice per completed shift.' },
          { label: 'Daily', desc: 'One invoice per working day.' },
          { label: 'Weekly', desc: 'One invoice at the end of each week.' },
          { label: 'Fortnightly', desc: 'One invoice every two weeks.' },
          { label: 'Monthly', desc: 'One invoice at the end of each month.' },
        ].map(({ label, desc }) => (
          <Box component="li" key={label} sx={{ mb: 0.5 }}>
            <Typography variant="body2" component="span" fontWeight={600}>{label} — </Typography>
            <Typography variant="body2" component="span" color="text.secondary">{desc}</Typography>
          </Box>
        ))}
      </Box>
    ),
  },
  {
    heading: 'Payment Terms',
    body: (
      <Typography variant="body2" color="text.secondary">
        The Customer pays within the selected number of days after the invoice is issued.
        "Immediately" means payment is due on the invoice date. Only one payment method
        can be configured per Contract — use either Payment Terms or Scheduled Payment.
      </Typography>
    ),
  },
  {
    heading: 'Scheduled Payment',
    body: (
      <Box display="flex" flexDirection="column" gap={1.5}>
        <Typography variant="body2" color="text.secondary">
          The Customer normally processes payments on a fixed weekday. Enable this instead of
          Payment Terms when the Customer pays on a specific day rather than within a number
          of days. Only one payment method can be configured per Contract.
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2" component="span" fontWeight={600}>Example — </Typography>
            <Typography variant="body2" component="span" color="text.secondary">
              Billing Cycle: Weekly, Payment Day: Friday. The Customer processes the
              weekly payment every Friday.
            </Typography>
          </Box>
        </Box>
      </Box>
    ),
  },
  {
    heading: 'Invoice Due Rule',
    body: (
      <Typography variant="body2" color="text.secondary">
        Determines when the invoice becomes due. "From Invoice Date" is the most common.
        Applies to both payment methods.
      </Typography>
    ),
  },
];

function SectionBilling({ control, errors, readonly }: Pick<SectionProps, 'control' | 'errors' | 'readonly'>) {
  const paymentTermsDays    = useWatch({ control, name: 'paymentTermsDays' });
  const scheduledPayEnabled = useWatch({ control, name: 'scheduledPaymentEnabled' });
  const isNonPreset = !PAYMENT_TERMS_VALUES.includes(paymentTermsDays);

  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      <SectionHeader
        title="Billing & Invoice"
        help={<HelpDialog title="Billing & Invoice" topics={BILLING_INVOICE_HELP_TOPICS} />}
      />

      <Controller
        name="billingCycle"
        control={control}
        render={({ field }) => (
          <TextField {...field} select label="Billing Cycle" required fullWidth disabled={readonly}>
            <MenuItem value="per_shift">Per Shift</MenuItem>
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="fortnightly">Fortnightly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
          </TextField>
        )}
      />

      <Controller
        name="invoiceDueRule"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="Invoice Due Rule"
            fullWidth
            disabled={readonly}
            helperText="Determines when invoices become due"
          >
            {INVOICE_DUE_RULE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        )}
      />

      <Controller
        name="scheduledPaymentEnabled"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                size="small"
                disabled={readonly}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Scheduled Payment</Typography>
                <Typography variant="caption" color="text.secondary">
                  Off: use Payment Terms. On: use a fixed payment weekday instead.
                </Typography>
              </Box>
            }
          />
        )}
      />

      {!scheduledPayEnabled && (
        <Controller
          name="paymentTermsDays"
          control={control}
          rules={{ required: 'Payment Terms is required' }}
          render={({ field }) => (
            <TextField
              select
              label="Payment Terms"
              required
              fullWidth
              disabled={readonly}
              value={field.value}
              onChange={(e) => field.onChange(Number(e.target.value))}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              error={!!errors.paymentTermsDays}
              helperText={errors.paymentTermsDays?.message}
            >
              {PAYMENT_TERMS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
              {isNonPreset && (
                <MenuItem value={paymentTermsDays}>{paymentTermsDays} Days (current)</MenuItem>
              )}
            </TextField>
          )}
        />
      )}

      {scheduledPayEnabled && (
        <Controller
          name="scheduledPaymentDay"
          control={control}
          rules={{ required: 'Payment Day is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Payment Day"
              required
              fullWidth
              disabled={readonly}
              error={!!errors.scheduledPaymentDay}
              helperText={
                errors.scheduledPaymentDay?.message ??
                "The weekday on which the Customer normally processes payments"
              }
            >
              {(Object.entries(SCHEDULED_PAYMENT_DAY_LABELS) as [ScheduledPaymentDay, string][]).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          )}
        />
      )}
    </Box>
  );
}

// ─── Section 3: Working Rules ─────────────────────────────────────────────────

function SectionWorkingRules({ control, errors, readonly }: Pick<SectionProps, 'control' | 'errors' | 'readonly'>) {
  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      <SectionHeader title="Working Rules" />

      <Box display="flex" gap={2} flexWrap="wrap">
        <Controller
          name="minimumHours"
          control={control}
          rules={{ min: { value: 0, message: 'Must be ≥ 0' } }}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              label="Minimum Hours"
              disabled={readonly}
              inputProps={{ min: 0, step: 0.5 }}
              sx={{ flex: 1, minWidth: 140 }}
              error={!!errors.minimumHours}
              helperText={errors.minimumHours?.message ?? 'Minimum billable hours per shift'}
            />
          )}
        />
        <Controller
          name="defaultBreakMinutes"
          control={control}
          rules={{ min: { value: 0, message: 'Must be ≥ 0' } }}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              label="Default Break"
              disabled={readonly}
              inputProps={{ min: 0, step: 5 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">min</InputAdornment>,
              }}
              sx={{ flex: 1, minWidth: 140 }}
              error={!!errors.defaultBreakMinutes}
              helperText={errors.defaultBreakMinutes?.message ?? 'Unpaid break per shift'}
            />
          )}
        />
      </Box>

      <Box display="flex" gap={2} flexWrap="wrap">
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <ComingSoonField label="Time Rounding" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <ComingSoonField label="Overtime Starts After" />
        </Box>
      </Box>
    </Box>
  );
}

// ─── Section 4: Rate Configuration ───────────────────────────────────────────

function SectionRateConfiguration({ control, errors, readonly }: Pick<SectionProps, 'control' | 'errors' | 'readonly'>) {
  const rateType = useWatch({ control, name: 'rateType' });

  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      <SectionHeader title="Rate Configuration" />

      <Controller
        name="rateType"
        control={control}
        render={({ field }) => (
          <TextField {...field} select label="Rate Type" required fullWidth disabled={readonly}>
            <MenuItem value="fixed">Fixed — same rate for all shifts</MenuItem>
            <MenuItem value="variable">Variable — different rates by day</MenuItem>
            <MenuItem value="variable_time_range">Variable + Time Range — rates by day and time</MenuItem>
          </TextField>
        )}
      />

      <RateRulesEditor
        control={control as unknown as Control<FieldValues>}
        errors={errors as FieldErrors<FieldValues>}
        rateType={rateType}
        readonly={readonly}
      />
    </Box>
  );
}

// ─── Section 5: Holiday Rules ─────────────────────────────────────────────────

const HOLIDAY_RULES_HELP_TOPICS: HelpTopic[] = [
  {
    heading: 'How the calendar is used',
    body: (
      <Typography variant="body2" color="text.secondary">
        The selected calendar identifies which dates are holidays. Events in that calendar
        are treated as holiday dates. The contract does not store holiday dates — it only
        stores a reference to the calendar.
      </Typography>
    ),
  },
  {
    heading: 'Holiday Behaviour',
    body: (
      <Box display="flex" flexDirection="column" gap={1.5}>
        <Typography variant="body2" color="text.secondary">
          Defines what happens when a work date falls on a holiday. Normal weekday/weekend
          rates apply first, then the holiday rule is applied.
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {[
            { label: 'Normal Rate', desc: 'Work is allowed at the existing contract rate.' },
            { label: 'Multiplier',  desc: 'Work is allowed. Rate is multiplied. Example: $50/hr × 2.0 = $100/hr.' },
            { label: 'Fixed Rate',  desc: 'Work is allowed at a fixed hourly rate, replacing the normal rate.' },
            { label: 'No Work',     desc: 'Work is not allowed on holiday dates.' },
          ].map(({ label, desc }) => (
            <Box component="li" key={label} sx={{ mb: 0.5 }}>
              <Typography variant="body2" component="span" fontWeight={600}>{label} — </Typography>
              <Typography variant="body2" component="span" color="text.secondary">{desc}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    ),
  },
];

function SectionHolidayRules({ control, errors, readonly }: Pick<SectionProps, 'control' | 'errors' | 'readonly'>) {
  const enabled    = useWatch({ control, name: 'holidayEnabled' });
  const behaviour  = useWatch({ control, name: 'holidayBehaviour' });
  const { field: holidayCalField } = useController({ control, name: 'holidayCalendarId' });
  const calendarId = holidayCalField.value;

  const { data: calendars, isLoading: calsLoading, error: calsError } = useCalendarOptions('holidays');
  const selectedCal = (calendars ?? []).find((c) => c.id === calendarId) ?? null;

  const { data: accounts }    = useAvailableCalendarAccounts();
  const setupHoliday          = useSetupAustralianHolidaysMutation();
  const pushSnack             = useUIStore((s) => s.pushSnack);
  const [acctDialogOpen, setAcctDialogOpen] = useState(false);
  const [showManualGuidance, setShowManualGuidance] = useState(false);

  useEffect(() => {
    if (enabled && !calendarId && calendars?.length === 1) {
      holidayCalField.onChange(calendars[0].id);
    }
  }, [enabled, calendarId, calendars]); // eslint-disable-line react-hooks/exhaustive-deps

  async function executeHolidaySetup(connectionId: string) {
    try {
      const result = await setupHoliday.mutateAsync({ connectionId });
      if (result.status === 'linked') {
        holidayCalField.onChange(result.calendar.id);
        pushSnack({
          type:    'success',
          message: result.calendar.wasExisting
            ? 'Existing calendar selected.'
            : 'Australian holiday calendar added and selected.',
        });
      } else {
        setShowManualGuidance(true);
      }
    } catch (err: any) {
      pushSnack({ type: 'error', message: extractApiMessage(err, 'Could not connect to calendar service. Please try again.') });
    }
  }

  function handleAddAustralianHolidays() {
    const activeAccounts = (accounts ?? []).filter((a) => a.isActive);
    if (activeAccounts.length === 0) {
      pushSnack({ type: 'warning', message: 'Connect a calendar account before adding this calendar.' });
      return;
    }
    if (activeAccounts.length === 1) {
      executeHolidaySetup(activeAccounts[0].connectionId);
    } else {
      setAcctDialogOpen(true);
    }
  }

  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      <SectionHeader
        title="Holiday Rules"
        help={<HelpDialog title="Holiday Rules" topics={HOLIDAY_RULES_HELP_TOPICS} />}
      />

      <Controller
        name="holidayEnabled"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                size="small"
                disabled={readonly}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Apply Holiday Rules</Typography>
                <Typography variant="caption" color="text.secondary">
                  Enables holiday detection and behaviour configuration for this contract.
                </Typography>
              </Box>
            }
          />
        )}
      />

      {enabled && (
        <>
          {calsError ? (
            <Alert severity="warning">
              <AlertTitle>Holiday calendars unavailable</AlertTitle>
              Calendar integration could not be reached.{' '}
              <Link href="/settings/calendar" underline="hover">Go to Calendar Settings</Link>
            </Alert>
          ) : showManualGuidance ? (
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Alert severity="info">
                <AlertTitle>Manual setup required</AlertTitle>
                Your calendar provider does not support automatic holiday calendar setup.
              </Alert>
              <Typography variant="body2" color="text.secondary">To continue:</Typography>
              <Box component="ol" sx={{ pl: 2.5, mt: 0, mb: 0 }}>
                {[
                  'Open your Calendar application.',
                  'Go to your calendars list.',
                  'Select Add Calendar.',
                  'Choose Add Holiday Calendar.',
                  'Add Australia.',
                  'Return to Business App.',
                  'Open Linked Calendars.',
                  'Link the holiday calendar and assign the Holidays flow.',
                  'Return to this Contract and select the calendar.',
                ].map((step, i) => (
                  <Typography component="li" variant="body2" key={i} sx={{ mb: 0.5 }}>
                    {step}
                  </Typography>
                ))}
              </Box>
              <Box>
                <Button variant="outlined" size="small" href="/settings/calendar">
                  Go to Linked Calendars
                </Button>
              </Box>
            </Box>
          ) : !calsLoading && (calendars ?? []).length === 0 && !calendarId ? (
            <Box>
              <Alert severity="info" sx={{ mb: 1.5 }}>
                No holiday calendar configured.
              </Alert>
              {!readonly && (
                <Button
                  variant="outlined"
                  size="small"
                  disabled={setupHoliday.isPending}
                  startIcon={
                    setupHoliday.isPending
                      ? <CircularProgress size={14} color="inherit" />
                      : undefined
                  }
                  onClick={handleAddAustralianHolidays}
                >
                  {setupHoliday.isPending ? 'Adding…' : 'Add Australian Holidays'}
                </Button>
              )}
            </Box>
          ) : (
            <>
              {calendarId && !calsLoading && !(calendars ?? []).find((c) => c.id === calendarId) && (
                <Alert severity="warning">
                  The previously selected holiday calendar is inactive or was removed.
                  Please select an active calendar, or{' '}
                  <Link href="/settings/calendar" underline="hover">activate it</Link> first.
                </Alert>
              )}
              <Controller
                name="holidayCalendarId"
                control={control}
                rules={{ required: 'A Holiday Calendar is required when Apply Holiday Rules is enabled' }}
                render={({ field }) => (
                  <TextField
                    select
                    label="Holiday Calendar"
                    required
                    fullWidth
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    disabled={calsLoading || readonly}
                    error={!!errors.holidayCalendarId}
                    helperText={
                      errors.holidayCalendarId?.message ??
                      'Events in this calendar are treated as holidays for this contract.'
                    }
                  >
                    <MenuItem value="">Select a holiday calendar</MenuItem>
                    {calsLoading && <MenuItem value="" disabled>Loading…</MenuItem>}
                    {(calendars ?? []).map((cal) => (
                      <MenuItem key={cal.id} value={cal.id}>
                        <Box>
                          <Typography variant="body2">{cal.calendarName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cal.providerDisplayName} · {cal.accountIdentifier}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </>
          )}

          {/* Hidden snapshot fields */}
          <Controller name="holidayCalendarName" control={control} render={({ field }) => {
            const snap = selectedCal?.calendarName ?? '';
            if (field.value !== snap) field.onChange(snap);
            return <input type="hidden" {...field} />;
          }} />
          <Controller name="holidayCalendarProvider" control={control} render={({ field }) => {
            const snap = selectedCal?.providerDisplayName ?? '';
            if (field.value !== snap) field.onChange(snap);
            return <input type="hidden" {...field} />;
          }} />

          <Controller
            name="holidayBehaviour"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Holiday Behaviour"
                fullWidth
                disabled={readonly}
                helperText="What happens when a work date falls on a holiday"
              >
                {(Object.entries(HOLIDAY_BEHAVIOUR_LABELS) as [HolidayBehaviour, string][]).map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </TextField>
            )}
          />

          {behaviour === 'no_work' && (
            <Alert severity="info">
              Work events cannot be scheduled on dates identified as holidays by the
              selected calendar. This will be enforced when Work Event management is available.
            </Alert>
          )}

          {behaviour === 'multiplier' && (
            <Controller
              name="holidayMultiplier"
              control={control}
              rules={{
                required: 'Multiplier is required',
                validate: (v) => {
                  const n = Number(v);
                  if (!v || isNaN(n)) return 'Multiplier is required';
                  if (n <= 0) return 'Multiplier must be greater than 0';
                  return true;
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Holiday Multiplier"
                  fullWidth
                  disabled={readonly}
                  inputProps={{ min: 0.01, step: 0.25 }}
                  error={!!errors.holidayMultiplier}
                  helperText={
                    errors.holidayMultiplier?.message ??
                    'Multiplies the rate that would normally apply. Example: $50/hr × 2.0 = $100/hr on holidays.'
                  }
                  placeholder="e.g. 2.0"
                />
              )}
            />
          )}

          {behaviour === 'fixed_rate' && (
            <Controller
              name="holidayFixedRate"
              control={control}
              rules={{
                required: 'Holiday hourly rate is required',
                validate: (v) => {
                  const n = Number(v);
                  if (v === '' || isNaN(n)) return 'Holiday hourly rate is required';
                  if (n < 0) return 'Rate must be 0 or greater';
                  return true;
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Holiday Hourly Rate"
                  fullWidth
                  disabled={readonly}
                  inputProps={{ min: 0, step: 1 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  error={!!errors.holidayFixedRate}
                  helperText={
                    errors.holidayFixedRate?.message ??
                    'Replaces the normal rate with this fixed hourly rate on holidays.'
                  }
                  placeholder="e.g. 80.00"
                />
              )}
            />
          )}
        </>
      )}

      <AccountSelectionDialog
        open={acctDialogOpen}
        accounts={(accounts ?? []).filter((a) => a.isActive)}
        title="Select Calendar Account"
        onSelect={(connectionId) => {
          setAcctDialogOpen(false);
          executeHolidaySetup(connectionId);
        }}
        onClose={() => setAcctDialogOpen(false)}
      />
    </Box>
  );
}

// ─── Section 6: Invoice Settings ─────────────────────────────────────────────

function SectionInvoiceSettings({ control, errors, readonly }: Pick<SectionProps, 'control' | 'errors' | 'readonly'>) {
  const invoiceUsePrefix = useWatch({ control, name: 'invoiceUsePrefix' });
  const chargeGst        = useWatch({ control, name: 'chargeGst' });

  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      <SectionHeader title="Invoice Settings" />

      <Controller
        name="invoiceUsePrefix"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                size="small"
                disabled={readonly}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Use Invoice Prefix</Typography>
                <Typography variant="caption" color="text.secondary">
                  Adds a text prefix before invoice numbers, e.g. INV-1, INV-2.
                </Typography>
              </Box>
            }
          />
        )}
      />

      {invoiceUsePrefix && (
        <Controller
          name="invoicePrefix"
          control={control}
          rules={{
            required: 'Invoice Prefix is required',
            maxLength: { value: 20, message: 'Max 20 characters' },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Invoice Prefix"
              required
              fullWidth
              disabled={readonly}
              error={!!errors.invoicePrefix}
              helperText={errors.invoicePrefix?.message ?? 'e.g. INV-, ABC-'}
            />
          )}
        />
      )}

      <Controller
        name="startingInvoiceNumber"
        control={control}
        rules={{
          required: 'Starting Invoice Number is required',
          min: { value: 1, message: 'Must be ≥ 1' },
          validate: (v) => Number.isInteger(Number(v)) || 'Must be a whole number',
        }}
        render={({ field }) => (
          <TextField
            {...field}
            type="number"
            label="Starting Invoice Number"
            required
            disabled={readonly}
            inputProps={{ min: 1, step: 1 }}
            fullWidth
            error={!!errors.startingInvoiceNumber}
            helperText={errors.startingInvoiceNumber?.message ?? 'First invoice will use this number'}
          />
        )}
      />

      <Controller
        name="currency"
        control={control}
        rules={{ required: 'Currency is required' }}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="Currency"
            required
            fullWidth
            disabled={readonly}
            error={!!errors.currency}
            helperText={errors.currency?.message}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <MenuItem key={code} value={code}>
                {code} — {CURRENCY_LABELS[code as Currency]}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      <Controller
        name="chargeGst"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                size="small"
                disabled={readonly}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Charge GST</Typography>
                <Typography variant="caption" color="text.secondary">
                  Enable this only if the invoicing Business is registered for GST.
                </Typography>
              </Box>
            }
          />
        )}
      />

      {chargeGst && (
        <Controller
          name="gstRate"
          control={control}
          rules={{
            required: 'GST Rate is required',
            validate: (v) => {
              const n = Number(v);
              if (v === '' || isNaN(n)) return 'GST Rate is required';
              if (n <= 0) return 'GST Rate must be greater than 0';
              if (n > 100) return 'GST Rate must not exceed 100';
              return true;
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              label="GST Rate"
              required
              fullWidth
              disabled={readonly}
              inputProps={{ min: 0.01, max: 100, step: 0.5 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              error={!!errors.gstRate}
              helperText={errors.gstRate?.message ?? 'Default Australian GST rate is 10%.'}
              placeholder="10"
            />
          )}
        />
      )}
    </Box>
  );
}

// ─── Section 7: Superannuation ────────────────────────────────────────────────

const SUPER_HELP_TOPICS: HelpTopic[] = [
  {
    heading: 'When to enable',
    body: (
      <Typography variant="body2" color="text.secondary">
        Enable this when the Customer pays Superannuation as part of the engagement
        under this contract. The rate and frequency are used for future estimation only.
      </Typography>
    ),
  },
  {
    heading: 'Superannuation Rate',
    body: (
      <Typography variant="body2" color="text.secondary">
        The percentage applied to eligible earnings to estimate the expected
        Superannuation amount. This does not perform the calculation — it only stores
        the configured rate for future use.
      </Typography>
    ),
  },
  {
    heading: 'Payment Frequency',
    body: (
      <Typography variant="body2" color="text.secondary">
        Defines how often the expected Superannuation payment should be tracked.
        This section does not make or reconcile payments yet. That is handled
        by the Payments module.
      </Typography>
    ),
  },
];

function SectionSuperannuation({ control, errors, readonly }: Pick<SectionProps, 'control' | 'errors' | 'readonly'>) {
  const superEnabled = useWatch({ control, name: 'superEnabled' });

  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      <SectionHeader
        title="Superannuation"
        help={<HelpDialog title="Superannuation" topics={SUPER_HELP_TOPICS} />}
      />

      <Controller
        name="superEnabled"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                size="small"
                disabled={readonly}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Receives Superannuation</Typography>
                <Typography variant="caption" color="text.secondary">
                  Enable when the Customer pays Superannuation under this agreement.
                </Typography>
              </Box>
            }
          />
        )}
      />

      {superEnabled && (
        <>
          <Controller
            name="superRate"
            control={control}
            rules={{
              required: 'Superannuation Rate is required',
              validate: (v) => {
                const n = Number(v);
                if (v === '' || isNaN(n)) return 'Superannuation Rate is required';
                if (n <= 0) return 'Rate must be greater than 0';
                if (n > 100) return 'Rate must not exceed 100';
                return true;
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Superannuation Rate"
                required
                fullWidth
                disabled={readonly}
                inputProps={{ min: 0.01, max: 100, step: 0.5 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                error={!!errors.superRate}
                helperText={
                  errors.superRate?.message ??
                  'Percentage used to estimate the Superannuation amount for this Contract.'
                }
                placeholder="12"
              />
            )}
          />

          <Controller
            name="superFrequency"
            control={control}
            rules={{ required: 'Payment Frequency is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Payment Frequency"
                required
                fullWidth
                disabled={readonly}
                error={!!errors.superFrequency}
                helperText={errors.superFrequency?.message ?? 'How often Superannuation is expected to be paid'}
              >
                {(Object.entries(SUPER_PAYMENT_FREQUENCY_LABELS) as [SuperPaymentFrequency, string][]).map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </TextField>
            )}
          />
        </>
      )}
    </Box>
  );
}

// ─── Section 8: Payment Calendar ─────────────────────────────────────────────

function SectionPaymentCalendar({ control, errors, readonly }: Pick<SectionProps, 'control' | 'errors' | 'readonly'>) {
  const payEnabled   = useWatch({ control, name: 'paymentCalendarEnabled' });
  const { field: payCalField } = useController({ control, name: 'paymentCalendarSubscriptionId' });

  const { data: options, isLoading, error } = useCalendarOptions(payEnabled ? 'payments' : null);

  const { data: accounts }    = useAvailableCalendarAccounts();
  const setupPayment          = useSetupPaymentCalendarMutation();
  const pushSnack             = useUIStore((s) => s.pushSnack);
  const [acctDialogOpen, setAcctDialogOpen] = useState(false);

  useEffect(() => {
    if (payEnabled && !payCalField.value && options?.length === 1) {
      payCalField.onChange(options[0].id);
    }
  }, [payEnabled, payCalField.value, options]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!payEnabled && payCalField.value) {
      payCalField.onChange('');
    }
  }, [payEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  async function executePaymentSetup(connectionId: string) {
    try {
      const result = await setupPayment.mutateAsync({ connectionId });
      payCalField.onChange(result.id);
      pushSnack({
        type:    'success',
        message: result.wasExisting
          ? 'Existing calendar selected.'
          : 'Payment calendar created and selected.',
      });
    } catch (err: any) {
      pushSnack({ type: 'error', message: extractApiMessage(err, 'Could not create payment calendar.') });
    }
  }

  function handleCreatePaymentCalendar() {
    const activeAccounts = (accounts ?? []).filter((a) => a.isActive);
    if (activeAccounts.length === 0) {
      pushSnack({ type: 'warning', message: 'Connect a calendar account before creating this calendar.' });
      return;
    }
    if (activeAccounts.length === 1) {
      executePaymentSetup(activeAccounts[0].connectionId);
    } else {
      setAcctDialogOpen(true);
    }
  }

  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      <SectionHeader title="Payment Calendar" />

      <Controller
        name="paymentCalendarEnabled"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                size="small"
                disabled={readonly}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Add expected payments to calendar</Typography>
                <Typography variant="caption" color="text.secondary">
                  Track when invoices are expected to be paid using a calendar integration.
                </Typography>
              </Box>
            }
          />
        )}
      />

      {payEnabled && (
        <>
          {error ? (
            <Alert severity="warning">
              <AlertTitle>Payment calendars unavailable</AlertTitle>
              Calendar integration could not be reached.{' '}
              <Link href="/settings/calendar" underline="hover">Go to Calendar Settings</Link>
            </Alert>
          ) : !isLoading && (options ?? []).length === 0 && !payCalField.value ? (
            <Box>
              <Alert severity="info" sx={{ mb: 1.5 }}>
                No payment calendar configured.
              </Alert>
              {!readonly && (
                <Button
                  variant="outlined"
                  size="small"
                  disabled={setupPayment.isPending}
                  startIcon={
                    setupPayment.isPending
                      ? <CircularProgress size={14} color="inherit" />
                      : undefined
                  }
                  onClick={handleCreatePaymentCalendar}
                >
                  {setupPayment.isPending ? 'Creating…' : 'Create Payment Calendar'}
                </Button>
              )}
            </Box>
          ) : (
            <>
              {payCalField.value && !isLoading && !(options ?? []).find((c) => c.id === payCalField.value) && (
                <Alert severity="warning">
                  The previously selected payment calendar is inactive or was removed.
                  Please select an active calendar, or{' '}
                  <Link href="/settings/calendar" underline="hover">activate it</Link> first.
                </Alert>
              )}
              <Controller
                name="paymentCalendarSubscriptionId"
                control={control}
                rules={{ required: payEnabled ? 'A Payment Calendar is required when enabled' : false }}
                render={({ field }) => (
                  <TextField
                    select
                    label="Payment Calendar"
                    required={payEnabled}
                    fullWidth
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    disabled={isLoading || readonly}
                    error={!!errors.paymentCalendarSubscriptionId}
                    helperText={
                      (errors.paymentCalendarSubscriptionId as any)?.message ??
                      'Expected payment dates will be added to this calendar.'
                    }
                  >
                    <MenuItem value="">Select a payment calendar</MenuItem>
                    {isLoading && <MenuItem value="" disabled>Loading…</MenuItem>}
                    {(options ?? []).map((cal) => (
                      <MenuItem key={cal.id} value={cal.id}>
                        <Box>
                          <Typography variant="body2">{cal.calendarName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cal.providerDisplayName} · {cal.accountIdentifier}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </>
          )}
        </>
      )}

      <AccountSelectionDialog
        open={acctDialogOpen}
        accounts={(accounts ?? []).filter((a) => a.isActive)}
        title="Select Calendar Account"
        onSelect={(connectionId) => {
          setAcctDialogOpen(false);
          executePaymentSetup(connectionId);
        }}
        onClose={() => setAcctDialogOpen(false)}
      />
    </Box>
  );
}

// ─── Full form body ───────────────────────────────────────────────────────────

interface FormBodyProps {
  control:   Control<FormValues>;
  errors:    FieldErrors<FormValues>;
  isEditing: boolean;
  readonly:  boolean;
  customers: { id: string; displayName: string }[];
  status?:   ContractStatus;
}

function FormBody({ control, errors, isEditing, readonly, customers, status }: FormBodyProps) {
  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <SectionGeneral control={control} errors={errors} isEditing={isEditing} readonly={readonly} customers={customers} status={status} />
      <SectionBilling control={control} errors={errors} readonly={readonly} />
      <SectionWorkingRules control={control} errors={errors} readonly={readonly} />
      <SectionRateConfiguration control={control} errors={errors} readonly={readonly} />
      <SectionHolidayRules control={control} errors={errors} readonly={readonly} />
      <SectionInvoiceSettings control={control} errors={errors} readonly={readonly} />
      <SectionSuperannuation control={control} errors={errors} readonly={readonly} />
      <SectionPaymentCalendar control={control} errors={errors} readonly={readonly} />
    </Box>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface ContractFormDrawerProps {
  open:                boolean;
  onClose:             () => void;
  contract?:           Contract | null;
  mode?:               DrawerMode;
  prefilledCustomerId?: string;
}

export function ContractFormDrawer({
  open,
  onClose,
  contract,
  mode = contract ? 'edit' : 'create',
  prefilledCustomerId,
}: ContractFormDrawerProps) {
  const [currentMode, setCurrentMode] = useState<DrawerMode>(mode);
  const [viewAction, setViewAction]   = useState<'cancel' | 'finish' | null>(null);

  const isEditing = currentMode !== 'create';
  const readonly  = currentMode === 'view';

  const createMutation = useCreateContractMutation();
  const updateMutation = useUpdateContractMutation();
  const cancelMutation = useCancelContractMutation();
  const finishMutation = useFinishContractMutation();

  const { data: customersData } = useCustomers({ limit: 200, active: true });
  const customers = customersData?.items ?? [];

  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    defaultValues: { ...DEFAULT_VALUES, customerId: prefilledCustomerId ?? '' },
  });

  // Reset form and mode each time the drawer opens
  useEffect(() => {
    if (open) {
      setCurrentMode(mode);
      setViewAction(null);
      reset(
        contract
          ? contractToFormValues(contract)
          : { ...DEFAULT_VALUES, customerId: prefilledCustomerId ?? '' },
      );
    }
  }, [open, contract, mode, prefilledCustomerId, reset]);

  const isSavePending   = createMutation.isPending || updateMutation.isPending;
  const isActionPending = cancelMutation.isPending  || finishMutation.isPending;

  // ── Lifecycle handlers (view mode) ─────────────────────────────────────────

  const handleViewAction = async () => {
    if (!viewAction || !contract) return;
    if (viewAction === 'cancel') await cancelMutation.mutateAsync(contract.id);
    if (viewAction === 'finish') await finishMutation.mutateAsync(contract.id);
    setViewAction(null);
    onClose();
  };

  // ── Save handler (create / edit mode) ──────────────────────────────────────

  const onSubmit = handleSubmit(async (values) => {
    const rates = values.rates.map((r) => ({
      days:       r.days,
      startTime:  r.startTime || null,
      endTime:    r.endTime   || null,
      hourlyRate: Number(r.hourlyRate),
    }));

    const behaviour = values.holidayEnabled ? values.holidayBehaviour : null;
    const holidayRules: HolidayRules = {
      enabled:              values.holidayEnabled,
      calendarId:           values.holidayEnabled ? (values.holidayCalendarId || null) : null,
      calendarName:         values.holidayEnabled ? (values.holidayCalendarName || null) : null,
      calendarProviderName: values.holidayEnabled ? (values.holidayCalendarProvider || null) : null,
      behaviour,
      multiplier: behaviour === 'multiplier' && values.holidayMultiplier !== ''
        ? Number(values.holidayMultiplier) : null,
      fixedHourlyRate: behaviour === 'fixed_rate' && values.holidayFixedRate !== ''
        ? Number(values.holidayFixedRate) : null,
    };

    const superannuationRules: SuperannuationRules = values.superEnabled
      ? {
          enabled:          true,
          rate:             values.superRate !== '' ? Number(values.superRate) : null,
          paymentFrequency: (values.superFrequency as SuperPaymentFrequency) || null,
        }
      : { enabled: false, rate: null, paymentFrequency: null };

    const scheduledPaymentDay = values.scheduledPaymentEnabled && values.scheduledPaymentDay
      ? (values.scheduledPaymentDay as ScheduledPaymentDay)
      : null;
    const paymentTermsDaysValue: number | null = values.scheduledPaymentEnabled
      ? null
      : Number(values.paymentTermsDays);

    const invoicePrefix = values.invoiceUsePrefix && values.invoicePrefix.trim()
      ? values.invoicePrefix.trim()
      : null;
    const gstRate = values.chargeGst && values.gstRate !== ''
      ? Number(values.gstRate) : null;

    if (isEditing && contract) {
      const payload: UpdateContractPayload = {
        startDate:             values.startDate || undefined,
        endDate:               values.hasEndDate ? (values.endDate || undefined) : null,
        positionName:          values.positionName,
        workType:              values.workType,
        invoiceDescription:    values.invoiceDescription,
        billingCycle:                values.billingCycle,
        invoiceDueRule:              values.invoiceDueRule as 'from_invoice_date' | 'end_of_week' | 'end_of_month',
        paymentTermsDays:            paymentTermsDaysValue,
        scheduledPaymentEnabled:     values.scheduledPaymentEnabled,
        scheduledPaymentDay,
        rateType:              values.rateType,
        minimumHours:          Number(values.minimumHours),
        defaultBreakMinutes:   Number(values.defaultBreakMinutes),
        rates,
        notes:                 values.notes || undefined,
        useInvoicePrefix:      values.invoiceUsePrefix,
        invoicePrefix,
        startingInvoiceNumber: Number(values.startingInvoiceNumber),
        currency:              values.currency,
        chargeGst:             values.chargeGst,
        gstRate,
        holidayRules,
        superannuationRules,
        paymentCalendarEnabled: values.paymentCalendarEnabled,
        paymentCalendarSubscriptionId: values.paymentCalendarEnabled
          ? (values.paymentCalendarSubscriptionId || null)
          : null,
      };
      await updateMutation.mutateAsync({ id: contract.id, ...payload });
    } else {
      const payload: CreateContractPayload = {
        customerId:            values.customerId,
        startDate:             values.startDate,
        ...(values.hasEndDate && values.endDate ? { endDate: values.endDate } : {}),
        positionName:          values.positionName,
        workType:              values.workType,
        invoiceDescription:    values.invoiceDescription,
        billingCycle:                values.billingCycle,
        invoiceDueRule:              values.invoiceDueRule as 'from_invoice_date' | 'end_of_week' | 'end_of_month',
        paymentTermsDays:            paymentTermsDaysValue,
        scheduledPaymentEnabled:     values.scheduledPaymentEnabled,
        scheduledPaymentDay,
        rateType:              values.rateType,
        minimumHours:          Number(values.minimumHours),
        defaultBreakMinutes:   Number(values.defaultBreakMinutes),
        rates,
        ...(values.notes && { notes: values.notes }),
        useInvoicePrefix:      values.invoiceUsePrefix,
        invoicePrefix,
        startingInvoiceNumber: Number(values.startingInvoiceNumber),
        currency:              values.currency,
        chargeGst:             values.chargeGst,
        gstRate,
        holidayRules,
        superannuationRules,
        paymentCalendarEnabled: values.paymentCalendarEnabled,
        paymentCalendarSubscriptionId: values.paymentCalendarEnabled
          ? (values.paymentCalendarSubscriptionId || null)
          : null,
      };
      await createMutation.mutateAsync(payload);
    }

    onClose();
  });

  // ── Drawer title ────────────────────────────────────────────────────────────

  const title =
    currentMode === 'create' ? 'New Contract'
    : currentMode === 'view' ? `${contract?.positionName ?? 'Contract'}`
    : `Edit — ${contract?.positionName}`;

  // ── Drawer actions ──────────────────────────────────────────────────────────

  const isActive    = contract?.status === 'active';
  const isTerminal  = contract?.status === 'finished' || contract?.status === 'cancelled';

  const actions =
    currentMode === 'view' ? (
      <>
        {isActive && (
          <>
            <Button
              variant="outlined"
              color="error"
              size="small"
              disabled={isActionPending}
              onClick={() => setViewAction('cancel')}
            >
              Cancel Contract
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              disabled={isActionPending}
              onClick={() => setViewAction('finish')}
            >
              Mark Finished
            </Button>
          </>
        )}
        {!isTerminal && (
          <Button
            variant="contained"
            size="small"
            startIcon={<EditOutlinedIcon />}
            onClick={() => setCurrentMode('edit')}
          >
            Edit
          </Button>
        )}
        {isTerminal && (
          <Button variant="outlined" onClick={onClose}>Close</Button>
        )}
      </>
    ) : (
      <>
        <Button variant="outlined" onClick={onClose} disabled={isSavePending}>Cancel</Button>
        <LoadingButton variant="contained" loading={isSavePending} onClick={onSubmit}>
          {currentMode === 'create' ? 'Create Contract' : 'Save Changes'}
        </LoadingButton>
      </>
    );

  return (
    <>
      <FormDrawer
        open={open}
        onClose={onClose}
        title={title}
        width={560}
        actions={actions}
      >
        <FormBody
          control={control}
          errors={errors}
          isEditing={isEditing}
          readonly={readonly}
          customers={customers}
          status={contract?.status}
        />
      </FormDrawer>

      {/* Lifecycle confirmation dialogs (view mode) */}
      <ConfirmDialog
        open={viewAction === 'cancel'}
        title="Cancel contract?"
        description={`"${contract?.positionName}" will be cancelled. This cannot be undone.`}
        confirmLabel="Cancel Contract"
        onConfirm={handleViewAction}
        onCancel={() => setViewAction(null)}
        loading={cancelMutation.isPending}
        danger
      />
      <ConfirmDialog
        open={viewAction === 'finish'}
        title="Mark as finished?"
        description={`"${contract?.positionName}" will be marked as finished. This cannot be undone.`}
        confirmLabel="Mark Finished"
        onConfirm={handleViewAction}
        onCancel={() => setViewAction(null)}
        loading={finishMutation.isPending}
      />
    </>
  );
}
