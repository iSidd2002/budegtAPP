import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateAccessToken, hashRefreshTokenForStorage } from '@/lib/auth';
import { logAuditEvent, getClientIp, getSecureHeaders, withRateLimit } from '@/lib/middleware';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REFRESHES = 30;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const rateLimitCheck = withRateLimit(`refresh:${ip}`, RATE_LIMIT_MAX_REFRESHES, RATE_LIMIT_WINDOW_MS);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many refresh attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimitCheck.retryAfter), ...getSecureHeaders() } }
      );
    }

    // Accept refresh token from cookie (web) or body (iOS PWA fallback)
    const refreshTokenFromCookie = request.cookies.get('refreshToken')?.value;
    const body = await request.json().catch(() => ({}));
    const refreshToken = refreshTokenFromCookie || body.refreshToken;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    const tokenHash = hashRefreshTokenForStorage(refreshToken);

    // Find valid session — no rotation, session stays alive for its full 90-day window
    const session = await prisma.session.findFirst({
      where: {
        refreshToken: tokenHash,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      await logAuditEvent(
        'unknown',
        'TOKEN_REFRESH_FAILED',
        'auth',
        undefined,
        { reason: 'Invalid or expired token' },
        ip,
        userAgent
      );

      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    // Issue a new access token — same session/refresh token stays valid
    const accessToken = generateAccessToken(session.userId);

    await logAuditEvent(session.userId, 'TOKEN_REFRESH', 'auth', session.userId, {}, ip, userAgent);

    const response = NextResponse.json(
      { success: true, accessToken },
      { status: 200 }
    );

    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Refresh token error:', error);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getSecureHeaders() }
    );
  }
}
