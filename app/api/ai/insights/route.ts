/**
 * API Route: GET /api/ai/insights
 * Generates AI-powered spending insights based on user's expenses
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateSpendingInsights } from '@/lib/ai';
import { withAuth } from '@/lib/middleware';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Get user's budget
    const budget = await prisma.budget.findFirst({
      where: { userId: auth.userId },
    });

    if (!budget) {
      return NextResponse.json(
        { insights: [], message: 'No budget set' },
        { status: 200 }
      );
    }

    // Get expenses for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const rawExpenses = await prisma.expense.findMany({
      where: {
        userId: auth.userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        category: true,
        amount: true,
        date: true,
      },
    });

    if (rawExpenses.length === 0) {
      return NextResponse.json(
        { insights: [], message: 'No expenses this month' },
        { status: 200 }
      );
    }

    // Convert dates to strings for AI function
    const expenses = rawExpenses.map((exp) => ({
      category: exp.category,
      amount: exp.amount,
      date: exp.date.toISOString(),
    }));

    // Calculate total spent
    const spent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Get AI insights with timeout
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve([]), 5000) // 5 second timeout
    );

    const insightsPromise = generateSpendingInsights(expenses, budget.amount, spent);

    const insights = await Promise.race([insightsPromise, timeoutPromise]);

    return NextResponse.json(
      {
        insights: insights || [],
        summary: {
          budget: budget.amount,
          spent,
          remaining: budget.amount - spent,
          percentage: ((spent / budget.amount) * 100).toFixed(1),
          expenseCount: expenses.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in insights:', error);
    return NextResponse.json(
      { insights: [], error: 'Failed to generate insights' },
      { status: 200 } // Return 200 so frontend doesn't break
    );
  }
}

