import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UpdateExpenseSchema } from '@/lib/validation';
import { withAuth, logAuditEvent, getClientIp, getSecureHeaders } from '@/lib/middleware';
import { z } from 'zod';

// PUT: Update expense
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ip = getClientIp(request);
    const expenseId = params.id;

    // Verify ownership
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.userId !== auth.userId) {
      return NextResponse.json(
        { error: 'Expense not found or unauthorized' },
        { status: 404 }
      );
    }

    // Parse and validate
    const body = await request.json();
    const validatedData = UpdateExpenseSchema.parse(body);

    // Update expense
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(validatedData.amount !== undefined && { amount: validatedData.amount }),
        ...(validatedData.category !== undefined && { category: validatedData.category }),
        ...(validatedData.date !== undefined && { date: new Date(validatedData.date) }),
        ...(validatedData.note !== undefined && { note: validatedData.note }),
        ...(validatedData.isRecurring !== undefined && { isRecurring: validatedData.isRecurring }),
        ...(validatedData.recurringFrequency !== undefined && { recurringFrequency: validatedData.recurringFrequency }),
        ...(validatedData.recurringEndDate !== undefined && { recurringEndDate: validatedData.recurringEndDate ? new Date(validatedData.recurringEndDate) : null }),
      },
    });

    // Log audit event
    await logAuditEvent(
      auth.userId,
      'EXPENSE_UPDATE',
      'expense',
      expenseId,
      { changes: validatedData },
      ip
    );

    let response = NextResponse.json(
      {
        success: true,
        expense: updatedExpense,
      },
      { status: 200 }
    );

    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await withAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ip = getClientIp(request);
    const expenseId = params.id;

    // Verify ownership
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.userId !== auth.userId) {
      return NextResponse.json(
        { error: 'Expense not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete expense
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    // Log audit event
    await logAuditEvent(
      auth.userId,
      'EXPENSE_DELETE',
      'expense',
      expenseId,
      { amount: expense.amount, category: expense.category },
      ip
    );

    let response = NextResponse.json(
      {
        success: true,
        message: 'Expense deleted successfully',
      },
      { status: 200 }
    );

    Object.entries(getSecureHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

