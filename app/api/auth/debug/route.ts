import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check auth state
 * Only available in development
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    const refreshTokenCookie = request.cookies.get('refreshToken')?.value;
    
    console.log('[DEBUG] Auth header:', !!authHeader);
    console.log('[DEBUG] Refresh token cookie:', !!refreshTokenCookie);
    
    return NextResponse.json({
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length || 0,
      hasRefreshTokenCookie: !!refreshTokenCookie,
      refreshTokenCookieLength: refreshTokenCookie?.length || 0,
      cookies: Object.fromEntries(
        Array.from(request.cookies.getAll()).map(cookie => [cookie.name, !!cookie.value])
      ),
      headers: {
        userAgent: request.headers.get('User-Agent'),
        origin: request.headers.get('Origin'),
        referer: request.headers.get('Referer'),
      }
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}
