'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { PageHeader } from '@/components/layout';
import { useAuthStore } from '@/stores/auth.store';
import { useUpdateMeMutation, useChangePasswordMutation } from '@/hooks/api/useUsers';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const optUrl = z.string().url('Must be a valid URL').max(500).optional().or(z.literal(''));

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName:  z.string().min(1, 'Required').max(100),
  avatarUrl: optUrl,
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword:     z.string().min(8, 'At least 8 characters').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  business_owner: 'Owner',
  business_admin: 'Admin',
  accountant:     'Accountant',
  staff:          'Staff',
  viewer:         'Viewer',
};

function getInitials(firstName?: string, lastName?: string): string {
  const f = (firstName ?? '').charAt(0).toUpperCase();
  const l = (lastName  ?? '').charAt(0).toUpperCase();
  return f + l || '?';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  const updateMeMutation       = useUpdateMeMutation();
  const changePasswordMutation = useChangePasswordMutation();

  const [passwordError,   setPasswordError]   = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [avatarMode,      setAvatarMode]      = useState<'url' | 'file'>('url');

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onProfileSubmit(values: ProfileValues) {
    await updateMeMutation.mutateAsync({
      firstName: values.firstName,
      lastName:  values.lastName,
      avatarUrl: values.avatarUrl || null,
    });
    setAvatarMode('url');
  }

  async function onPasswordSubmit(values: PasswordValues) {
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword:     values.newPassword,
      });
      passwordForm.reset();
      setPasswordSuccess(true);
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : 'Failed to change password');
    }
  }

  const previewAvatarUrl = profileForm.watch('avatarUrl') || user?.avatarUrl || undefined;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || '';

  return (
    <Box>
      <PageHeader title="Profile" />

      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          pb: 4,
        }}
      >
        <Stack spacing={3}>

          {/* ── Avatar ─────────────────────────────────────────────────────── */}
          <Card variant="outlined">
            <CardHeader
              avatar={<PersonOutlinedIcon color="action" />}
              title={<Typography variant="subtitle1" fontWeight={600}>Profile Picture</Typography>}
              sx={{ pb: 1 }}
            />
            <Divider />
            <CardContent>
              <Grid container spacing={3} alignItems="flex-start">

                {/* Preview */}
                <Grid item xs={12} sm="auto">
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} sx={{ minWidth: 120 }}>
                    <Avatar
                      src={previewAvatarUrl}
                      alt={displayName}
                      sx={{ width: 96, height: 96, fontSize: 36, bgcolor: 'primary.main' }}
                    >
                      {!previewAvatarUrl && getInitials(user?.firstName, user?.lastName)}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ maxWidth: 110 }}>
                      {displayName}
                    </Typography>
                  </Box>
                </Grid>

                {/* Input */}
                <Grid item xs={12} sm>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                    <Stack spacing={2}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                          Avatar source
                        </Typography>
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={avatarMode}
                          onChange={(_e, val) => val && setAvatarMode(val)}
                          sx={{ height: 28 }}
                        >
                          <ToggleButton value="url"  sx={{ px: 1.5, fontSize: '0.7rem', textTransform: 'none' }}>URL</ToggleButton>
                          <ToggleButton value="file" sx={{ px: 1.5, fontSize: '0.7rem', textTransform: 'none' }}>File</ToggleButton>
                        </ToggleButtonGroup>
                      </Stack>

                      {avatarMode === 'url' ? (
                        <Controller
                          name="avatarUrl"
                          control={profileForm.control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Avatar URL"
                              fullWidth
                              size="small"
                              placeholder="https://example.com/avatar.jpg"
                              helperText={
                                profileForm.formState.errors.avatarUrl?.message ??
                                'Paste a public image URL'
                              }
                              error={!!profileForm.formState.errors.avatarUrl}
                            />
                          )}
                        />
                      ) : (
                        <Box
                          sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                            bgcolor: 'background.default',
                          }}
                        >
                          <UploadFileOutlinedIcon fontSize="large" color="disabled" />
                          <input type="file" accept="image/*" />
                          <Typography variant="caption" color="text.secondary" textAlign="center">
                            File upload will be implemented later.
                          </Typography>
                        </Box>
                      )}

                      <Box display="flex" justifyContent="flex-end">
                        <Button
                          type="submit"
                          variant="outlined"
                          size="small"
                          disabled={updateMeMutation.isPending}
                          startIcon={
                            updateMeMutation.isPending
                              ? <CircularProgress size={14} color="inherit" />
                              : null
                          }
                        >
                          {updateMeMutation.isPending ? 'Saving…' : 'Save avatar'}
                        </Button>
                      </Box>
                    </Stack>
                  </form>
                </Grid>

              </Grid>
            </CardContent>
          </Card>

          {/* ── Personal information ────────────────────────────────────────── */}
          <Card variant="outlined">
            <CardHeader
              avatar={<PersonOutlinedIcon color="action" />}
              title={<Typography variant="subtitle1" fontWeight={600}>Personal Information</Typography>}
              sx={{ pb: 1 }}
            />
            <Divider />
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <Stack spacing={2.5}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="firstName"
                        control={profileForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="First name"
                            fullWidth
                            size="small"
                            required
                            error={!!profileForm.formState.errors.firstName}
                            helperText={profileForm.formState.errors.firstName?.message}
                            autoComplete="given-name"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="lastName"
                        control={profileForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Last name"
                            fullWidth
                            size="small"
                            required
                            error={!!profileForm.formState.errors.lastName}
                            helperText={profileForm.formState.errors.lastName?.message}
                            autoComplete="family-name"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Email"
                        value={user?.email ?? ''}
                        fullWidth
                        size="small"
                        disabled
                        helperText="Email cannot be changed. Contact your administrator."
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Role"
                        value={user?.role ? (ROLE_LABELS[user.role] ?? user.role) : ''}
                        fullWidth
                        size="small"
                        disabled
                        helperText="Assigned by your administrator."
                      />
                    </Grid>
                  </Grid>

                  <Box display="flex" justifyContent="flex-end">
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={updateMeMutation.isPending || !profileForm.formState.isDirty}
                      startIcon={
                        updateMeMutation.isPending
                          ? <CircularProgress size={16} color="inherit" />
                          : null
                      }
                    >
                      {updateMeMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </Box>
                </Stack>
              </form>
            </CardContent>
          </Card>

          {/* ── Change password ─────────────────────────────────────────────── */}
          <Card variant="outlined">
            <CardHeader
              avatar={<LockOutlinedIcon color="action" />}
              title={<Typography variant="subtitle1" fontWeight={600}>Change Password</Typography>}
              sx={{ pb: 1 }}
            />
            <Divider />
            <CardContent>
              {passwordSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>Password changed successfully.</Alert>
              )}
              {passwordError && (
                <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>
              )}
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <Stack spacing={2.5}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Controller
                        name="currentPassword"
                        control={passwordForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Current password"
                            type="password"
                            fullWidth
                            size="small"
                            required
                            error={!!passwordForm.formState.errors.currentPassword}
                            helperText={passwordForm.formState.errors.currentPassword?.message}
                            autoComplete="current-password"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Controller
                        name="newPassword"
                        control={passwordForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="New password"
                            type="password"
                            fullWidth
                            size="small"
                            required
                            error={!!passwordForm.formState.errors.newPassword}
                            helperText={passwordForm.formState.errors.newPassword?.message}
                            autoComplete="new-password"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Controller
                        name="confirmPassword"
                        control={passwordForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Confirm new password"
                            type="password"
                            fullWidth
                            size="small"
                            required
                            error={!!passwordForm.formState.errors.confirmPassword}
                            helperText={passwordForm.formState.errors.confirmPassword?.message}
                            autoComplete="new-password"
                          />
                        )}
                      />
                    </Grid>
                  </Grid>

                  <Box display="flex" justifyContent="flex-end">
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={changePasswordMutation.isPending}
                      startIcon={
                        changePasswordMutation.isPending
                          ? <CircularProgress size={16} color="inherit" />
                          : null
                      }
                    >
                      {changePasswordMutation.isPending ? 'Changing…' : 'Change Password'}
                    </Button>
                  </Box>
                </Stack>
              </form>
            </CardContent>
          </Card>

        </Stack>
      </Box>
    </Box>
  );
}
