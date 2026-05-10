import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken, hashRefreshTokenForStorage, generateSessionExpiry } from '@/lib/auth';
import { logAuditEvent, getClientIp, getSecureHeaders, withRateLimit, setSecureCookie } from '@/lib/middleware';

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

    // Accept refresh token from body (normal) or httpOnly cookie (iOS PWA cookie-recovery path)
    const refreshTokenFromCookie = request.cookies.get('refreshToken')?.value;
    const body = await request.json().catch(() => ({}));
    // body.refreshToken takes priority so normal flow isn't affected;
    // cookie is the fallback for when IndexedDB was evicted by iOS
    const refreshToken = body.refreshToken || refreshTokenFromCookie;

    // Detect cookie-only recovery: no token in body → iOS storage was wiped
    const isCookieRecovery = !body.refreshToken && !!refreshTokenFromCookie;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    const tokenHash = hashRefreshTokenForStorage(refreshToken);

    // Find valid session — revokedAt uses isSet:false because Prisma+MongoDB stores
    // unset optional fields as absent (not null), so `null` equality never matches.
    const session = await prisma.session.findFirst({
      where: {
        refreshToken: tokenHash,
        revokedAt: { isSet: false },
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

    // Issue a new access token
    const accessToken = generateAccessToken(session.userId);

    // On cookie-recovery: rotate the refresh token so the client can re-populate IndexedDB.
    // Without this the client has no token to store and would need cookie round-trips every open.
    let newRefreshTokenPlain: string | undefined;
    if (isCookieRecovery) {
      newRefreshTokenPlain = generateRefreshToken();
      const newHash = hashRefreshTokenForStorage(newRefreshTokenPlain);
      await prisma.session.update({
        where: { id: session.id },
        data: { refreshToken: newHash, refreshTokenHash: newHash, expiresAt: generateSessionExpiry() },
      });
    }

    await logAuditEvent(session.userId, 'TOKEN_REFRESH', 'auth', session.userId,
      { cookieRecovery: isCookieRecovery }, ip, userAgent);

    let response = NextResponse.json(
      { success: true, accessToken, ...(newRefreshTokenPlain && { refreshToken: newRefreshTokenPlain }) },
      { status: 200 }
    );

    if (newRefreshTokenPlain) {
      // Update the httpOnly cookie with the rotated refresh token
      response = setSecureCookie(response, 'refreshToken', newRefreshTokenPlain, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 90 * 24 * 60 * 60,
      });
    }

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
