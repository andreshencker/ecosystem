'use client';

import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

export interface SelectOption {
  value: string;
  label: string;
}

interface ControlledSelectProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
}

export function ControlledSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  required,
  disabled,
}: ControlledSelectProps<T>) {
  const labelId = `${name}-label`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl fullWidth error={!!fieldState.error} required={required} disabled={disabled}>
          <InputLabel id={labelId}>{label}</InputLabel>
          <Select {...field} labelId={labelId} label={label}>
            {options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {fieldState.error && (
            <FormHelperText>{fieldState.error.message}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}
