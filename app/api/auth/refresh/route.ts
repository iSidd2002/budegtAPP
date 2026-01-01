import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken, hashRefreshTokenForStorage, generateSessionExpiry } from '@/lib/auth';
import { setSecureCookie, logAuditEvent, getClientIp, getSecureHeaders, withRateLimit } from '@/lib/middleware';

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REFRESHES = 30; // Allow 30 refreshes per minute

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    // Rate limiting to prevent token refresh abuse
    const rateLimitCheck = withRateLimit(`refresh:${ip}`, RATE_LIMIT_MAX_REFRESHES, RATE_LIMIT_WINDOW_MS);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many refresh attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.retryAfter),
            ...getSecureHeaders(),
          }
        }
      );
    }

    // Get refresh token from cookie (preferred) or body (PWA fallback)
    const refreshTokenFromCookie = request.cookies.get('refreshToken')?.value;
    const body = await request.json().catch(() => ({}));
    const refreshToken = refreshTokenFromCookie || body.refreshToken;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    // Hash the incoming token for lookup (since we store hashes, not plaintext)
    const tokenHash = hashRefreshTokenForStorage(refreshToken);

    // Find session by refresh token hash
    const session = await prisma.session.findFirst({
      where: {
        refreshToken: tokenHash, // Now comparing hashes
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      // Log potential token reuse attempt (could indicate token theft)
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

    // Revoke old session (token rotation)
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshTokenForStorage(newRefreshToken);

    await prisma.session.create({
      data: {
        userId: session.userId,
        refreshToken: newRefreshTokenHash,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: generateSessionExpiry(),
      },
    });

    // Generate new access token
    const accessToken = generateAccessToken(session.userId);

    // Log successful refresh
    await logAuditEvent(session.userId, 'TOKEN_REFRESH', 'auth', session.userId, {}, ip, userAgent);

    // Build response - refresh token in body for iOS PWA compatibility
    // See login/route.ts for full security rationale
    let response = NextResponse.json(
      {
        success: true,
        accessToken,
        refreshToken: newRefreshToken, // Required for iOS PWA IndexedDB storage
      },
      { status: 200 }
    );

    // Set new refresh token in httpOnly cookie
    response = setSecureCookie(response, 'refreshToken', newRefreshToken, {
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
    if (process.env.NODE_ENV === 'development') {
      console.error('Refresh token error:', error);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getSecureHeaders() }
    );
  }
}

