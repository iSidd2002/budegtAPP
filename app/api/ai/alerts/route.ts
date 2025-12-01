import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateSpendingAlerts } from '@/lib/ai';
import { verifyAccessToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get month, year, and budgetType from query params
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const budgetType = searchParams.get('budgetType') || 'personal';

    // Get budget
    const budget = await prisma.budget.findUnique({
      where: {
        userId_month_year_budgetType: {
          userId: payload.userId,
          month,
          year,
          budgetType,
        },
      },
    });

    if (!budget) {
      return NextResponse.json({ alerts: [] });
    }

    // Get current month's expenses
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    const now = new Date();

    const expenses = await prisma.expense.findMany({
      where: {
        userId: payload.userId,
        budgetType: budgetType,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        amount: true,
        category: true,
        date: true,
      },
    });

    // Calculate days left in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = now.getDate();
    const daysLeft = daysInMonth - currentDay;

    // Generate AI alerts
    const alerts = await generateSpendingAlerts(expenses, budget.amount, daysLeft);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    );
  }
}

