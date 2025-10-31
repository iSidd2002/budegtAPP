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
    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { valid: false, error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    
    // Verify access token
    const payload = verifyAccessToken(accessToken);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { valid: false, error: 'Invalid access token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        userId: payload.userId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Verify] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Token verification failed' },
      { status: 401 }
    );
  }
}

