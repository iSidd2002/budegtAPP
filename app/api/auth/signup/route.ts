import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SignupSchema } from '@/lib/validation';
import { hashPassword, generateAccessToken, generateRefreshToken, hashRefreshToken, generateSessionExpiry } from '@/lib/auth';
import { withRateLimit, setSecureCookie, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import { z } from 'zod';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitCheck = withRateLimit(`signup:${ip}`, 5, 3600000); // 5 per hour
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimitCheck.retryAfter) } }
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
        { reason: 'User already exists', email: validatedData.email },
        ip
      );
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
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
    await logAuditEvent(user.id, 'SIGNUP', 'auth', user.id, { email: user.email }, ip);

    // Set secure cookies
    let response = NextResponse.json(
      {
        success: true,
        user: { id: user.id, email: user.email },
        accessToken,
        refreshToken, // Send refresh token in response for localStorage storage (PWA compatibility)
      },
      { status: 201 }
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

    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

