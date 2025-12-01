import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateSpendingInsights, BudgetType } from '@/lib/ai';
import { verifyAccessToken } from '@/lib/auth';

const prisma = new PrismaClient();

// Simple in-memory cache for AI insights (5 minute TTL)
const insightsCache = new Map<string, { data: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: string, month: number, year: number, budgetType: string): string {
  return `insights-${userId}-${month}-${year}-${budgetType}`;
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
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));
    const budgetType = (searchParams.get('budgetType') || 'personal') as BudgetType;

    // Check cache first
    const cacheKey = getCacheKey(payload.userId, month, year, budgetType);
    const cached = insightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ insights: cached.data, budgetType, cached: true });
    }

    // Get current month's expenses filtered by budget type
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

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
        note: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Generate AI insights with budget type context
    const insights = await generateSpendingInsights(expenses, budgetType);

    // Cache the result
    insightsCache.set(cacheKey, { data: insights, timestamp: Date.now() });

    // Clean up old cache entries
    for (const [key, value] of insightsCache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL * 2) {
        insightsCache.delete(key);
      }
    }

    return NextResponse.json({ insights, budgetType });
  } catch (error) {
    console.error('Error in insights API:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

