import { z } from 'zod';

// ─── Login ────────────────────────────────────────────────────────────────────
// Login only validates presence — complexity is the backend's responsibility.
// Field-level messages match Form-Behaviour.md §3.2 exactly.

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Register ─────────────────────────────────────────────────────────────────
// Field requirements from Authentication.md §10.1.

export const registerSchema = z
  .object({
    businessName: z
      .string()
      .min(2, 'Business name must be at least 2 characters.'),
    firstName: z.string().min(1, 'First name is required.'),
    lastName: z.string().min(1, 'Last name is required.'),
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
