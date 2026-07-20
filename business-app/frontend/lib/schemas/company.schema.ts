import { z } from 'zod';

export const CURRENCY_OPTIONS = [
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'NZD', label: 'NZD — New Zealand Dollar' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'HKD', label: 'HKD — Hong Kong Dollar' },
];

const optDigits = (len: number, msg: string) =>
  z
    .string()
    .regex(new RegExp(`^\\d{${len}}$`), msg)
    .optional()
    .or(z.literal(''));

export const updateCompanySchema = z.object({
  businessName: z.string().min(1, 'Required').max(120, 'Maximum 120 characters'),

  abn: optDigits(11, 'ABN must be exactly 11 digits'),

  depositAccount: z
    .object({
      bsb:           optDigits(6, 'BSB must be exactly 6 digits'),
      accountNumber: z.string().max(20, 'Maximum 20 characters').optional(),
    })
    .optional(),

  defaultCurrency: z
    .string()
    .min(1, 'Required')
    .max(3, 'Maximum 3 characters'),
  // isActive is system-managed — excluded from the edit form and PATCH payload.
});

export type UpdateCompanyFormData = z.infer<typeof updateCompanySchema>;
