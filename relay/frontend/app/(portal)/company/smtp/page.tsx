'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RouterOutlinedIcon from '@mui/icons-material/RouterOutlined';
import { PageHeader } from '@/components/layout';
import { PermissionGuard } from '@/components/shared';
import {
  useCompanySmtp,
  useUpdateSmtpMutation,
  useTestSmtpMutation,
  type UpdateSmtpDto,
} from '@/hooks/api/useCompany';
import { usePermissions } from '@/hooks/usePermissions';

const schema = z.object({
  fromEmail: z.string().email('Valid email required').optional().or(z.literal('')),
  fromName: z.string().max(100).optional(),
  host: z.string().max(253).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
  secure: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CompanySmtpPage() {
  const { canManageCredentials } = usePermissions();
  const { data: smtp, isLoading } = useCompanySmtp();
  const updateMutation = useUpdateSmtpMutation();
  const testMutation = useTestSmtpMutation();
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      fromEmail: smtp?.fromEmail ?? '',
      fromName: smtp?.fromName ?? '',
      host: '',
      port: undefined,
      user: '',
      pass: '',
      secure: false,
    },
  });

  async function onSubmit(values: FormValues) {
    const dto: UpdateSmtpDto = {};
    if (values.fromEmail !== undefined) dto.fromEmail = values.fromEmail;
    if (values.fromName !== undefined) dto.fromName = values.fromName;
    if (values.host) dto.host = values.host;
    if (values.port) dto.port = values.port;
    if (values.user) dto.user = values.user;
    if (values.pass) dto.pass = values.pass;
    if (values.secure !== undefined) dto.secure = values.secure;
    await updateMutation.mutateAsync(dto);
    setTestResult(null);
  }

  async function handleTest() {
    const result = await testMutation.mutateAsync();
    setTestResult(result);
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="Company SMTP" />

      <Stack spacing={3} maxWidth={640}>
        {/* Status card */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <RouterOutlinedIcon color="action" />
              <Box flex={1}>
                <Typography variant="subtitle2">SMTP Configuration</Typography>
                <Typography variant="body2" color="text.secondary">
                  Used to send invitation emails from your company&apos;s email address.
                </Typography>
              </Box>
              {smtp?.hasCredentials ? (
                <Chip
                  icon={<CheckCircleOutlineIcon />}
                  label={smtp.verifiedAt ? 'Verified' : 'Configured'}
                  color={smtp.verifiedAt ? 'success' : 'warning'}
                  size="small"
                />
              ) : (
                <Chip label="Not configured" size="small" variant="outlined" />
              )}
            </Stack>
          </CardContent>
        </Card>

        {testResult && (
          <Alert severity={testResult.ok ? 'success' : 'error'}>
            {testResult.message}
          </Alert>
        )}

        <Card variant="outlined">
          <CardHeader title="Email Settings" subheader="Displayed sender information" />
          <Divider />
          <CardContent>
            <PermissionGuard allowed={canManageCredentials}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2.5}>
                  <Controller
                    name="fromEmail"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="From Email"
                        placeholder="noreply@yourcompany.com"
                        fullWidth
                        error={!!errors.fromEmail}
                        helperText={errors.fromEmail?.message}
                      />
                    )}
                  />
                  <Controller
                    name="fromName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="From Name"
                        placeholder="Your Company"
                        fullWidth
                        error={!!errors.fromName}
                        helperText={errors.fromName?.message}
                      />
                    )}
                  />

                  <Divider />
                  <Typography variant="subtitle2" color="text.secondary">
                    SMTP Credentials (leave blank to keep existing)
                  </Typography>

                  <Controller
                    name="host"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="SMTP Host"
                        placeholder="smtp.yourprovider.com"
                        fullWidth
                        error={!!errors.host}
                        helperText={errors.host?.message}
                      />
                    )}
                  />
                  <Stack direction="row" spacing={2}>
                    <Controller
                      name="port"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          value={field.value ?? ''}
                          label="Port"
                          placeholder="587"
                          type="number"
                          sx={{ width: 120 }}
                          error={!!errors.port}
                          helperText={errors.port?.message}
                        />
                      )}
                    />
                    <Controller
                      name="secure"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value ?? false}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label="SSL/TLS"
                          sx={{ mt: 1 }}
                        />
                      )}
                    />
                  </Stack>
                  <Controller
                    name="user"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Username"
                        autoComplete="off"
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="pass"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Password"
                        type="password"
                        autoComplete="new-password"
                        fullWidth
                        helperText="Leave blank to keep existing password"
                      />
                    )}
                  />

                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    {smtp?.hasCredentials && (
                      <Button
                        variant="outlined"
                        onClick={handleTest}
                        disabled={testMutation.isPending || isDirty}
                        startIcon={testMutation.isPending ? <CircularProgress size={16} /> : null}
                      >
                        {testMutation.isPending ? 'Testing…' : 'Test Connection'}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={updateMutation.isPending}
                      startIcon={updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                      {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </PermissionGuard>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
