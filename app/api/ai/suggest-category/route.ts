/**
 * API Route: POST /api/ai/suggest-category
 * Suggests expense category using Gemini AI based on description
 */

import { NextRequest, NextResponse } from 'next/server';
import { suggestExpenseCategory } from '@/lib/ai';
import { z } from 'zod';

const SuggestCategorySchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = SuggestCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { description, amount } = validation.data;

    // Get AI suggestion with timeout
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve(null), 3000) // 3 second timeout
    );

    const suggestionPromise = suggestExpenseCategory(description, amount);

    const suggestion = await Promise.race([suggestionPromise, timeoutPromise]);

    if (!suggestion) {
      return NextResponse.json(
        {
          category: null,
          confidence: 'low',
          reasoning: 'AI suggestion unavailable',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(suggestion, { status: 200 });
  } catch (error) {
    console.error('Error in suggest-category:', error);
    return NextResponse.json(
      {
        category: null,
        confidence: 'low',
        reasoning: 'Error processing request',
      },
      { status: 200 } // Return 200 so frontend doesn't break
    );
  }
}

