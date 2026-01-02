import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAccessToken, generateSessionExpiry } from '@/lib/auth';
import { getSecureHeaders, withRateLimit, getClientIp } from '@/lib/middleware';

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_KEEPALIVES = 20; // 20 per minute max (increased for PWA)
const SESSION_EXTEND_THRESHOLD_DAYS = 30; // Extend session if less than 30 days remaining

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
 * - Extends session expiry if less than 30 days remaining (rolling session)
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

    // Calculate threshold for session extension
    const extendThresholdDate = new Date();
    extendThresholdDate.setDate(extendThresholdDate.getDate() + SESSION_EXTEND_THRESHOLD_DAYS);

    // Find sessions that need extension (expiring within threshold)
    const sessionsNeedingExtension = await prisma.session.findMany({
      where: {
        userId: payload.userId,
        revokedAt: null,
        expiresAt: {
          gte: new Date(),
          lte: extendThresholdDate, // Expiring within threshold
        },
      },
      select: { id: true },
    });

    // Extend sessions that are expiring soon
    let sessionsExtended = 0;
    if (sessionsNeedingExtension.length > 0) {
      const newExpiry = generateSessionExpiry();
      const result = await prisma.session.updateMany({
        where: {
          id: { in: sessionsNeedingExtension.map(s => s.id) },
        },
        data: {
          expiresAt: newExpiry,
          updatedAt: new Date(),
        },
      });
      sessionsExtended = result.count;
    }

    // Update remaining sessions' updatedAt timestamp (for activity tracking)
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
        sessionsExtended: sessionsExtended,
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

