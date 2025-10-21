import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET || 'dev-secret-change-in-production',
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(): string {
  return uuidv4();
}

export async function hashRefreshToken(token: string): Promise<string> {
  return bcryptjs.hash(token, SALT_ROUNDS);
}

export async function verifyRefreshToken(token: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(token, hash);
}

export function verifyAccessToken(token: string): { userId: string; type: string } | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-secret-change-in-production'
    ) as { userId: string; type: string };
    return decoded;
  } catch {
    return null;
  }
}

export function generateSessionExpiry(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7); // 7 days
  return date;
}

