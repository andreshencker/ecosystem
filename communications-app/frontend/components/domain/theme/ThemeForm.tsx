'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  FormDrawer,
  FormError,
  LoadingButton,
  ControlledTextField,
  ControlledSwitch,
  ColorField,
} from '@/components/shared';
import { ThemePreviewCard } from './ThemePreviewCard';
import { useCrudFeedback } from '@/hooks/useCrudFeedback';
import {
  useCreateCompanyThemeMutation,
  useUpdateCompanyThemeMutation,
} from '@/hooks/api/useCompanyThemes';
import { mapApiError } from '@/lib/mapApiError';
import { mapValidationErrors, extractValidationErrors } from '@/lib/mapValidationErrors';
import {
  themeFormSchema,
  THEME_DEFAULTS,
  type ThemeFormValues,
} from '@/lib/schemas/theme.schema';
import type { CompanyTheme } from '@/types/api';

// ─── Color field definitions ──────────────────────────────────────────────────

const COLOR_FIELDS: Array<{
  name: keyof ThemeFormValues;
  label: string;
}> = [
  { name: 'primaryColor',    label: 'Primary'    },
  { name: 'secondaryColor',  label: 'Secondary'  },
  { name: 'backgroundColor', label: 'Background' },
  { name: 'surfaceColor',    label: 'Surface'    },
  { name: 'textColor',       label: 'Text'       },
  { name: 'mutedTextColor',  label: 'Muted Text' },
  { name: 'borderColor',     label: 'Border'     },
  { name: 'linkColor',       label: 'Link'       },
];

// ─── Section label helper ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ display: 'block', mb: 1.5, letterSpacing: 0.8 }}
    >
      {children}
    </Typography>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORM_ID = 'theme-form';

function themeToFormValues(theme: CompanyTheme): ThemeFormValues {
  return {
    label:           theme.label,
    primaryColor:    theme.primaryColor    || THEME_DEFAULTS.primaryColor,
    secondaryColor:  theme.secondaryColor  || THEME_DEFAULTS.secondaryColor,
    backgroundColor: theme.backgroundColor || THEME_DEFAULTS.backgroundColor,
    surfaceColor:    theme.surfaceColor    || THEME_DEFAULTS.surfaceColor,
    textColor:       theme.textColor       || THEME_DEFAULTS.textColor,
    mutedTextColor:  theme.mutedTextColor  || THEME_DEFAULTS.mutedTextColor,
    borderColor:     theme.borderColor     || THEME_DEFAULTS.borderColor,
    linkColor:       theme.linkColor       || THEME_DEFAULTS.linkColor,
    fontFamily:      theme.fontFamily      || THEME_DEFAULTS.fontFamily,
    fontSizeBase:    theme.fontSizeBase    || THEME_DEFAULTS.fontSizeBase,
    fontWeightNormal: theme.fontWeightNormal ?? THEME_DEFAULTS.fontWeightNormal,
    fontWeightBold:   theme.fontWeightBold  ?? THEME_DEFAULTS.fontWeightBold,
    isDefault:       theme.isDefault,
    isActive:        theme.isActive,
  };
}

// ─── ThemeForm ────────────────────────────────────────────────────────────────

interface ThemeFormProps {
  open: boolean;
  theme: CompanyTheme | null;
  companyId: string;
  onClose: () => void;
}

export function ThemeForm({ open, theme, companyId, onClose }: ThemeFormProps) {
  const isEditing = Boolean(theme);
  const createMutation = useCreateCompanyThemeMutation();
  const updateMutation = useUpdateCompanyThemeMutation();
  const [formError, setFormError] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    mode: 'onBlur',
    defaultValues: THEME_DEFAULTS,
  });

  // Reset form to theme values (or defaults for create) each time the drawer opens
  useEffect(() => {
    if (open) {
      reset(theme ? themeToFormValues(theme) : THEME_DEFAULTS);
      setFormError(undefined);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const previewValues = watch();

  const feedback = useCrudFeedback({
    successMessage: isEditing ? 'Theme updated' : 'Theme created',
    queryKeys: [['company-themes', companyId]],
    onSuccess: onClose,
  });

  const onSubmit = async (values: ThemeFormValues) => {
    setFormError(undefined);
    try {
      if (isEditing && theme) {
        await updateMutation.mutateAsync({ id: theme.id, ...values });
      } else {
        await createMutation.mutateAsync({ companyId, ...values });
      }
      feedback.onSuccess();
    } catch (e: unknown) {
      const validationErrors = extractValidationErrors(e);
      if (validationErrors) {
        const mapped = mapValidationErrors(validationErrors);
        for (const [field, message] of Object.entries(mapped)) {
          if (field === '_form') {
            setFormError(message);
          } else {
            setError(field as keyof ThemeFormValues, { message });
          }
        }
        if (!mapped['_form']) setFormError(undefined);
        return;
      }
      setFormError(mapApiError(e));
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit "${theme?.label}"` : 'New Theme'}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form={FORM_ID}
            variant="contained"
            loading={isSubmitting}
          >
            {isEditing ? 'Save Changes' : 'Create Theme'}
          </LoadingButton>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={3}>
          {/* Live preview ─────────────────────────────────────────────────── */}
          <ThemePreviewCard values={previewValues} />

          {/* General ───────────────────────────────────────────────────────── */}
          <ControlledTextField
            name="label"
            control={control}
            label="Label"
            required
            disabled={isSubmitting}
          />

          {/* Colors ─────────────────────────────────────────────────────────  */}
          <Box>
            <SectionLabel>Colors</SectionLabel>
            <Grid container spacing={2}>
              {COLOR_FIELDS.map(({ name, label }) => (
                <Grid item xs={12} sm={6} key={name}>
                  <ColorField
                    name={name as keyof ThemeFormValues}
                    control={control}
                    label={label}
                    required
                    disabled={isSubmitting}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Typography ──────────────────────────────────────────────────────  */}
          <Box>
            <SectionLabel>Typography</SectionLabel>
            <Stack spacing={2}>
              <ControlledTextField
                name="fontFamily"
                control={control}
                label="Font Family"
                required
                disabled={isSubmitting}
                helperText='CSS font-family value, e.g. "Inter, sans-serif"'
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <ControlledTextField
                    name="fontSizeBase"
                    control={control}
                    label="Base Size"
                    required
                    disabled={isSubmitting}
                    helperText="e.g. 14px, 1rem"
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="fontWeightNormal"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Normal Weight"
                        type="number"
                        fullWidth
                        required
                        disabled={isSubmitting}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message ?? 'e.g. 400'}
                        inputProps={{ min: 100, max: 900, step: 100 }}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="fontWeightBold"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Bold Weight"
                        type="number"
                        fullWidth
                        required
                        disabled={isSubmitting}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message ?? 'e.g. 700'}
                        inputProps={{ min: 100, max: 900, step: 100 }}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Box>

          {/* Flags ──────────────────────────────────────────────────────────── */}
          <Box>
            <SectionLabel>Flags</SectionLabel>
            <Stack spacing={0.5}>
              <ControlledSwitch
                name="isActive"
                control={control}
                label="Active"
                disabled={isSubmitting}
              />
              <ControlledSwitch
                name="isDefault"
                control={control}
                label="Default theme for this company"
                disabled={isSubmitting}
              />
            </Stack>
          </Box>

          {/* Form-level API error ───────────────────────────────────────────── */}
          <FormError message={formError} />
        </Stack>
      </form>
    </FormDrawer>
  );
}
