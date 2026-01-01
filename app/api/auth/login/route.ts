import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LoginSchema } from '@/lib/validation';
import { verifyPassword, generateAccessToken, generateRefreshToken, hashRefreshTokenForStorage, generateSessionExpiry } from '@/lib/auth';
import { withRateLimit, setSecureCookie, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import { z } from 'zod';

/**
 * Account lockout tracking
 * WARNING: In-memory storage - use Redis in production for multi-instance support
 */
const lockoutStore = new Map<string, { attempts: number; lockedUntil: number }>();

// Configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    // Check account lockout first (before rate limiting to save resources)
    const lockout = lockoutStore.get(ip);
    if (lockout && lockout.lockedUntil > Date.now()) {
      const retryAfter = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            ...getSecureHeaders(),
          }
        }
      );
    }

    // Rate limiting
    const rateLimitCheck = withRateLimit(`login:${ip}`, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.retryAfter),
            ...getSecureHeaders(),
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = LoginSchema.parse(body);

    // Find user by email (case-insensitive due to validation normalization)
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    // Helper function to track failed attempts
    const trackFailedAttempt = () => {
      const current = lockoutStore.get(ip) || { attempts: 0, lockedUntil: 0 };
      current.attempts++;
      if (current.attempts >= MAX_LOGIN_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
      lockoutStore.set(ip, current);
    };

    if (!user) {
      trackFailedAttempt();

      await logAuditEvent(
        'unknown',
        'LOGIN_FAILED',
        'auth',
        undefined,
        { reason: 'User not found' }, // Don't log email to prevent enumeration info leaks
        ip,
        userAgent
      );

      // Use consistent error message to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    // Verify password with timing-safe comparison (bcrypt handles this internally)
    const passwordValid = await verifyPassword(validatedData.password, user.passwordHash);
    if (!passwordValid) {
      trackFailedAttempt();

      await logAuditEvent(
        user.id,
        'LOGIN_FAILED',
        'auth',
        user.id,
        { reason: 'Invalid password' },
        ip,
        userAgent
      );

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    // Clear lockout on successful login
    lockoutStore.delete(ip);

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshTokenForStorage(refreshToken);

    // Create session - store only the hash, not the plaintext token
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: refreshTokenHash, // Store hash for lookup
        refreshTokenHash, // Same hash (for backward compatibility with existing code)
        expiresAt: generateSessionExpiry(),
      },
    });

    // Log successful login
    await logAuditEvent(user.id, 'LOGIN', 'auth', user.id, {}, ip, userAgent);

    // Build response
    // SECURITY NOTE: Refresh token is included in response body for iOS PWA compatibility
    // iOS PWAs in standalone mode don't reliably share httpOnly cookies with JS context
    // The token is also set as httpOnly cookie for web browser usage
    // Risk: XSS attacks could steal the refresh token from localStorage/IndexedDB
    // Mitigation: Short-lived access tokens (15min), session rotation on refresh
    let response = NextResponse.json(
      {
        success: true,
        user: { id: user.id, email: user.email },
        accessToken,
        refreshToken, // Required for iOS PWA - stored in IndexedDB
      },
      { status: 200 }
    );

    // Set refresh token in httpOnly cookie (secure, not accessible via JavaScript)
    response = setSecureCookie(response, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Lax for PWA compatibility with cross-origin navigations
      maxAge: 90 * 24 * 60 * 60, // 90 days for iOS PWA persistence
    });

    // Add security headers
    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400, headers: getSecureHeaders() }
      );
    }

    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error:', error);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getSecureHeaders() }
    );
  }
}

