import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAuth, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import Papa from 'papaparse';

const prisma = new PrismaClient();

type BudgetType = 'personal' | 'family';

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ip = getClientIp(request);
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get budget type parameter (defaults to 'personal' for backward compatibility)
    const budgetTypeParam = searchParams.get('budgetType');
    const budgetType: BudgetType = budgetTypeParam === 'family' ? 'family' : 'personal';

    // Get optional month/year for filename
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const month = monthParam ? parseInt(monthParam) : new Date().getMonth() + 1;
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    // Build query with budgetType filter
    const where: any = {
      userId: auth.userId,
      budgetType: budgetType,
    };

    if (startDate) {
      where.date = { gte: new Date(startDate) };
    }
    if (endDate) {
      if (where.date) {
        where.date.lte = new Date(endDate);
      } else {
        where.date = { lte: new Date(endDate) };
      }
    }

    // Fetch expenses filtered by budget type
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Calculate summary statistics
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const expenseCount = expenses.length;
    const categories = [...new Set(expenses.map(exp => exp.category))];
    const categoryBreakdown = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    // Log audit event with budget type
    await logAuditEvent(
      auth.userId,
      'EXPORT_DATA',
      'expense',
      undefined,
      { format, count: expenses.length, budgetType },
      ip
    );

    // Generate filename with budget type
    const paddedMonth = String(month).padStart(2, '0');
    const baseFilename = `expenses-${budgetType}-${paddedMonth}-${year}`;

    if (format === 'csv') {
      // Add header row with metadata as comments
      const metadataRows = [
        ['# Budget App Export'],
        [`# Budget Type: ${budgetType.charAt(0).toUpperCase() + budgetType.slice(1)}`],
        [`# Period: ${month}/${year}`],
        [`# Export Date: ${new Date().toISOString()}`],
        [`# Total Expenses: ${expenseCount}`],
        [`# Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`],
        [''],
      ];

      const csvData = expenses.map((exp) => ({
        Date: exp.date.toISOString().split('T')[0],
        Category: exp.category,
        Amount: exp.amount,
        'Budget Type': budgetType.charAt(0).toUpperCase() + budgetType.slice(1),
        Note: exp.note || '',
        Recurring: exp.isRecurring ? 'Yes' : 'No',
      }));

      const csvContent = Papa.unparse(csvData);
      const metadataText = metadataRows.map(row => row.join(',')).join('\n');
      const fullCsv = metadataText + csvContent;

      const response = new NextResponse(fullCsv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseFilename}.csv"`,
        },
      });

      Object.entries(getSecureHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    if (format === 'json') {
      const exportData = {
        success: true,
        metadata: {
          exportDate: new Date().toISOString(),
          budgetType: budgetType,
          budgetTypeLabel: budgetType === 'family' ? '👨‍👩‍👧‍👦 Family Budget' : '👤 Personal Budget',
          period: {
            month,
            year,
            label: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`,
          },
        },
        summary: {
          totalExpenses: expenseCount,
          totalAmount: totalAmount,
          totalAmountFormatted: `₹${totalAmount.toLocaleString('en-IN')}`,
          categories: categories,
          categoryCount: categories.length,
          categoryBreakdown: categoryBreakdown,
        },
        expenses: expenses.map(exp => ({
          id: exp.id,
          date: exp.date.toISOString(),
          dateFormatted: exp.date.toISOString().split('T')[0],
          category: exp.category,
          amount: exp.amount,
          amountFormatted: `₹${exp.amount.toLocaleString('en-IN')}`,
          budgetType: exp.budgetType,
          note: exp.note || '',
          isRecurring: exp.isRecurring,
        })),
      };

      const response = new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseFilename}.json"`,
        },
      });

      Object.entries(getSecureHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Unsupported format. Use csv or json.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

