import { POST as signupHandler } from '@/app/api/auth/signup/route';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

// Mock NextRequest
function createMockRequest(body: any, headers: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/auth/signup');
  const request = new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  return request;
}

describe('Auth API', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid credentials', async () => {
      const request = createMockRequest({
        email: 'newuser@test.com',
        password: 'SecurePassword123',
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('newuser@test.com');
      expect(data.accessToken).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const request = createMockRequest({
        email: 'invalid-email',
        password: 'SecurePassword123',
      });

      const response = await signupHandler(request);
      expect(response.status).toBe(400);
    });

    it('should reject short password', async () => {
      const request = createMockRequest({
        email: 'user@test.com',
        password: 'short',
      });

      const response = await signupHandler(request);
      expect(response.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      // Create first user
      const request1 = createMockRequest({
        email: 'duplicate@test.com',
        password: 'SecurePassword123',
      });
      await signupHandler(request1);

      // Try to create duplicate
      const request2 = createMockRequest({
        email: 'duplicate@test.com',
        password: 'SecurePassword123',
      });

      const response = await signupHandler(request2);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const request = createMockRequest({
        email: 'login@test.com',
        password: 'SecurePassword123',
      });
      await signupHandler(request);
    });

    it('should login with valid credentials', async () => {
      const url = new URL('http://localhost:3000/api/auth/login');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          email: 'login@test.com',
          password: 'SecurePassword123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const url = new URL('http://localhost:3000/api/auth/login');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          email: 'login@test.com',
          password: 'WrongPassword',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const url = new URL('http://localhost:3000/api/auth/login');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'SecurePassword123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(401);
    });
  });
});

