import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { suggestBudget } from '@/lib/ai';
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

    // Get current budget
    const currentBudget = await prisma.budget.findUnique({
      where: {
        userId_month_year_budgetType: {
          userId: payload.userId,
          month,
          year,
          budgetType,
        },
      },
    });

    // Get last 3 months of expenses for better recommendations
    const threeMonthsAgo = new Date(year, month - 4, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const expenses = await prisma.expense.findMany({
      where: {
        userId: payload.userId,
        budgetType: budgetType,
        date: {
          gte: threeMonthsAgo,
          lte: endOfMonth,
        },
      },
      select: {
        amount: true,
        category: true,
        date: true,
      },
    });

    // Generate AI budget recommendation
    const recommendation = await suggestBudget(expenses, currentBudget?.amount);

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error('Error in budget-recommendation API:', error);
    return NextResponse.json(
      { error: 'Failed to generate budget recommendation' },
      { status: 500 }
    );
  }
}

