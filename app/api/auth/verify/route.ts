import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

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
  try {
    console.log('[API] /api/auth/verify - Starting token verification');

    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('[API] /api/auth/verify - Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[API] /api/auth/verify - No valid auth header');
      return NextResponse.json(
        { valid: false, error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    console.log('[API] /api/auth/verify - Token length:', accessToken.length);

    // Verify access token
    const payload = verifyAccessToken(accessToken);
    console.log('[API] /api/auth/verify - Payload:', !!payload, payload ? `userId: ${payload.userId}` : 'null');

    if (!payload || !payload.userId) {
      console.log('[API] /api/auth/verify - Invalid token payload');
      return NextResponse.json(
        { valid: false, error: 'Invalid access token' },
        { status: 401 }
      );
    }

    console.log('[API] /api/auth/verify - Token valid for userId:', payload.userId);
    return NextResponse.json(
      {
        valid: true,
        userId: payload.userId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/auth/verify - Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Token verification failed' },
      { status: 401 }
    );
  }
}

