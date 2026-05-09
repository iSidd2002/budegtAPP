import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LoginSchema } from '@/lib/validation';
import { verifyPassword, generateAccessToken, generateRefreshToken, hashRefreshTokenForStorage, generateSessionExpiry } from '@/lib/auth';
import { withRateLimit, setSecureCookie, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import { z } from 'zod';

// ─── Lockout config ────────────────────────────────────────────────────────────
// Tiers: (attempts_threshold, lockout_duration_ms)
const LOCKOUT_TIERS = [
  { threshold: 5,  durationMs: 15 * 60 * 1000 },   // 5  fails → 15 min
  { threshold: 10, durationMs: 60 * 60 * 1000 },   // 10 fails → 1 hour
  { threshold: 20, durationMs: 24 * 60 * 60 * 1000 }, // 20 fails → 24 hours
];

// Progressive delay: 500ms * failedAttempts, capped at 4 seconds
const DELAY_PER_ATTEMPT_MS = 500;
const MAX_DELAY_MS = 4000;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 20;

interface LockoutRecord {
  attempts: number;
  lockedUntil: number;
  firstAttemptAt: number;
}
const lockoutStore = new Map<string, LockoutRecord>();

function getLockoutDuration(attempts: number): number {
  let duration = 0;
  for (const tier of LOCKOUT_TIERS) {
    if (attempts >= tier.threshold) duration = tier.durationMs;
  }
  return duration;
}

// ─── Route ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Check lockout FIRST — before any work
    const record = lockoutStore.get(ip);
    if (record && record.lockedUntil > Date.now()) {
      const retryAfter = Math.ceil((record.lockedUntil - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Account temporarily locked due to too many failed attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter), ...getSecureHeaders() } }
      );
    }

    // Rate limit by IP across the window
    const rl = withRateLimit(`login:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter), ...getSecureHeaders() } }
      );
    }

    // Parse + validate body
    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    // ── Lookup user ──
    const user = await prisma.user.findUnique({ where: { email } });

    // ── Track failure helper ──
    const trackFailure = async (reason: string, userId?: string) => {
      const cur = lockoutStore.get(ip) ?? { attempts: 0, lockedUntil: 0, firstAttemptAt: Date.now() };
      cur.attempts++;

      const lockDuration = getLockoutDuration(cur.attempts);
      if (lockDuration > 0) cur.lockedUntil = Date.now() + lockDuration;
      lockoutStore.set(ip, cur);

      await logAuditEvent(
        userId ?? 'unknown', 'LOGIN_FAILED', 'auth', userId,
        { reason, attempt: cur.attempts }, ip, userAgent
      );

      // Progressive artificial delay — slows brute force to ≤2 attempts/sec
      const delay = Math.min(cur.attempts * DELAY_PER_ATTEMPT_MS, MAX_DELAY_MS);
      await new Promise((r) => setTimeout(r, delay));
    };

    if (!user) {
      // Still run a dummy bcrypt comparison to prevent timing-based user enumeration
      await verifyPassword(password, '$2a$12$dummyhashthatisnevervalidXXXXXXXXXXXXXXXXXXXXXXXX');
      await trackFailure('user_not_found');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      await trackFailure('invalid_password', user.id);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401, headers: getSecureHeaders() }
      );
    }

    // ── Success ──
    lockoutStore.delete(ip);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshTokenForStorage(refreshToken);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: refreshTokenHash,
        refreshTokenHash,
        expiresAt: generateSessionExpiry(),
      },
    });

    await logAuditEvent(user.id, 'LOGIN', 'auth', user.id, {}, ip, userAgent);

    let response = NextResponse.json(
      { success: true, user: { id: user.id, email: user.email }, accessToken, refreshToken },
      { status: 200 }
    );

    response = setSecureCookie(response, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60,
    });

    Object.entries(getSecureHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Login] Validation failed:', JSON.stringify(error.errors));
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400, headers: getSecureHeaders() }
      );
    }
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getSecureHeaders() }
    );
  }
}
