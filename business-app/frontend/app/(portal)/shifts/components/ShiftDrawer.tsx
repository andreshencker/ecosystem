'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import { ConfirmDialog, FormDrawer, LoadingButton } from '@/components/shared';
import {
  useShift,
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useConfirmShiftMutation,
  useCancelShiftMutation,
  useDeleteShiftMutation,
  useAssignContractMutation,
} from '@/hooks/api/useShifts';
import { useContracts } from '@/hooks/api/useContracts';
import { useCalendarOptions } from '@/hooks/api/useLinkedCalendars';
import { formatContractLabel, formatContractSecondary } from '@/lib/formatContract';
import { formatShiftDate, formatShiftTime, formatShiftDateTime } from '@/lib/formatShift';
import type { Shift, ContractSummary, CreateShiftPayload, UpdateShiftPayload } from '@/types/shift';
import { STATUS_LABELS } from '@/types/shift';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrawerMode = 'create' | 'view' | 'edit';

export interface ShiftDrawerProps {
  open: boolean;
  onClose: () => void;
  mode: DrawerMode;
  /** Pass the list-row shift for view/edit (detail is fetched inside the drawer). */
  shift?: Shift | null;
  /** Pre-fill the contract selector when opening in create mode. */
  defaultContractId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'success' | 'error'> = {
  draft:     'default',
  confirmed: 'success',
  cancelled: 'error',
};

interface FormValues {
  contractId:       string;
  linkedCalendarId: string;
  title:            string;
  date:             string;
  startTime:        string;
  endTime:          string;
  breakTaken:       boolean;
  location:         string;
  notes:            string;
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={1} py={0.75}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box flex={1}>
        {value ?? <Typography variant="body2" color="text.disabled">—</Typography>}
      </Box>
    </Box>
  );
}

// ─── View content ─────────────────────────────────────────────────────────────

function ViewContent({
  shift,
  onEdit,
  onConfirm,
  onCancel,
  onDelete,
  onAssignContract,
}: {
  shift: Shift;
  onEdit: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onAssignContract: () => void;
}) {
  const canEdit           = shift.status !== 'cancelled';
  const canConfirm        = shift.status === 'draft';
  const canCancel         = shift.status !== 'cancelled';
  const canDelete         = shift.status === 'draft';
  const needsAssignment   = shift.createdFromCalendar && !shift.contractAssigned && shift.status !== 'cancelled';

  return (
    <>
      {/* Identity */}
      <Box mb={2.5}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
          STATUS
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <DetailRow
          label="Status"
          value={
            <Chip
              label={STATUS_LABELS[shift.status]}
              size="small"
              color={STATUS_COLORS[shift.status] ?? 'default'}
              variant="outlined"
            />
          }
        />
        {shift.createdFromCalendar && (
          <DetailRow
            label="Source"
            value={
              <Tooltip title={`${shift.calendarAccount ?? ''} · ${shift.calendarName ?? 'Calendar'}`}>
                <Chip
                  icon={<CalendarMonthOutlinedIcon />}
                  label={shift.calendarName ?? 'Calendar'}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Tooltip>
            }
          />
        )}
      </Box>

      {/* Contract */}
      <Box mb={2.5}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
          CONTRACT
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        {shift.contract ? (
          <>
            <DetailRow label="Customer"  value={shift.contract.customerName ?? '—'} />
            <DetailRow label="Position"  value={shift.contract.positionName} />
          </>
        ) : shift.createdFromCalendar && !shift.contractAssigned ? (
          <DetailRow
            label="Contract"
            value={<Chip label="Pending contract" size="small" color="warning" variant="filled" />}
          />
        ) : (
          <DetailRow label="Contract" value={undefined} />
        )}
      </Box>

      {/* Schedule */}
      <Box mb={2.5}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
          SCHEDULE
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        {shift.allDay ? (
          <>
            <DetailRow label="Date"  value={formatShiftDate(shift.date)} />
            <DetailRow label="Time"  value="All day" />
          </>
        ) : (
          <>
            <DetailRow label="Date"       value={formatShiftDate(shift.date)} />
            <DetailRow label="Start Time" value={formatShiftTime(shift.startTime)} />
            {shift.endDate && shift.endDate !== shift.date && (
              <DetailRow label="End Date"  value={formatShiftDate(shift.endDate)} />
            )}
            <DetailRow label="End Time"   value={formatShiftTime(shift.endTime)} />
          </>
        )}
        <DetailRow
          label="Break taken"
          value={shift.breakTaken ? 'Yes' : 'No'}
        />
        {shift.timezone && (
          <DetailRow label="Timezone" value={shift.timezone} />
        )}
      </Box>

      {/* Details */}
      {(shift.title || shift.location || shift.notes) && (
        <Box mb={2.5}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
            DETAILS
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {shift.title    && <DetailRow label="Title"    value={shift.title} />}
          {shift.location && <DetailRow label="Location" value={shift.location} />}
          {shift.notes    && (
            <DetailRow
              label="Notes"
              value={
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {shift.notes}
                </Typography>
              }
            />
          )}
        </Box>
      )}

      {/* Actions */}
      <Box mt={3} display="flex" flexWrap="wrap" gap={1}>
        {needsAssignment && (
          <Button
            variant="contained"
            size="small"
            color="warning"
            startIcon={<AssignmentOutlinedIcon />}
            onClick={onAssignContract}
          >
            Assign Contract
          </Button>
        )}
        {canEdit && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditOutlinedIcon />}
            onClick={onEdit}
          >
            Edit
          </Button>
        )}
        {canConfirm && (
          <Button
            variant="contained"
            size="small"
            color="success"
            startIcon={<CheckCircleOutlinedIcon />}
            onClick={onConfirm}
          >
            Confirm
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<CancelOutlinedIcon />}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={onDelete}
          >
            Delete
          </Button>
        )}
      </Box>
    </>
  );
}

