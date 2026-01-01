import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { CreateLoanSchema } from '@/lib/validation';

// GET /api/loans - Get all loans for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const showReturned = searchParams.get('showReturned') === 'true';

    const loans = await prisma.loan.findMany({
      where: {
        userId: payload.userId,
        ...(showReturned ? {} : { isReturned: false }),
      },
      orderBy: { loanDate: 'desc' },
    });

    // Calculate summary statistics
    const activeLoans = loans.filter(l => !l.isReturned);
    const totalLent = activeLoans.reduce((sum, l) => sum + l.amount, 0);
    const now = new Date();
    const overdueLoans = activeLoans.filter(l => 
      l.expectedReturnDate && new Date(l.expectedReturnDate) < now
    );

    return NextResponse.json({
      loans,
      summary: {
        totalLent,
        activeCount: activeLoans.length,
        overdueCount: overdueLoans.length,
      },
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

// POST /api/loans - Create a new loan
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const validation = CreateLoanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { borrowerName, amount, loanDate, expectedReturnDate, notes } = validation.data;

    const loan = await prisma.loan.create({
      data: {
        userId: payload.userId,
        borrowerName,
        amount,
        loanDate: new Date(loanDate),
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
}

