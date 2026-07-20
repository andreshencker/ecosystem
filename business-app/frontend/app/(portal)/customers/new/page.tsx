'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageHeader } from '@/components/layout';
import { LoadingButton } from '@/components/shared';
import { useCreateCustomerMutation } from '@/hooks/api/useCustomers';
import type { CreateCustomerPayload, CustomerType, LocationPayload } from '@/types/customer';
import {
  CustomerLocationsFieldArray,
  type LocationFormRow,
} from '../components/CustomerLocationsFieldArray';

interface FormValues {
  type:      CustomerType;
  displayName: string;
  abn:       string;
  notes:     string;
  locations: LocationFormRow[];
}

function formRowsToLocations(rows: LocationFormRow[]): LocationPayload[] {
  return rows.map((r) => ({
    tag:        r.tag.trim(),
    country:    r.country.trim(),
    line1:      r.line1.trim(),
    line2:      r.line2.trim()  || undefined,
    city:       r.city.trim(),
    postalCode: r.postalCode.trim(),
    state:      r.state.trim() || undefined,
  }));
}

export default function NewCustomerPage() {
  const router = useRouter();
  const createMutation = useCreateCustomerMutation();

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      type:        'company',
      displayName: '',
      abn:         '',
      notes:       '',
      locations:   [],
    },
  });

  const onSubmit = async (values: FormValues) => {
    const payload: CreateCustomerPayload = {
      type:        values.type,
      displayName: values.displayName,
      ...(values.abn   && { abn:   values.abn }),
      ...(values.notes && { notes: values.notes }),
      locations: formRowsToLocations(values.locations),
    };
    const customer = await createMutation.mutateAsync(payload);
    router.push(`/customers/${customer.id}`);
  };

  return (
    <Box>
      <PageHeader
        title="New Customer"
        subtitle="Create a new customer for your business."
        actions={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push('/customers')}>
            Back
          </Button>
        }
      />

      <Card variant="outlined" sx={{ maxWidth: 640 }}>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Box display="flex" flexDirection="column" gap={3}>

              {/* ── Customer type ────────────────────────────────────── */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>Customer type</Typography>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup row {...field}>
                      <FormControlLabel value="company"    control={<Radio />} label="Company" />
                      <FormControlLabel value="individual" control={<Radio />} label="Individual" />
                    </RadioGroup>
                  )}
                />
              </Box>

              <Divider />

              {/* ── Core fields ──────────────────────────────────────── */}
              <Controller
                name="displayName"
                control={control}
                rules={{ required: 'Name is required', maxLength: { value: 200, message: 'Max 200 characters' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Name"
                    required
                    fullWidth
                    error={!!errors.displayName}
                    helperText={errors.displayName?.message ?? 'Company name or full name'}
                  />
                )}
              />

              <Controller
                name="abn"
                control={control}
                rules={{ pattern: { value: /^\d{11}$/, message: 'ABN must be exactly 11 digits' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="ABN"
                    fullWidth
                    error={!!errors.abn}
                    helperText={errors.abn?.message ?? 'Australian Business Number (11 digits)'}
                    inputProps={{ maxLength: 11 }}
                  />
                )}
              />

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
                    minRows={3}
                    error={!!errors.notes}
                    helperText={errors.notes?.message ?? 'Internal notes (not visible to customer)'}
                  />
                )}
              />

              <Divider />

              {/* ── Customer Locations ────────────────────────────────── */}
              <CustomerLocationsFieldArray control={control as any} errors={errors as any} />

              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => router.push('/customers')}>Cancel</Button>
                <LoadingButton type="submit" variant="contained" loading={createMutation.isPending}>
                  Create Customer
                </LoadingButton>
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
