'use client';

import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

interface ColorFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Color picker field combining a native color swatch (opens the browser
 * color picker on click) with a synced hex text input and a live preview.
 *
 * The swatch and text input stay in sync at all times. Validation triggers
 * on blur per Form-Behaviour.md §1.3.
 *
 * Visual: [■ swatch]  [#4263EB ─────── label ────]
 *                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *                      error helperText if invalid
 */
export function ColorField<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  disabled = false,
}: ColorFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = field.value as string;
        const isValidHex = /^#[0-9a-fA-F]{3,8}$/.test(value);

        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            {/* Swatch — clicking it opens the native color picker */}
            <Box
              component="label"
              sx={{
                mt: '8px',
                width: 36,
                height: 36,
                borderRadius: 0.75,
                bgcolor: isValidHex ? value : 'action.disabledBackground',
                border: '1.5px solid',
                borderColor: fieldState.error ? 'error.main' : 'divider',
                cursor: disabled ? 'default' : 'pointer',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
                '&:hover': disabled ? {} : { borderColor: 'text.primary' },
              }}
            >
              <input
                type="color"
                value={isValidHex ? value : '#000000'}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={disabled}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: disabled ? 'default' : 'pointer',
                  border: 'none',
                  padding: 0,
                }}
                tabIndex={-1}
                aria-label={`Color picker for ${label}`}
              />
            </Box>

            {/* Hex text input */}
            <TextField
              value={value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              name={field.name}
              inputRef={field.ref}
              label={label}
              fullWidth
              required={required}
              disabled={disabled}
              placeholder="#000000"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              inputProps={{
                maxLength: 9,
                style: { fontFamily: 'monospace', letterSpacing: '0.02em' },
              }}
            />
          </Box>
        );
      }}
    />
  );
}
