/**
 * Tests for validation schemas
 */

import {
  SignupSchema,
  LoginSchema,
  CreateExpenseSchema,
  SetBudgetSchema,
} from '@/lib/validation';

describe('SignupSchema', () => {
  it('should accept valid signup data', () => {
    const result = SignupSchema.safeParse({
      email: 'test@example.com',
      password: 'SecurePass123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = SignupSchema.safeParse({
      email: 'invalid-email',
      password: 'SecurePass123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const result = SignupSchema.safeParse({
      email: 'test@example.com',
      password: 'Short1',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password without uppercase', () => {
    const result = SignupSchema.safeParse({
      email: 'test@example.com',
      password: 'lowercase123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password without lowercase', () => {
    const result = SignupSchema.safeParse({
      email: 'test@example.com',
      password: 'UPPERCASE123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password without number', () => {
    const result = SignupSchema.safeParse({
      email: 'test@example.com',
      password: 'NoNumbersHere',
    });
    expect(result.success).toBe(false);
  });

  it('should normalize email to lowercase', () => {
    const result = SignupSchema.safeParse({
      email: 'TEST@EXAMPLE.COM',
      password: 'SecurePass123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('should reject password over 128 characters', () => {
    const result = SignupSchema.safeParse({
      email: 'test@example.com',
      password: 'A'.repeat(129) + 'a1',
    });
    expect(result.success).toBe(false);
  });
});

describe('LoginSchema', () => {
  it('should accept valid login data', () => {
    const result = LoginSchema.safeParse({
      email: 'test@example.com',
      password: 'anypassword',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty password', () => {
    const result = LoginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateExpenseSchema', () => {
  it('should accept valid expense data', () => {
    const result = CreateExpenseSchema.safeParse({
      amount: 100.50,
      category: 'Food',
      date: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative amount', () => {
    const result = CreateExpenseSchema.safeParse({
      amount: -100,
      category: 'Food',
      date: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it('should reject zero amount', () => {
    const result = CreateExpenseSchema.safeParse({
      amount: 0,
      category: 'Food',
      date: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty category', () => {
    const result = CreateExpenseSchema.safeParse({
      amount: 100,
      category: '',
      date: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it('should reject category with special characters', () => {
    const result = CreateExpenseSchema.safeParse({
      amount: 100,
      category: 'Food<script>',
      date: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it('should accept category with allowed special chars', () => {
    const result = CreateExpenseSchema.safeParse({
      amount: 100,
      category: 'Food & Dining (Fast-Food)',
      date: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional note', () => {
    const result = CreateExpenseSchema.safeParse({
      amount: 100,
      category: 'Food',
      date: new Date().toISOString(),
      note: 'Lunch at restaurant',
    });
    expect(result.success).toBe(true);
  });

  it('should reject note over 500 characters', () => {
    const result = CreateExpenseSchema.safeParse({
      amount: 100,
      category: 'Food',
      date: new Date().toISOString(),
      note: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('SetBudgetSchema', () => {
  it('should accept valid budget data', () => {
    const result = SetBudgetSchema.safeParse({
      amount: 50000,
      month: 1,
      year: 2024,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid month', () => {
    const result1 = SetBudgetSchema.safeParse({
      amount: 50000,
      month: 0,
      year: 2024,
    });
    expect(result1.success).toBe(false);

    const result2 = SetBudgetSchema.safeParse({
      amount: 50000,
      month: 13,
      year: 2024,
    });
    expect(result2.success).toBe(false);
  });

  it('should reject year before 2000', () => {
    const result = SetBudgetSchema.safeParse({
      amount: 50000,
      month: 1,
      year: 1999,
    });
    expect(result.success).toBe(false);
  });

  it('should default budgetType to personal', () => {
    const result = SetBudgetSchema.safeParse({
      amount: 50000,
      month: 1,
      year: 2024,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budgetType).toBe('personal');
    }
  });
});

