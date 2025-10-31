import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAuth, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ip = getClientIp(request);
    const body = await request.json();
    const { month, year, deleteExpenses } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Start a transaction to ensure both operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Reset budget to 0
      const budget = await tx.budget.upsert({
        where: {
          userId_month_year: {
            userId: auth.userId,
            month: parseInt(month),
            year: parseInt(year),
          },
        },
        update: {
          amount: 0,
        },
        create: {
          userId: auth.userId,
          month: parseInt(month),
          year: parseInt(year),
          amount: 0,
        },
      });

      let deletedCount = 0;

      // Delete expenses if requested
      if (deleteExpenses === true) {
        // Calculate date range for the month
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

        const deleteResult = await tx.expense.deleteMany({
          where: {
            userId: auth.userId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });
        deletedCount = deleteResult.count;
      }

      return { budget, deletedCount };
    });

    // Log audit event
    await logAuditEvent(
      auth.userId,
      'BUDGET_RESET',
      'budget',
      result.budget.id,
      {
        month,
        year,
        deletedExpenses: result.deletedCount,
      },
      ip
    );

    // Add security headers
    let response = NextResponse.json(
      {
        success: true,
        budget: result.budget,
        deletedExpenses: result.deletedCount,
      },
      { status: 200 }
    );

    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Budget reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