// ─── Form content (create / edit) ─────────────────────────────────────────────

function ShiftForm({
  mode,
  shift,
  defaultContractId,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  shift?: Shift | null;
  defaultContractId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const createMutation = useCreateShiftMutation();
  const updateMutation = useUpdateShiftMutation();
  const { data: contractsData } = useContracts({ limit: 200, status: 'active' });
  const contracts = contractsData?.items ?? [];
  const { data: shiftCalendars } = useCalendarOptions('shifts');
  const calendarOptions = shiftCalendars ?? [];

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      contractId:       defaultContractId ?? '',
      linkedCalendarId: '',
      title:            '',
      date:             '',
      startTime:        '',
      endTime:          '',
      breakTaken:       false,
      location:         '',
      notes:            '',
    },
  });

  useEffect(() => {
    if (mode === 'edit' && shift) {
      reset({
        contractId:       shift.contractId ?? '',
        linkedCalendarId: shift.linkedCalendarId ?? '',
        title:            shift.title ?? '',
        date:             shift.date,
        startTime:        shift.startTime,
        endTime:          shift.endTime,
        breakTaken:       shift.breakTaken ?? false,
        location:         shift.location ?? '',
        notes:            shift.notes    ?? '',
      });
    } else if (mode === 'create') {
      reset({
        contractId:       defaultContractId ?? '',
        linkedCalendarId: '',
        title:            '',
        date:             '',
        startTime:        '',
        endTime:          '',
        breakTaken:       false,
        location:         '',
        notes:            '',
      });
    }
  }, [mode, shift, defaultContractId, reset]);

  const onSubmit = async (values: FormValues) => {
    if (mode === 'create') {
      const payload: CreateShiftPayload = {
        contractId: values.contractId,
        date:       values.date,
        startTime:  values.startTime,
        endTime:    values.endTime,
        breakTaken: values.breakTaken,
        ...(values.linkedCalendarId ? { linkedCalendarId: values.linkedCalendarId } : {}),
        ...(values.title            ? { title:            values.title.trim() }     : {}),
        ...(values.location         ? { location:         values.location }         : {}),
        ...(values.notes            ? { notes:            values.notes }            : {}),
      };
      await createMutation.mutateAsync(payload);
    } else {
      const payload: UpdateShiftPayload = {
        ...(values.contractId ? { contractId: values.contractId } : {}),
        date:      values.date      || undefined,
        startTime: values.startTime || undefined,
        endTime:   values.endTime   || undefined,
        breakTaken: values.breakTaken,
        location:  values.location  || null,
        notes:     values.notes     || null,
      };
      await updateMutation.mutateAsync({ id: shift!.id, ...payload });
    }
    onSaved();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Box display="flex" flexDirection="column" gap={3}>

        {/* Contract selector — create (required) and edit (optional change) */}
        <Controller
          name="contractId"
          control={control}
          rules={mode === 'create' ? { required: 'Contract is required' } : {}}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Contract"
              required={mode === 'create'}
              fullWidth
              error={!!errors.contractId}
              helperText={errors.contractId?.message}
              SelectProps={{
                renderValue: (val: unknown) => {
                  if (!val) return mode === 'create' ? 'Select a contract' : 'No contract selected';
                  const fromList = contracts.find((x) => x.id === val);
                  if (fromList) return formatContractLabel(fromList);
                  // Current shift may have an inactive contract not in the active list
                  if (shift?.contract && shift.contract.id === val) {
                    return formatContractLabel(shift.contract as Pick<typeof shift.contract, 'customerName' | 'positionName'>);
                  }
                  return 'Select a contract';
                },
              }}
            >
              {mode === 'create' && <MenuItem value="" disabled>Select a contract</MenuItem>}
              {contracts.map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ py: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {formatContractLabel(c)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatContractSecondary(c)}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        {/* Shift calendar (optional, create only) — only shows if shift-flow calendars exist */}
        {mode === 'create' && calendarOptions.length > 0 && (
          <Controller
            name="linkedCalendarId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Shift Calendar (optional)"
                fullWidth
                helperText="Select to create a corresponding event in your calendar"
              >
                <MenuItem value="">None — manual shift only</MenuItem>
                {calendarOptions.map((cal) => (
                  <MenuItem key={cal.id} value={cal.id}>
                    {cal.calendarName} · {cal.accountIdentifier}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        )}

        <Divider />

        {/* Date */}
        <Controller
          name="date"
          control={control}
          rules={{ required: 'Date is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              type="date"
              label="Shift Date"
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!errors.date}
              helperText={errors.date?.message}
            />
          )}
        />

        {/* Times + Break */}
        <Box display="flex" gap={2} flexWrap="wrap">
          <Controller
            name="startTime"
            control={control}
            rules={{ required: 'Start time is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                type="time"
                label="Start Time"
                required
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: 130 }}
                error={!!errors.startTime}
                helperText={errors.startTime?.message}
              />
            )}
          />
          <Controller
            name="endTime"
            control={control}
            rules={{ required: 'End time is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                type="time"
                label="End Time"
                required
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: 130 }}
                error={!!errors.endTime}
                helperText={errors.endTime?.message}
              />
            )}
          />
          <Controller
            name="breakTaken"
            control={control}
            render={({ field }) => (
              <Box sx={{ flex: 1, minWidth: 110, display: 'flex', alignItems: 'center', pt: 0.5 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Break taken</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Duration defined by contract
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            )}
          />
        </Box>

        <Divider />

        {/* Title */}
        <Controller
          name="title"
          control={control}
          rules={{ maxLength: { value: 200, message: 'Max 200 chars' } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Title"
              fullWidth
              error={!!errors.title}
              helperText={errors.title?.message ?? 'Shown as the calendar event title. Defaults to the contract name.'}
            />
          )}
        />

        {/* Location */}
        <Controller
          name="location"
          control={control}
          rules={{ maxLength: { value: 500, message: 'Max 500 chars' } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Location"
              fullWidth
              error={!!errors.location}
              helperText={errors.location?.message ?? 'Optional'}
            />
          )}
        />

        {/* Notes */}
        <Controller
          name="notes"
          control={control}
          rules={{ maxLength: { value: 2000, message: 'Max 2000 characters' } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Notes"
              fullWidth
              multiline
              minRows={2}
              error={!!errors.notes}
              helperText={errors.notes?.message ?? 'Internal notes'}
            />
          )}
        />

        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <LoadingButton type="submit" variant="contained" loading={isPending}>
            {mode === 'create' ? 'Create Shift' : 'Save Changes'}
          </LoadingButton>
        </Box>
      </Box>
    </form>
  );
}

