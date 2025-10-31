import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { LoginSchema } from '@/lib/validation';
import { verifyPassword, generateAccessToken, generateRefreshToken, hashRefreshToken, generateSessionExpiry } from '@/lib/auth';
import { withRateLimit, setSecureCookie, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import { z } from 'zod';

const prisma = new PrismaClient();

// Account lockout tracking (in production, use Redis)
const lockoutStore = new Map<string, { attempts: number; lockedUntil: number }>();

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Check account lockout
    const lockout = lockoutStore.get(ip);
    if (lockout && lockout.lockedUntil > Date.now()) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((lockout.lockedUntil - Date.now()) / 1000)) } }
      );
    }

    // Rate limiting
    const rateLimitCheck = withRateLimit(`login:${ip}`, 10, 900000); // 10 per 15 minutes
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimitCheck.retryAfter) } }
      );
    }

    // Parse and validate
    const body = await request.json();
    const validatedData = LoginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      // Track failed attempt
      const current = lockoutStore.get(ip) || { attempts: 0, lockedUntil: 0 };
      current.attempts++;
      if (current.attempts >= 5) {
        current.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minute lockout
      }
      lockoutStore.set(ip, current);

      await logAuditEvent(
        'unknown',
        'LOGIN_FAILED',
        'auth',
        undefined,
        { reason: 'User not found', email: validatedData.email },
        ip
      );

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(validatedData.password, user.passwordHash);
    if (!passwordValid) {
      const current = lockoutStore.get(ip) || { attempts: 0, lockedUntil: 0 };
      current.attempts++;
      if (current.attempts >= 5) {
        current.lockedUntil = Date.now() + 15 * 60 * 1000;
      }
      lockoutStore.set(ip, current);

      await logAuditEvent(
        user.id,
        'LOGIN_FAILED',
        'auth',
        user.id,
        { reason: 'Invalid password' },
        ip
      );

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Clear lockout on successful login
    lockoutStore.delete(ip);

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = await hashRefreshToken(refreshToken);

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        refreshTokenHash,
        expiresAt: generateSessionExpiry(),
      },
    });

    // Log audit event
    await logAuditEvent(user.id, 'LOGIN', 'auth', user.id, {}, ip);

    // Set secure cookies
    let response = NextResponse.json(
      {
        success: true,
        user: { id: user.id, email: user.email },
        accessToken,
      },
      { status: 200 }
    );

    response = setSecureCookie(response, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax', // Changed from 'Strict' to 'Lax' for PWA compatibility
      maxAge: 7 * 24 * 60 * 60,
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
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

