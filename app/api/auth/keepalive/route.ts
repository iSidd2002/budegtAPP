import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAccessToken } from '@/lib/auth';
import { getSecureHeaders } from '@/lib/middleware';

const prisma = new PrismaClient();

/**
 * Session Keepalive Endpoint
 * 
 * Purpose: Prevent iOS from deleting PWA storage by maintaining active session
 * 
 * iOS PWA Issue:
 * - iOS deletes IndexedDB/localStorage after ~7 days of inactivity
 * - This causes users to lose authentication tokens
 * 
 * Solution:
 * - Client calls this endpoint periodically (every app open)
 * - Updates session's updatedAt timestamp
 * - Signals to iOS that the PWA is "active"
 * - Helps prevent aggressive storage eviction
 */
export async function POST(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    
    // Verify access token
    const payload = verifyAccessToken(accessToken);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      );
    }

    // Update session's updatedAt timestamp
    // This keeps the session "active" in the database
    const updatedSessions = await prisma.session.updateMany({
      where: {
        userId: payload.userId,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      data: {
        updatedAt: new Date(),
      },
    });

    console.log(`[Keepalive] Updated ${updatedSessions.count} sessions for user ${payload.userId}`);

    let response = NextResponse.json(
      {
        success: true,
        message: 'Session keepalive successful',
        sessionsUpdated: updatedSessions.count,
      },
      { status: 200 }
    );

    // Add security headers
    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('[Keepalive] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

