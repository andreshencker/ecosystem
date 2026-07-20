import { z } from 'zod';

const hexColor = z
  .string()
  .min(1, 'This color is required.')
  .regex(/^#[0-9a-fA-F]{3,8}$/, 'Must be a valid hex color (e.g. #4263EB).');

export const themeFormSchema = z.object({
  // General
  label: z.string().min(1, 'Label is required.').max(100, 'Label must be 100 characters or fewer.'),

  // Colors — all required by the backend schema
  primaryColor:    hexColor,
  secondaryColor:  hexColor,
  backgroundColor: hexColor,
  surfaceColor:    hexColor,
  textColor:       hexColor,
  mutedTextColor:  hexColor,
  borderColor:     hexColor,
  linkColor:       hexColor,

  // Typography — all required by the backend schema
  fontFamily:       z.string().min(1, 'Font family is required.'),
  fontSizeBase:     z.string().min(1, 'Font size is required.'),
  fontWeightNormal: z.coerce.number().int().min(100, 'Minimum is 100.').max(900, 'Maximum is 900.'),
  fontWeightBold:   z.coerce.number().int().min(100, 'Minimum is 100.').max(900, 'Maximum is 900.'),

  // Flags
  isDefault: z.boolean(),
  isActive:  z.boolean(),
});

export type ThemeFormValues = z.infer<typeof themeFormSchema>;

export const THEME_DEFAULTS: ThemeFormValues = {
  label:           '',
  primaryColor:    '#4263EB',
  secondaryColor:  '#7C3AED',
  backgroundColor: '#FFFFFF',
  surfaceColor:    '#F8FAFC',
  textColor:       '#0F172A',
  mutedTextColor:  '#64748B',
  borderColor:     '#E2E8F0',
  linkColor:       '#4263EB',
  fontFamily:      'Inter, sans-serif',
  fontSizeBase:    '14px',
  fontWeightNormal: 400,
  fontWeightBold:   700,
  isDefault:       false,
  isActive:        true,
};
