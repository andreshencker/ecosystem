'use client';

import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors, FieldValues } from 'react-hook-form';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// ─── Schema definitions ───────────────────────────────────────────────────────

export type CredentialFieldType = 'text' | 'password' | 'number' | 'boolean';

export interface CredentialFieldDef {
  key: string;
  label: string;
  type: CredentialFieldType;
  required: boolean;
  placeholder?: string;
}

export const CREDENTIAL_SCHEMAS: Record<string, CredentialFieldDef[]> = {
  api_key: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' },
  ],
  smtp: [
    { key: 'host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.example.com' },
    { key: 'port', label: 'Port', type: 'number', required: true, placeholder: '587' },
    { key: 'user', label: 'Username', type: 'text', required: true },
    { key: 'pass', label: 'Password', type: 'password', required: true },
  ],
  oauth: [
    { key: 'clientId', label: 'Client ID', type: 'text', required: true },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    { key: 'accessToken', label: 'Access Token', type: 'password', required: false },
    { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: false },
  ],
  access_keys: [
    { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
    { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
    { key: 'region', label: 'Region', type: 'text', required: false, placeholder: 'us-east-1' },
    { key: 'bucket', label: 'Bucket', type: 'text', required: false },
  ],
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface DynamicCredentialFormProps {
  connectionType: string;
  control: Control<FieldValues>;
  errors: FieldErrors<FieldValues>;
  editMode?: boolean;
  showFields?: boolean;
  onShowFieldsChange?: (show: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DynamicCredentialForm({
  connectionType,
  control,
  errors,
  editMode = false,
  showFields = true,
  onShowFieldsChange,
}: DynamicCredentialFormProps) {
  const fields = CREDENTIAL_SCHEMAS[connectionType];

  if (!fields) {
    return (
      <Typography variant="body2" color="text.secondary">
        No schema defined for this connection type.
      </Typography>
    );
  }

  const shouldShowFields = !editMode || showFields;

  return (
    <Stack spacing={2}>
      {/* Edit mode toggle */}
      {editMode && (
        <FormControlLabel
          control={
            <Switch
              checked={showFields ?? false}
              onChange={(e) => onShowFieldsChange?.(e.target.checked)}
            />
          }
          label="Update credential values"
        />
      )}

      {/* Credential fields */}
      {shouldShowFields && (
        <>
          <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
            Values are encrypted at rest. Existing values are not shown.
          </Alert>

          {fields.map((fieldDef) => (
            <Controller
              key={fieldDef.key}
              name={fieldDef.key}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  label={fieldDef.label}
                  type={fieldDef.type === 'boolean' ? 'text' : fieldDef.type}
                  fullWidth
                  size="small"
                  required={fieldDef.required && !editMode}
                  placeholder={fieldDef.placeholder}
                  error={Boolean(errors[fieldDef.key])}
                  helperText={
                    errors[fieldDef.key]
                      ? String((errors[fieldDef.key] as { message?: string })?.message ?? '')
                      : undefined
                  }
                  inputProps={
                    fieldDef.type === 'password'
                      ? { autoComplete: 'new-password' }
                      : undefined
                  }
                />
              )}
            />
          ))}
        </>
      )}
    </Stack>
  );
}
