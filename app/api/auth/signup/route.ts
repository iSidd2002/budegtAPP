import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SignupSchema } from '@/lib/validation';
import { hashPassword, generateAccessToken, generateRefreshToken, hashRefreshTokenForStorage, generateSessionExpiry } from '@/lib/auth';
import { withRateLimit, setSecureCookie, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import { z } from 'zod';

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_SIGNUPS = 5;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    // Rate limiting - stricter for signup to prevent abuse
    const rateLimitCheck = withRateLimit(`signup:${ip}`, RATE_LIMIT_MAX_SIGNUPS, RATE_LIMIT_WINDOW_MS);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
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
    const validatedData = SignupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      await logAuditEvent(
        'unknown',
        'SIGNUP_FAILED',
        'auth',
        undefined,
        { reason: 'Email already registered' }, // Don't log email
        ip,
        userAgent
      );

      // Use generic message to prevent email enumeration
      return NextResponse.json(
        { error: 'Unable to create account. Please try a different email.' },
        { status: 400, headers: getSecureHeaders() }
      );
    }

    // Hash password with bcrypt
    const passwordHash = await hashPassword(validatedData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshTokenForStorage(refreshToken);

    // Create session with hashed refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: refreshTokenHash,
        refreshTokenHash,
        expiresAt: generateSessionExpiry(),
      },
    });

    // Log successful signup
    await logAuditEvent(user.id, 'SIGNUP', 'auth', user.id, {}, ip, userAgent);

    // Build response - refresh token in body for iOS PWA compatibility
    // See login/route.ts for full security rationale
    let response = NextResponse.json(
      {
        success: true,
        user: { id: user.id, email: user.email },
        accessToken,
        refreshToken, // Required for iOS PWA IndexedDB storage
      },
      { status: 201 }
    );

    // Set refresh token in httpOnly cookie
    response = setSecureCookie(response, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days
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

    if (process.env.NODE_ENV === 'development') {
      console.error('Signup error:', error);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getSecureHeaders() }
    );
  }
}

