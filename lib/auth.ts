import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Security Configuration
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const SESSION_EXPIRY_DAYS = 90; // Extended for iOS PWA compatibility
const REFRESH_TOKEN_BYTES = 32; // 256-bit token

/**
 * Get JWT secret with proper error handling
 * CRITICAL: Never fall back to a default secret in production
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: JWT_SECRET environment variable is not set in production');
    }
    // Only allow default in development with a warning
    console.warn('⚠️ WARNING: Using default JWT secret - Set JWT_SECRET in production!');
    return 'dev-secret-unsafe-for-production';
  }

  // Validate secret strength
  if (secret.length < 32) {
    console.warn('⚠️ WARNING: JWT_SECRET should be at least 32 characters for security');
  }

  return secret;
}

/**
 * Hash password using bcrypt with timing-safe comparison
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * Verify password with timing-safe comparison (bcrypt handles this internally)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Generate JWT access token
 * Includes additional claims for enhanced security
 */
export function generateAccessToken(userId: string): string {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      userId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000), // Explicit issued at time
    },
    secret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: 'HS256',
    }
  );
}

/**
 * Generate cryptographically secure refresh token
 * Uses crypto.randomBytes instead of UUID for better entropy
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

/**
 * Hash refresh token using SHA-256 for efficient lookup
 * Unlike bcrypt, SHA-256 produces consistent hashes for database indexing
 * The token itself has sufficient entropy (256 bits) to resist brute force
 */
export function hashRefreshTokenForStorage(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify refresh token by comparing hashes (constant time)
 * @deprecated Use hashRefreshTokenForStorage and direct comparison instead
 */
export async function hashRefreshToken(token: string): Promise<string> {
  // Keep bcrypt for backward compatibility during migration
  return bcryptjs.hash(token, SALT_ROUNDS);
}

/**
 * Verify refresh token against bcrypt hash
 * @deprecated Will be removed after migration to SHA-256 hashing
 */
export async function verifyRefreshToken(token: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(token, hash);
}

/**
 * Verify JWT access token with proper error handling
 */
export function verifyAccessToken(token: string): { userId: string; type: string } | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'], // Prevent algorithm confusion attacks
    }) as { userId: string; type: string };

    // Validate token type
    if (decoded.type !== 'access') {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Generate session expiry date
 * Extended to 90 days for iOS PWA compatibility
 */
export function generateSessionExpiry(): Date {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_EXPIRY_DAYS);
  return date;
}

/**
 * Validate password strength
 * Returns array of validation errors (empty if valid)
 */
export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  // Optional: Uncomment for special character requirement
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   errors.push('Password must contain at least one special character');
  // }

  return errors;
}

