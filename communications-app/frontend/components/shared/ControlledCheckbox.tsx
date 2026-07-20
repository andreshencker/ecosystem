'use client';

import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Box from '@mui/material/Box';

interface ControlledCheckboxProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  label: React.ReactNode;
  helperText?: string;
  disabled?: boolean;
}

/**
 * react-hook-form controlled checkbox with optional label and helper text.
 */
export function ControlledCheckbox<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ name, control, label, helperText, disabled }: ControlledCheckboxProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={disabled}
              />
            }
            label={label}
          />
          {(fieldState.error?.message || helperText) && (
            <FormHelperText error={!!fieldState.error} sx={{ ml: 4, mt: -0.5 }}>
              {fieldState.error?.message ?? helperText}
            </FormHelperText>
          )}
        </Box>
      )}
    />
  );
}
