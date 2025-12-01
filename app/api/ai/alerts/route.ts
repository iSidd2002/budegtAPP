import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateSpendingAlerts, BudgetType } from '@/lib/ai';
import { verifyAccessToken } from '@/lib/auth';

const prisma = new PrismaClient();

// Simple in-memory cache for AI alerts (3 minute TTL)
const alertsCache = new Map<string, { data: string[]; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function getCacheKey(userId: string, month: number, year: number, budgetType: string): string {
  return `alerts-${userId}-${month}-${year}-${budgetType}`;
}

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
    const budgetType = (searchParams.get('budgetType') || 'personal') as BudgetType;

    // Check cache first
    const cacheKey = getCacheKey(payload.userId, month, year, budgetType);
    const cached = alertsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ alerts: cached.data, budgetType, cached: true });
    }

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
      // Return budget-type specific message when no budget is set
      const noBudgetAlert = budgetType === 'family'
        ? ['👨‍👩‍👧‍👦 Set a family budget to get personalized household spending alerts!']
        : ['👤 Set a personal budget to get personalized spending alerts!'];
      return NextResponse.json({ alerts: noBudgetAlert, budgetType });
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
    const daysLeft = Math.max(daysInMonth - currentDay, 0);

    // Generate AI alerts with budget type context
    const alerts = await generateSpendingAlerts(expenses, budget.amount, daysLeft, budgetType);

    // Cache the result
    alertsCache.set(cacheKey, { data: alerts, timestamp: Date.now() });

    // Clean up old cache entries
    for (const [key, value] of alertsCache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL * 2) {
        alertsCache.delete(key);
      }
    }

    return NextResponse.json({ alerts, budgetType });
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    );
  }
}

