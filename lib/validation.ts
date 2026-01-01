import { z } from 'zod';

/**
 * Password validation with security requirements
 * - Minimum 8 characters
 * - Maximum 128 characters (prevent DoS via bcrypt)
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Email validation with normalization
 */
const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(254, 'Email must not exceed 254 characters') // RFC 5321
  .toLowerCase()
  .trim();

// Auth schemas
export const SignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').max(100, 'Invalid token format'),
});

// Budget schemas
export const SetBudgetSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  budgetType: z.enum(['personal', 'family']).optional().default('personal'),
});

// Expense schemas
export const CreateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be 50 characters or less')
    .regex(/^[a-zA-Z0-9\s\-&()]+$/, 'Category can only contain letters, numbers, spaces, hyphens, ampersands, and parentheses'),
  date: z.string().datetime('Invalid date format'),
  note: z.string().max(500).optional(),
  budgetType: z.enum(['personal', 'family']).optional().default('personal'),
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  recurringEndDate: z.string().datetime().optional(),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export const DeleteExpenseSchema = z.object({
  id: z.string().min(1, 'Expense ID is required'),
});

// Query schemas
export const GetExpensesSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  category: z.string().optional(),
  limit: z.number().int().positive().optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type SetBudgetInput = z.infer<typeof SetBudgetSchema>;

