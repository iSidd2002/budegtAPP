import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SignupSchema } from '@/lib/validation';
import { hashPassword, generateAccessToken, generateRefreshToken, hashRefreshTokenForStorage, generateSessionExpiry } from '@/lib/auth';
import { withRateLimit, setSecureCookie, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import { z } from 'zod';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_SIGNUPS = 3; // Max 3 accounts per IP per hour

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Strict rate limit — accounts are scarce resources
    const rl = withRateLimit(`signup:${ip}`, RATE_LIMIT_MAX_SIGNUPS, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter), ...getSecureHeaders() } }
      );
    }

    const body = await request.json();
    const { email, password } = SignupSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      await logAuditEvent('unknown', 'SIGNUP_FAILED', 'auth', undefined, { reason: 'duplicate_email' }, ip, userAgent);
      // Generic message — don't reveal whether the email exists
      return NextResponse.json(
        { error: 'Unable to create account. Please try a different email or sign in.' },
        { status: 409, headers: getSecureHeaders() }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, passwordHash } });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshTokenForStorage(refreshToken);

    await prisma.session.create({
      data: { userId: user.id, refreshToken: refreshTokenHash, refreshTokenHash, expiresAt: generateSessionExpiry() },
    });

    await logAuditEvent(user.id, 'SIGNUP', 'auth', user.id, {}, ip, userAgent);

    let response = NextResponse.json(
      { success: true, user: { id: user.id, email: user.email }, accessToken, refreshToken },
      { status: 201 }
    );

    response = setSecureCookie(response, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60,
    });

    Object.entries(getSecureHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Signup] Validation failed:', JSON.stringify(error.errors));
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400, headers: getSecureHeaders() }
      );
    }
    console.error('[Signup] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getSecureHeaders() }
    );
  }
}
