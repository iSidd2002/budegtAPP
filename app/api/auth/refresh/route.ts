import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateAccessToken, generateRefreshToken, hashRefreshToken, verifyRefreshToken, generateSessionExpiry } from '@/lib/auth';
import { setSecureCookie, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Get refresh token from cookie or body
    const refreshTokenFromCookie = request.cookies.get('refreshToken')?.value;
    const body = await request.json().catch(() => ({}));
    const refreshToken = refreshTokenFromCookie || body.refreshToken;

    console.log('[Refresh API] Has cookie refreshToken:', !!refreshTokenFromCookie);
    console.log('[Refresh API] Has body refreshToken:', !!body.refreshToken);
    console.log('[Refresh API] Using refreshToken from:', refreshTokenFromCookie ? 'cookie' : 'body');

    if (!refreshToken) {
      console.log('[Refresh API] No refresh token provided');
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 401 }
      );
    }

    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    console.log('[Refresh API] Session found:', !!session);
    if (session) {
      console.log('[Refresh API] Session revoked:', !!session.revokedAt);
      console.log('[Refresh API] Session expired:', session.expiresAt < new Date());
    }

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      console.log('[Refresh API] Session invalid or expired');
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Verify refresh token hash
    const tokenValid = await verifyRefreshToken(refreshToken, session.refreshTokenHash);
    if (!tokenValid) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Rotate refresh token (revoke old, create new)
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = await hashRefreshToken(newRefreshToken);

    await prisma.session.create({
      data: {
        userId: session.userId,
        refreshToken: newRefreshToken,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: generateSessionExpiry(),
      },
    });

    // Generate new access token
    const accessToken = generateAccessToken(session.userId);

    // Log audit event
    await logAuditEvent(session.userId, 'TOKEN_REFRESH', 'auth', session.userId, {}, ip);

    // Set new refresh token cookie
    let response = NextResponse.json(
      {
        success: true,
        accessToken,
        refreshToken: newRefreshToken, // Send new refresh token in response for localStorage storage (PWA compatibility)
      },
      { status: 200 }
    );

    response = setSecureCookie(response, 'refreshToken', newRefreshToken, {
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
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

