import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SetBudgetSchema } from '@/lib/validation';
import { withAuth, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import { z } from 'zod';

const prisma = new PrismaClient();

// POST: Set budget
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ip = getClientIp(request);
    const body = await request.json();
    const validatedData = SetBudgetSchema.parse(body);

    // Upsert budget
    const budget = await prisma.budget.upsert({
      where: {
        userId_month_year: {
          userId: auth.userId,
          month: validatedData.month,
          year: validatedData.year,
        },
      },
      update: { amount: validatedData.amount },
      create: {
        userId: auth.userId,
        amount: validatedData.amount,
        month: validatedData.month,
        year: validatedData.year,
      },
    });

    await logAuditEvent(
      auth.userId,
      'BUDGET_SET',
      'budget',
      budget.id,
      { amount: budget.amount, month: budget.month, year: budget.year },
      ip
    );

    let response = NextResponse.json(
      { success: true, budget },
      { status: 201 }
    );

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

    console.error('Set budget error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get budget and summary
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Get budget
    const budget = await prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId: auth.userId,
          month,
          year,
        },
      },
    });

    // Get expenses for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const expenses = await prisma.expense.findMany({
      where: {
        userId: auth.userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = budget ? budget.amount - totalSpent : null;

    // Category breakdown
    const categoryBreakdown = expenses.reduce(
      (acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    let response = NextResponse.json(
      {
        success: true,
        budget,
        summary: {
          month,
          year,
          totalSpent,
          budgetAmount: budget?.amount || null,
          remaining,
          expenseCount: expenses.length,
        },
        categoryBreakdown,
        expenses,
      },
      { status: 200 }
    );

    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Get budget error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

