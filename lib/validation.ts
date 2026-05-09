import { z } from 'zod';

// Top-50 most commonly breached passwords — rejected outright
const COMMON_PASSWORDS = new Set([
  'password', 'password1', '12345678', '123456789', '1234567890',
  'qwerty123', 'iloveyou', 'admin123', 'letmein', 'welcome1',
  'monkey123', 'dragon123', 'master123', 'abc12345', 'sunshine1',
  'princess1', 'shadow123', 'superman', 'michael1', 'football',
  'baseball', 'pokemon123', 'qwertyui', 'hello123', 'passw0rd',
  'p@ssword', 'p@ssw0rd', 'pass1234', 'test1234', 'user1234',
  'login123', 'changeme', 'welcome!', 'secret123', 'trustno1',
  'starwars', 'whatever', 'freedom1', 'jordan23', 'ranger123',
  'batman123', 'soccer123', 'hockey123', 'hunter12', 'buster12',
  'thomas12', 'tigger12', 'robert12', 'charlie1', 'donald123',
]);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .refine(
    (p) => !COMMON_PASSWORDS.has(p.toLowerCase()),
    'Password is too common — please choose a more unique password'
  );

const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(254, 'Email must not exceed 254 characters')
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
  refreshToken: z.string().min(1, 'Refresh token is required').max(200, 'Invalid token format'),
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
    .regex(/^[a-zA-Z0-9\s\-&()]+$/, 'Category contains invalid characters'),
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

export const GetExpensesSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  category: z.string().optional(),
  limit: z.number().int().positive().optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0),
});

// Loan schemas
export const CreateLoanSchema = z.object({
  borrowerName: z.string().min(1, 'Borrower name is required').max(100).trim(),
  amount: z.number().positive('Amount must be positive'),
  loanDate: z.string().datetime('Invalid date format'),
  expectedReturnDate: z.string().datetime('Invalid date format').optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const UpdateLoanSchema = CreateLoanSchema.partial().extend({
  isReturned: z.boolean().optional(),
  returnedDate: z.string().datetime('Invalid date format').optional().nullable(),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type SetBudgetInput = z.infer<typeof SetBudgetSchema>;
export type CreateLoanInput = z.infer<typeof CreateLoanSchema>;
export type UpdateLoanInput = z.infer<typeof UpdateLoanSchema>;
