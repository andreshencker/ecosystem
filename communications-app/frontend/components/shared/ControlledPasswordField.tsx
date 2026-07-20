'use client';

import { useState } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

interface ControlledPasswordFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<TextFieldProps, 'name' | 'type'> {
  name: TName;
  control: Control<TFieldValues>;
}

/**
 * react-hook-form controlled password field with show/hide toggle.
 * Drop-in replacement for ControlledTextField when `type="password"` is needed.
 */
export function ControlledPasswordField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ name, control, ...textFieldProps }: ControlledPasswordFieldProps<TFieldValues, TName>) {
  const [visible, setVisible] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...textFieldProps}
          type={visible ? 'text' : 'password'}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? textFieldProps.helperText}
          InputProps={{
            ...textFieldProps.InputProps,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible((v) => !v)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                  size="small"
                >
                  {visible
                    ? <VisibilityOffOutlinedIcon fontSize="small" />
                    : <VisibilityOutlinedIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      )}
    />
  );
}
