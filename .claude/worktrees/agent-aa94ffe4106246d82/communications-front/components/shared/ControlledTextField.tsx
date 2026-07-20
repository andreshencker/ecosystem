'use client';

import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

interface ControlledTextFieldProps<T extends FieldValues>
  extends Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText'> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  helperText?: string;
}

export function ControlledTextField<T extends FieldValues>({
  name,
  control,
  label,
  helperText,
  ...rest
}: ControlledTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...rest}
          label={label}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth
        />
      )}
    />
  );
}
