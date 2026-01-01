/**
 * Tests for currency formatting utilities
 */

import { formatINR, parseINR, formatCompactINR } from '@/lib/currency';

describe('formatINR', () => {
  it('should format zero correctly', () => {
    expect(formatINR(0)).toBe('₹0.00');
  });

  it('should format small numbers correctly', () => {
    expect(formatINR(1)).toBe('₹1.00');
    expect(formatINR(10)).toBe('₹10.00');
    expect(formatINR(100)).toBe('₹100.00');
    expect(formatINR(999)).toBe('₹999.00');
  });

  it('should format thousands with Indian numbering (1,000)', () => {
    expect(formatINR(1000)).toBe('₹1,000.00');
    expect(formatINR(9999)).toBe('₹9,999.00');
  });

  it('should format lakhs with Indian numbering (1,00,000)', () => {
    expect(formatINR(10000)).toBe('₹10,000.00');
    expect(formatINR(100000)).toBe('₹1,00,000.00');
    expect(formatINR(999999)).toBe('₹9,99,999.00');
  });

  it('should format crores with Indian numbering (1,00,00,000)', () => {
    expect(formatINR(1000000)).toBe('₹10,00,000.00');
    expect(formatINR(10000000)).toBe('₹1,00,00,000.00');
    expect(formatINR(100000000)).toBe('₹10,00,00,000.00');
  });

  it('should handle decimal values', () => {
    expect(formatINR(1.5)).toBe('₹1.50');
    expect(formatINR(1234.56)).toBe('₹1,234.56');
    expect(formatINR(100000.99)).toBe('₹1,00,000.99');
  });

  it('should round to 2 decimal places', () => {
    expect(formatINR(1.234)).toBe('₹1.23');
    expect(formatINR(1.235)).toBe('₹1.24');
    expect(formatINR(1.999)).toBe('₹2.00');
  });

  it('should handle NaN', () => {
    expect(formatINR(NaN)).toBe('₹0');
  });

  it('should handle negative numbers', () => {
    expect(formatINR(-100)).toBe('₹-100.00');
    expect(formatINR(-1000)).toBe('₹-1,000.00');
  });
});

describe('parseINR', () => {
  it('should parse simple amounts', () => {
    expect(parseINR('₹100')).toBe(100);
    expect(parseINR('₹1,000')).toBe(1000);
  });

  it('should parse Indian formatted amounts', () => {
    expect(parseINR('₹1,00,000')).toBe(100000);
    expect(parseINR('₹10,00,000')).toBe(1000000);
  });

  it('should parse amounts with decimals', () => {
    expect(parseINR('₹100.50')).toBe(100.5);
    expect(parseINR('₹1,234.56')).toBe(1234.56);
  });

  it('should handle amounts without rupee symbol', () => {
    expect(parseINR('1000')).toBe(1000);
    expect(parseINR('1,00,000')).toBe(100000);
  });

  it('should handle whitespace', () => {
    expect(parseINR('  ₹100  ')).toBe(100);
  });

  it('should return 0 for invalid input', () => {
    expect(parseINR('invalid')).toBe(0);
    expect(parseINR('')).toBe(0);
  });
});

describe('formatCompactINR', () => {
  it('should return full format for small amounts', () => {
    expect(formatCompactINR(0)).toBe('₹0.00');
    expect(formatCompactINR(100)).toBe('₹100.00');
    expect(formatCompactINR(999)).toBe('₹999.00');
  });

  it('should format thousands as K', () => {
    expect(formatCompactINR(1000)).toBe('₹1.0K');
    expect(formatCompactINR(5500)).toBe('₹5.5K');
    expect(formatCompactINR(99999)).toBe('₹100.0K');
  });

  it('should format lakhs as L', () => {
    expect(formatCompactINR(100000)).toBe('₹1.0L');
    expect(formatCompactINR(550000)).toBe('₹5.5L');
    expect(formatCompactINR(9900000)).toBe('₹99.0L');
  });

  it('should format crores as Cr', () => {
    expect(formatCompactINR(10000000)).toBe('₹1.0Cr');
    expect(formatCompactINR(55000000)).toBe('₹5.5Cr');
    expect(formatCompactINR(100000000)).toBe('₹10.0Cr');
  });

  it('should handle NaN', () => {
    expect(formatCompactINR(NaN)).toBe('₹0');
  });

  it('should handle negative amounts', () => {
    expect(formatCompactINR(-1000)).toBe('₹-1.0K');
    expect(formatCompactINR(-100000)).toBe('₹-1.0L');
  });
});

