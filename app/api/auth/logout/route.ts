import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAuth, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ip = getClientIp(request);

    // Revoke all sessions for this user
    await prisma.session.updateMany({
      where: { userId: auth.userId },
      data: { revokedAt: new Date() },
    });

    // Log audit event
    await logAuditEvent(auth.userId, 'LOGOUT', 'auth', auth.userId, {}, ip);

    // Clear cookies
    let response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });

    // Add security headers
    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

