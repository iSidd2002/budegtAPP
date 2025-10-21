import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function withAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  return { userId: decoded.userId };
}

export function withRateLimit(
  key: string,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

export function withCSRFProtection(request: NextRequest) {
  const csrfToken = request.headers.get('x-csrf-token');
  const sessionCookie = request.cookies.get('csrf-token')?.value;

  if (!csrfToken || !sessionCookie || csrfToken !== sessionCookie) {
    return { error: 'CSRF token validation failed', status: 403 };
  }

  return { valid: true };
}

export function setSecureCookie<T extends NextResponse>(
  response: T,
  name: string,
  value: string,
  options: { httpOnly?: boolean; secure?: boolean; sameSite?: string; maxAge?: number } = {}
): T {
  const cookieOptions = {
    httpOnly: options.httpOnly !== false,
    secure: process.env.NODE_ENV === 'production' || options.secure !== false,
    sameSite: options.sameSite || 'Strict',
    maxAge: options.maxAge || 7 * 24 * 60 * 60, // 7 days
    path: '/',
  };

  response.cookies.set(name, value, cookieOptions as any);
  return response;
}

export async function logAuditEvent(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        details: details ? JSON.stringify(details) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function getSecureHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

