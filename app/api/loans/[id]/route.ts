import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { UpdateLoanSchema } from '@/lib/validation';

// GET /api/loans/[id] - Get a specific loan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const loan = await prisma.loan.findFirst({
      where: {
        id,
        userId: payload.userId,
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json(loan);
  } catch (error) {
    console.error('Error fetching loan:', error);
    return NextResponse.json({ error: 'Failed to fetch loan' }, { status: 500 });
  }
}

// PATCH /api/loans/[id] - Update a loan
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify ownership
    const existingLoan = await prisma.loan.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!existingLoan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = UpdateLoanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.borrowerName !== undefined) {
      updateData.borrowerName = validation.data.borrowerName;
    }
    if (validation.data.amount !== undefined) {
      updateData.amount = validation.data.amount;
    }
    if (validation.data.loanDate !== undefined) {
      updateData.loanDate = new Date(validation.data.loanDate);
    }
    if (validation.data.expectedReturnDate !== undefined) {
      updateData.expectedReturnDate = validation.data.expectedReturnDate 
        ? new Date(validation.data.expectedReturnDate) 
        : null;
    }
    if (validation.data.notes !== undefined) {
      updateData.notes = validation.data.notes || null;
    }
    if (validation.data.isReturned !== undefined) {
      updateData.isReturned = validation.data.isReturned;
      if (validation.data.isReturned && !existingLoan.returnedDate) {
        updateData.returnedDate = new Date();
      }
    }
    if (validation.data.returnedDate !== undefined) {
      updateData.returnedDate = validation.data.returnedDate 
        ? new Date(validation.data.returnedDate) 
        : null;
    }

    const loan = await prisma.loan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
  }
}

// DELETE /api/loans/[id] - Delete a loan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify ownership
    const existingLoan = await prisma.loan.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!existingLoan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    await prisma.loan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting loan:', error);
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 });
  }
}

