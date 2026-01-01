/**
 * Tests for authentication utilities
 */

import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshTokenForStorage,
  verifyAccessToken,
  generateSessionExpiry,
  validatePasswordStrength,
} from '@/lib/auth';

describe('Password Hashing', () => {
  it('should hash password correctly', async () => {
    const password = 'SecurePassword123';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
  });

  it('should verify correct password', async () => {
    const password = 'SecurePassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'SecurePassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('WrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('should produce different hashes for same password', async () => {
    const password = 'SecurePassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2); // bcrypt uses random salt
  });
});

describe('Access Token', () => {
  beforeAll(() => {
    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
  });

  it('should generate valid access token', () => {
    const userId = 'user-123';
    const token = generateAccessToken(userId);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format
  });

  it('should verify valid access token', () => {
    const userId = 'user-123';
    const token = generateAccessToken(userId);
    
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(userId);
    expect(decoded?.type).toBe('access');
  });

  it('should reject invalid token', () => {
    const decoded = verifyAccessToken('invalid-token');
    expect(decoded).toBeNull();
  });

  it('should reject tampered token', () => {
    const userId = 'user-123';
    const token = generateAccessToken(userId);
    const tamperedToken = token.slice(0, -5) + 'xxxxx';
    
    const decoded = verifyAccessToken(tamperedToken);
    expect(decoded).toBeNull();
  });
});

describe('Refresh Token', () => {
  it('should generate cryptographically secure refresh token', () => {
    const token = generateRefreshToken();
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(30); // base64url of 32 bytes
  });

  it('should generate unique tokens', () => {
    const token1 = generateRefreshToken();
    const token2 = generateRefreshToken();
    
    expect(token1).not.toBe(token2);
  });

  it('should hash refresh token for storage', () => {
    const token = generateRefreshToken();
    const hash = hashRefreshTokenForStorage(token);
    
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
  });

  it('should produce consistent hash for same token', () => {
    const token = generateRefreshToken();
    const hash1 = hashRefreshTokenForStorage(token);
    const hash2 = hashRefreshTokenForStorage(token);
    
    expect(hash1).toBe(hash2);
  });
});

describe('Session Expiry', () => {
  it('should generate expiry date 90 days in future', () => {
    const now = new Date();
    const expiry = generateSessionExpiry();
    
    const daysDiff = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(90);
  });
});

describe('Password Strength Validation', () => {
  it('should accept strong password', () => {
    const errors = validatePasswordStrength('SecurePass123');
    expect(errors).toHaveLength(0);
  });

  it('should reject short password', () => {
    const errors = validatePasswordStrength('Short1');
    expect(errors).toContain('Password must be at least 8 characters long');
  });

  it('should reject password without lowercase', () => {
    const errors = validatePasswordStrength('UPPERCASE123');
    expect(errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should reject password without uppercase', () => {
    const errors = validatePasswordStrength('lowercase123');
    expect(errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should reject password without number', () => {
    const errors = validatePasswordStrength('NoNumbersHere');
    expect(errors).toContain('Password must contain at least one number');
  });

  it('should return multiple errors for very weak password', () => {
    const errors = validatePasswordStrength('weak');
    expect(errors.length).toBeGreaterThan(1);
  });
});

