import { NextRequest, NextResponse } from 'next/server';

// Known attack-tool User-Agent patterns — block immediately
const ATTACK_TOOLS = [
  /sqlmap/i, /nikto/i, /acunetix/i, /nessus/i, /masscan/i,
  /nmap/i, /zgrab/i, /nuclei/i, /dirbuster/i, /gobuster/i,
  /hydra/i, /medusa/i, /metasploit/i, /havij/i, /skipfish/i,
  /wfuzz/i, /ffuf/i, /burpsuite/i, /owasp/i, /w3af/i,
];

export function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? '';
  const { pathname } = request.nextUrl;
  const { method } = request;
  const isAuthRoute = pathname.startsWith('/api/auth/');

  // Block known attack tools immediately
  if (ATTACK_TOOLS.some((p) => p.test(ua))) {
    return new NextResponse(null, { status: 403 });
  }

  // Auth POST with no User-Agent → automated scanner or scripted attack
  if (isAuthRoute && method === 'POST' && !ua.trim()) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Auth POST must declare JSON content-type
  if (isAuthRoute && method === 'POST') {
    const ct = request.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      return new NextResponse(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 415,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const res = NextResponse.next();

  // Unique request ID for tracing/audit correlation
  const requestId = crypto.randomUUID();
  res.headers.set('X-Request-ID', requestId);

  // Security headers at edge (belt-and-suspenders with API route headers)
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
