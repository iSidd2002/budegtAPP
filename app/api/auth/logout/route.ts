import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const auth = await withAuth(request);
    if ('error' in auth) {
      // Still clear cookies even if auth fails
      let response = NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: getSecureHeaders() }
      );
      response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });
      return response;
    }

    // Revoke all sessions for this user (logout everywhere)
    const revokedCount = await prisma.session.updateMany({
      where: {
        userId: auth.userId,
        revokedAt: null, // Only revoke active sessions
      },
      data: { revokedAt: new Date() },
    });

    // Log audit event
    await logAuditEvent(
      auth.userId,
      'LOGOUT',
      'auth',
      auth.userId,
      { sessionsRevoked: revokedCount.count },
      ip,
      userAgent
    );

    // Build response
    let response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
        sessionsRevoked: revokedCount.count,
      },
      { status: 200 }
    );

    // Clear refresh token cookie
    response.cookies.set('refreshToken', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Add security headers
    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Logout error:', error);
    }

    // Still try to clear cookies on error
    let response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getSecureHeaders() }
    );
    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });
    return response;
  }
}

