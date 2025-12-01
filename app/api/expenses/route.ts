import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CreateExpenseSchema, GetExpensesSchema } from '@/lib/validation';
import { withAuth, withRateLimit, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import { z } from 'zod';

const prisma = new PrismaClient();

// POST: Create expense
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ip = getClientIp(request);

    // Rate limiting: 100 requests per minute per user
    const rateLimitCheck = withRateLimit(`expense:${auth.userId}`, 100, 60000);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimitCheck.retryAfter) } }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateExpenseSchema.parse(body);

    // Create expense with parameterized query (Prisma handles this)
    const expense = await prisma.expense.create({
      data: {
        userId: auth.userId,
        amount: validatedData.amount,
        category: validatedData.category,
        date: new Date(validatedData.date),
        note: validatedData.note,
        budgetType: validatedData.budgetType || 'personal',
        isRecurring: validatedData.isRecurring || false,
        recurringFrequency: validatedData.recurringFrequency,
        recurringEndDate: validatedData.recurringEndDate ? new Date(validatedData.recurringEndDate) : null,
      },
    });

    // Log audit event
    await logAuditEvent(
      auth.userId,
      'EXPENSE_CREATE',
      'expense',
      expense.id,
      {
        amount: expense.amount,
        category: expense.category,
        budgetType: expense.budgetType,
        isRecurring: expense.isRecurring,
      },
      ip
    );

    let response = NextResponse.json(
      {
        success: true,
        expense,
      },
      { status: 201 }
    );

    // Add security headers
    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: List expenses
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      category: searchParams.get('category') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const validatedQuery = GetExpensesSchema.parse(queryData);

    // Build query filters
    const where: any = { userId: auth.userId };
    if (validatedQuery.startDate) {
      where.date = { gte: new Date(validatedQuery.startDate) };
    }
    if (validatedQuery.endDate) {
      if (where.date) {
        where.date.lte = new Date(validatedQuery.endDate);
      } else {
        where.date = { lte: new Date(validatedQuery.endDate) };
      }
    }
    if (validatedQuery.category) {
      where.category = validatedQuery.category;
    }

    // Fetch expenses with parameterized query
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: validatedQuery.limit,
      skip: validatedQuery.offset,
    });

    const total = await prisma.expense.count({ where });

    let response = NextResponse.json(
      {
        success: true,
        expenses,
        pagination: {
          total,
          limit: validatedQuery.limit,
          offset: validatedQuery.offset,
        },
      },
      { status: 200 }
    );

    // Add security headers
    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Get expenses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

