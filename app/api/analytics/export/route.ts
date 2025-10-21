import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAuth, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import Papa from 'papaparse';

const prisma = new PrismaClient();

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

    // Build query
    const where: any = { userId: auth.userId };
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

    // Fetch expenses
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Log audit event
    await logAuditEvent(
      auth.userId,
      'EXPORT_DATA',
      'expense',
      undefined,
      { format, count: expenses.length },
      ip
    );

    if (format === 'csv') {
      const csv = Papa.unparse(
        expenses.map((exp) => ({
          Date: exp.date.toISOString().split('T')[0],
          Category: exp.category,
          Amount: exp.amount,
          Note: exp.note || '',
          Recurring: exp.isRecurring ? 'Yes' : 'No',
        }))
      );

      let response = new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="expenses-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });

      Object.entries(getSecureHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    if (format === 'json') {
      let response = NextResponse.json(
        {
          success: true,
          exportDate: new Date().toISOString(),
          expenses,
        },
        { status: 200 }
      );

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

