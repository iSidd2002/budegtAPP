import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { suggestBudget, BudgetType } from '@/lib/ai';
import { verifyAccessToken } from '@/lib/auth';

// Simple in-memory cache for AI recommendations (5 minute TTL)
const recommendationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: string, month: number, year: number, budgetType: string): string {
  return `${userId}-${month}-${year}-${budgetType}`;
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
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, cached: true });
    }

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

    // Generate AI budget recommendation with budget type context
    const recommendation = await suggestBudget(expenses, currentBudget?.amount, budgetType);

    // Cache the result
    recommendationCache.set(cacheKey, { data: recommendation, timestamp: Date.now() });

    // Clean up old cache entries
    for (const [key, value] of recommendationCache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL * 2) {
        recommendationCache.delete(key);
      }
    }

    return NextResponse.json({ ...recommendation, budgetType });
  } catch (error) {
    console.error('Error in budget-recommendation API:', error);
    return NextResponse.json(
      { error: 'Failed to generate budget recommendation' },
      { status: 500 }
    );
  }
}

