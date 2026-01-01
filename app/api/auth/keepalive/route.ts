import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { getSecureHeaders, withRateLimit, getClientIp } from '@/lib/middleware';

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_KEEPALIVES = 10; // 10 per minute max

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
  const ip = getClientIp(request);

  try {
    // Rate limiting to prevent DoS
    const rateLimitCheck = withRateLimit(`keepalive:${ip}`, RATE_LIMIT_MAX_KEEPALIVES, RATE_LIMIT_WINDOW_MS);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.retryAfter),
            ...getSecureHeaders(),
          }
        }
      );
    }

    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    const accessToken = authHeader.substring(7);

    // Verify access token
    const payload = verifyAccessToken(accessToken);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    // Update session's updatedAt timestamp
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
    if (process.env.NODE_ENV === 'development') {
      console.error('[Keepalive] Error:', error);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getSecureHeaders() }
    );
  }
}

