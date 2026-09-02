'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ThemeFormValues } from '@/lib/schemas/theme.schema';

interface ThemePreviewCardProps {
  values: Partial<ThemeFormValues>;
}

/**
 * Live mini-preview of a theme. Reflects changes in the form immediately.
 * Used inside ThemeForm to give visual feedback as the user edits colors
 * and typography. Does NOT apply to the global MUI theme — it uses inline
 * sx overrides only.
 */
export function ThemePreviewCard({ values }: ThemePreviewCardProps) {
  const primary    = values.primaryColor    || '#4263EB';
  const secondary  = values.secondaryColor  || '#7C3AED';
  const bg         = values.backgroundColor || '#FFFFFF';
  const surface    = values.surfaceColor    || '#F8FAFC';
  const text       = values.textColor       || '#0F172A';
  const muted      = values.mutedTextColor  || '#64748B';
  const border     = values.borderColor     || '#E2E8F0';
  const link       = values.linkColor       || '#4263EB';
  const fontFamily = values.fontFamily      || 'inherit';
  const fontSize   = values.fontSizeBase    || '14px';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: border,
        borderRadius: 1.5,
        overflow: 'hidden',
        fontFamily,
        fontSize,
      }}
      aria-label="Theme preview"
    >
      {/* Header bar */}
      <Box sx={{ bgcolor: primary, px: 2, py: 1 }}>
        <Typography
          variant="caption"
          sx={{ color: '#fff', fontWeight: 700, fontFamily, fontSize }}
        >
          {values.label || 'Theme Preview'}
        </Typography>
      </Box>

      {/* Content area */}
      <Box sx={{ bgcolor: bg, p: 1.5 }}>
        <Box
          sx={{
            bgcolor: surface,
            border: '1px solid',
            borderColor: border,
            borderRadius: 1,
            p: 1.5,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: text, fontFamily, fontSize, mb: 0.5 }}
          >
            Heading text.{' '}
            <Box component="span" sx={{ color: link }}>
              Link example
            </Box>
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: muted, fontFamily, display: 'block', mb: 1 }}
          >
            Secondary / muted text
          </Typography>

          <Stack direction="row" spacing={1}>
            {/* Primary button */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.5,
                bgcolor: primary,
                color: '#fff',
                borderRadius: 0.75,
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily,
              }}
            >
              Button
            </Box>
            {/* Secondary (outline) button */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.5,
                border: '1.5px solid',
                borderColor: secondary,
                color: secondary,
                borderRadius: 0.75,
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily,
              }}
            >
              Outline
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