// ─── Assign contract panel (inline) ──────────────────────────────────────────

function AssignContractPanel({
  shiftId,
  onDone,
  onCancel,
}: {
  shiftId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [selectedContractId, setSelectedContractId] = useState('');
  const assignMutation = useAssignContractMutation();
  const { data: contractsData } = useContracts({ limit: 200, status: 'active' });
  const contracts = contractsData?.items ?? [];

  async function handleAssign() {
    if (!selectedContractId) return;
    await assignMutation.mutateAsync({ id: shiftId, contractId: selectedContractId });
    onDone();
  }

  return (
    <Box mt={3} p={2} sx={{ border: '1px solid', borderColor: 'warning.main', borderRadius: 1, bgcolor: 'warning.50' }}>
      <Typography variant="subtitle2" color="warning.dark" gutterBottom>
        Assign Contract
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Select a Contract to link this imported Shift.
      </Typography>
      <TextField
        select
        label="Contract"
        value={selectedContractId}
        onChange={(e) => setSelectedContractId(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
        SelectProps={{
          renderValue: (val: unknown) => {
            const c = contracts.find((x) => x.id === val);
            return c ? formatContractLabel(c) : 'Select a contract';
          },
        }}
      >
        <MenuItem value="" disabled>Select a contract</MenuItem>
        {contracts.map((c) => (
          <MenuItem key={c.id} value={c.id} sx={{ py: 1 }}>
            <Box>
              <Typography variant="body2" fontWeight={500} noWrap>
                {formatContractLabel(c)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {formatContractSecondary(c)}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </TextField>
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button size="small" variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
        <LoadingButton
          size="small"
          variant="contained"
          color="warning"
          loading={assignMutation.isPending}
          onClick={handleAssign}
          disabled={!selectedContractId}
        >
          Confirm Assignment
        </LoadingButton>
      </Box>
    </Box>
  );
}

// ─── ShiftDrawer ──────────────────────────────────────────────────────────────

export function ShiftDrawer({
  open,
  onClose,
  mode: initialMode,
  shift: listShift,
  defaultContractId,
}: ShiftDrawerProps) {
  const [mode, setMode]                       = useState<DrawerMode>(initialMode);
  const [confirmAction, setConfirmAction]     = useState<null | 'confirm' | 'cancel' | 'delete'>(null);
  const [assigningContract, setAssigningContract] = useState(false);

  const confirmMutation = useConfirmShiftMutation();
  const cancelMutation  = useCancelShiftMutation();
  const deleteMutation  = useDeleteShiftMutation();

  // Fetch full shift detail when viewing/editing an existing shift
  const { data: fetchedShift, isLoading: detailLoading } = useShift(
    listShift?.id ?? '',
    { enabled: open && !!listShift?.id && initialMode !== 'create' },
  );
  const shift = fetchedShift ?? listShift;

  // Sync drawer mode when the prop changes (e.g. opening in different modes)
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setAssigningContract(false);
    }
  }, [open, initialMode]);

  // Close and reset when drawer closes
  function handleClose() {
    setConfirmAction(null);
    setAssigningContract(false);
    onClose();
  }

  // After save: close drawer (list refetch is handled by the mutation)
  function handleSaved() {
    handleClose();
  }

  // After a lifecycle action: close drawer (query invalidation handles list update)
  async function handleLifecycleAction() {
    if (!confirmAction || !shift) return;
    if (confirmAction === 'confirm') await confirmMutation.mutateAsync(shift.id);
    if (confirmAction === 'cancel')  await cancelMutation.mutateAsync(shift.id);
    if (confirmAction === 'delete')  await deleteMutation.mutateAsync(shift.id);
    setConfirmAction(null);
    handleClose();
  }

  const drawerTitle =
    mode === 'create' ? 'New Shift' :
    mode === 'edit'   ? 'Edit Shift' :
    shift ? `Shift — ${formatShiftDate(shift.date)}` : 'Shift';

  const actionLabels: Record<string, string> = {
    confirm: 'Confirm this shift?',
    cancel:  'Cancel this shift?',
    delete:  'Delete this shift?',
  };
  const deleteDescription = shift?.linkedCalendarId
    ? `Delete this Shift? The corresponding event will also be deleted from the connected calendar.`
    : `Delete this Shift? This will permanently remove it from Business App.`;
  const shiftDateLabel = shift ? formatShiftDate(shift.date) : '';
  const shiftTimeLabel = shift
    ? formatShiftDateTime(shift.date, shift.startTime, shift.endDate, shift.endTime, shift.allDay)
    : '';
  const actionDescriptions: Record<string, string> = {
    confirm: shift ? `${shiftTimeLabel} will be confirmed.` : '',
    cancel:  shift ? `Shift on ${shiftDateLabel} will be cancelled.` : '',
    delete:  deleteDescription,
  };

  const lifecyclePending =
    confirmMutation.isPending ||
    cancelMutation.isPending  ||
    deleteMutation.isPending;

  return (
    <>
      <FormDrawer
        open={open}
        onClose={handleClose}
        title={drawerTitle}
        width={500}
      >
        {mode === 'create' || mode === 'edit' ? (
          <ShiftForm
            mode={mode}
            shift={listShift}
            defaultContractId={defaultContractId}
            onClose={handleClose}
            onSaved={handleSaved}
          />
        ) : detailLoading ? (
          <Box>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="text" height={32} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : shift ? (
          <>
            <ViewContent
              shift={shift}
              onEdit={() => setMode('edit')}
              onConfirm={() => setConfirmAction('confirm')}
              onCancel={() => setConfirmAction('cancel')}
              onDelete={() => setConfirmAction('delete')}
              onAssignContract={() => setAssigningContract(true)}
            />
            {assigningContract && (
              <AssignContractPanel
                shiftId={shift.id}
                onDone={() => { setAssigningContract(false); handleClose(); }}
                onCancel={() => setAssigningContract(false)}
              />
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Shift not found.
          </Typography>
        )}
      </FormDrawer>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction ? actionLabels[confirmAction] : ''}
        description={confirmAction ? actionDescriptions[confirmAction] : ''}
        confirmLabel={confirmAction === 'delete' ? 'Delete' : 'Confirm'}
        onConfirm={handleLifecycleAction}
        onCancel={() => setConfirmAction(null)}
        loading={lifecyclePending}
        danger={confirmAction === 'cancel' || confirmAction === 'delete'}
      />
    </>
  );
}
