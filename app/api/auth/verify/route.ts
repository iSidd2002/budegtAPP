import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getSecureHeaders, withRateLimit, getClientIp } from '@/lib/middleware';

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_VERIFIES = 60; // 60 per minute

/**
 * Token Verification Endpoint
 *
 * Purpose: Verify if an access token is valid
 * Used by: AuthProvider to check token validity on app load
 *
 * This is a lightweight endpoint that only verifies the JWT signature
 * and expiration without making any database calls.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    // Rate limiting
    const rateLimitCheck = withRateLimit(`verify:${ip}`, RATE_LIMIT_MAX_VERIFIES, RATE_LIMIT_WINDOW_MS);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { valid: false, error: 'Too many requests' },
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
        { valid: false, error: 'Authorization header required' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    const accessToken = authHeader.substring(7);

    // Verify access token (JWT verification only, no DB call)
    const payload = verifyAccessToken(accessToken);

    if (!payload || !payload.userId) {
      return NextResponse.json(
        { valid: false, error: 'Invalid access token' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        userId: payload.userId,
      },
      { status: 200, headers: getSecureHeaders() }
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Verify] Error:', error);
    }

    return NextResponse.json(
      { valid: false, error: 'Token verification failed' },
      { status: 401, headers: getSecureHeaders() }
    );
  }
}

