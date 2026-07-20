import { z } from 'zod';

export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Mexico_City',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Colombo',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Honolulu',
].map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }));

export const createCompanySchema = z.object({
  companyKey: z
    .string()
    .min(2, 'Minimum 2 characters')
    .max(32, 'Maximum 32 characters')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  displayName: z.string().min(1, 'Required').max(100, 'Maximum 100 characters'),
  legalName: z.string().max(200).optional(),
  tagline: z.string().max(200).optional(),
  timezone: z.string().min(1, 'Required'),
});

export type CreateCompanyFormData = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  displayName: z.string().min(1, 'Required').max(100, 'Maximum 100 characters'),
  legalName: z.string().max(200).optional(),
  tagline: z.string().max(200).optional(),
  timezone: z.string().min(1, 'Required'),
  isActive: z.boolean().optional(),
});

export type UpdateCompanyFormData = z.infer<typeof updateCompanySchema>;
