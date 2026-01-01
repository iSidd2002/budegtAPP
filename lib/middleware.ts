import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './auth';
import prisma from './prisma'; // Use singleton Prisma client
import crypto from 'crypto';

/**
 * Rate limiting store (in production, use Redis)
 * WARNING: This is in-memory and will reset on server restart
 * and won't work across multiple server instances.
 * TODO: Implement Redis-based rate limiting for production
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Periodic cleanup of expired rate limit entries (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
  }
}, CLEANUP_INTERVAL);

/**
 * Authentication middleware
 * Validates Bearer token from Authorization header
 */
export async function withAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  // Validate header format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization header required', status: 401 };
  }

  const token = authHeader.substring(7); // More precise than replace

  if (!token || token.length < 10) {
    return { error: 'Invalid token format', status: 401 };
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  return { userId: decoded.userId };
}

/**
 * Rate limiting middleware
 * Uses sliding window algorithm for fair rate limiting
 */
export function withRateLimit(
  key: string,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * CSRF protection middleware
 * Uses double-submit cookie pattern with timing-safe comparison
 */
export function withCSRFProtection(request: NextRequest): { valid: boolean; error?: string; status?: number } {
  const csrfToken = request.headers.get('x-csrf-token');
  const sessionCookie = request.cookies.get('csrf-token')?.value;

  if (!csrfToken || !sessionCookie) {
    return { valid: false, error: 'CSRF token missing', status: 403 };
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(csrfToken, 'utf8');
    const cookieBuffer = Buffer.from(sessionCookie, 'utf8');

    if (tokenBuffer.length !== cookieBuffer.length) {
      return { valid: false, error: 'CSRF token validation failed', status: 403 };
    }

    if (!crypto.timingSafeEqual(tokenBuffer, cookieBuffer)) {
      return { valid: false, error: 'CSRF token validation failed', status: 403 };
    }
  } catch {
    return { valid: false, error: 'CSRF token validation failed', status: 403 };
  }

  return { valid: true };
}

/**
 * Cookie security options interface
 * Note: sameSite uses lowercase values to match Next.js ResponseCookie type
 */
interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  domain?: string;
  path?: string;
}

/**
 * Set a secure cookie with sensible defaults
 * Follows OWASP cookie security guidelines
 */
export function setSecureCookie<T extends NextResponse>(
  response: T,
  name: string,
  value: string,
  options: CookieOptions = {}
): T {
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    httpOnly: options.httpOnly !== false, // Default: true (prevents XSS access)
    secure: isProduction || options.secure === true, // HTTPS only in production
    sameSite: options.sameSite || ('lax' as const), // Lax for PWA compatibility
    maxAge: options.maxAge || 90 * 24 * 60 * 60, // 90 days default
    path: options.path || '/',
  };

  // Allow overriding cookie domain via explicit option or environment variable
  const domain = options.domain || process.env.COOKIE_DOMAIN;

  if (domain) {
    response.cookies.set(name, value, { ...cookieOptions, domain });
  } else {
    response.cookies.set(name, value, cookieOptions);
  }

  return response;
}

/**
 * Log audit event for security monitoring
 * Sanitizes sensitive data before logging
 */
export async function logAuditEvent(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // Sanitize details to prevent logging sensitive data
    const sanitizedDetails = details ? sanitizeAuditDetails(details) : undefined;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        details: sanitizedDetails ? JSON.stringify(sanitizedDetails) : undefined,
        ipAddress: ipAddress?.substring(0, 45), // IPv6 max length
        userAgent: userAgent?.substring(0, 500), // Limit user agent length
      },
    });
  } catch (error) {
    // Don't expose internal errors, but log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to log audit event:', error);
    }
  }
}

/**
 * Sanitize audit details to remove sensitive information
 */
function sanitizeAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'refreshToken', 'accessToken', 'hash'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Extract client IP address from request headers
 * Handles various proxy configurations
 */
export function getClientIp(request: NextRequest): string {
  // Check common proxy headers in order of reliability
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (original client), trim whitespace
    const firstIp = forwardedFor.split(',')[0].trim();
    if (isValidIp(firstIp)) {
      return firstIp;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Basic IP address validation
 */
function isValidIp(ip: string): boolean {
  // Basic validation - not exhaustive but catches obvious issues
  const trimmed = ip.trim();
  return trimmed.length > 0 && trimmed.length <= 45 && !trimmed.includes(' ');
}

/**
 * Get security headers for HTTP responses
 * Follows OWASP security headers guidelines
 */
export function getSecureHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // XSS protection (legacy, but still useful for older browsers)
    'X-XSS-Protection': '1; mode=block',

    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Restrict browser features
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',

    // Force HTTPS (only in production)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),

    // Content Security Policy - adjust based on your needs
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  };

  return headers;
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

