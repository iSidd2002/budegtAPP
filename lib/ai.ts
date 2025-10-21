/**
 * AI Service using Google Gemini API
 * Provides lightweight AI features for expense categorization and insights
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Predefined categories for consistency
const PREDEFINED_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
];

interface CategorySuggestionResponse {
  category: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface SpendingInsight {
  type: 'highest_category' | 'comparison' | 'recommendation';
  title: string;
  description: string;
  actionable: boolean;
}

/**
 * Suggest expense category using Gemini AI
 * @param description - Expense description/note
 * @param amount - Expense amount in INR
 * @returns Suggested category and confidence level
 */
export async function suggestExpenseCategory(
  description: string,
  amount: number
): Promise<CategorySuggestionResponse | null> {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not configured');
      return null;
    }

    if (!description || description.trim().length === 0) {
      return null;
    }

    const prompt = `You are a budget categorization expert. Based on the expense description and amount, suggest the most appropriate category.

Expense Description: "${description}"
Amount: ₹${amount}

Available categories: ${PREDEFINED_CATEGORIES.join(', ')}

Respond in JSON format ONLY (no markdown, no extra text):
{
  "category": "one of the available categories",
  "confidence": "high|medium|low",
  "reasoning": "brief explanation in 1-2 sentences"
}

If the description doesn't clearly match any category, suggest "Shopping" with low confidence.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Low temperature for consistent categorization
          maxOutputTokens: 200,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error('No content in Gemini response');
      return null;
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse JSON from Gemini response');
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate category
    if (!PREDEFINED_CATEGORIES.includes(result.category)) {
      result.category = 'Shopping'; // Fallback
    }

    return {
      category: result.category,
      confidence: result.confidence || 'medium',
      reasoning: result.reasoning || 'AI suggestion',
    };
  } catch (error) {
    console.error('Error suggesting category:', error);
    return null;
  }
}

/**
 * Generate spending insights using Gemini AI
 * @param expenses - Array of expenses with category and amount
 * @param budget - Monthly budget amount
 * @param spent - Total spent this month
 * @returns Array of AI-generated insights
 */
export async function generateSpendingInsights(
  expenses: Array<{ category: string; amount: number; date: string }>,
  budget: number,
  spent: number
): Promise<SpendingInsight[]> {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not configured');
      return [];
    }

    if (!expenses || expenses.length === 0) {
      return [];
    }

    // Calculate category totals
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const spendingPercentage = budget > 0 ? (spent / budget) * 100 : 0;
    const remaining = budget - spent;

    const prompt = `You are a personal finance advisor. Analyze this spending data and provide 2-3 brief, actionable insights.

Monthly Budget: ₹${budget}
Total Spent: ₹${spent} (${spendingPercentage.toFixed(1)}%)
Remaining: ₹${remaining}
Number of Expenses: ${expenses.length}

Top Spending Categories:
${sortedCategories.map(([cat, amt]) => `- ${cat}: ₹${amt.toFixed(2)}`).join('\n')}

Provide insights in JSON format ONLY (no markdown):
[
  {
    "type": "highest_category|comparison|recommendation",
    "title": "short title",
    "description": "1-2 sentence insight",
    "actionable": true|false
  }
]

Focus on:
1. Highest spending category and whether it's reasonable
2. Budget status (on track, overspending, underspending)
3. One actionable recommendation to optimize spending

Keep descriptions concise and practical.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText);
      return [];
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error('No content in Gemini response');
      return [];
    }

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Could not parse JSON array from Gemini response');
      return [];
    }

    const insights = JSON.parse(jsonMatch[0]) as SpendingInsight[];

    // Validate insights
    return insights.filter(
      (insight) =>
        insight.type &&
        insight.title &&
        insight.description &&
        typeof insight.actionable === 'boolean'
    );
  } catch (error) {
    console.error('Error generating insights:', error);
    return [];
  }
}

/**
 * Extract expense details from natural language
 * @param text - Natural language expense description
 * @returns Extracted expense details
 */
export async function extractExpenseDetails(text: string): Promise<{
  amount: number | null;
  category: string | null;
  description: string;
} | null> {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not configured');
      return null;
    }

    const prompt = `Extract expense details from this text: "${text}"

Available categories: ${PREDEFINED_CATEGORIES.join(', ')}

Respond in JSON format ONLY:
{
  "amount": number or null,
  "category": "category or null",
  "description": "cleaned description"
}

Examples:
- "I spent 500 on groceries" -> {"amount": 500, "category": "Food", "description": "groceries"}
- "Uber ride 250" -> {"amount": 250, "category": "Transport", "description": "Uber ride"}
- "Movie tickets" -> {"amount": null, "category": "Entertainment", "description": "Movie tickets"}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 150,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error extracting expense details:', error);
    return null;
  }
}

