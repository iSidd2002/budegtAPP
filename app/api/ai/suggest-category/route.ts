import { NextRequest, NextResponse } from 'next/server';
import { suggestCategory } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const category = await suggestCategory(description);

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error in suggest-category API:', error);
    return NextResponse.json(
      { error: 'Failed to suggest category' },
      { status: 500 }
    );
  }
}

