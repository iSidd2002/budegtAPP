import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get the Gemini Pro model
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Common expense categories
export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Personal Care',
  'Subscriptions',
  'Other',
];

/**
 * Suggest expense category based on description
 */
export async function suggestCategory(description: string): Promise<string> {
  try {
    const prompt = `You are a financial assistant. Based on the expense description, suggest the most appropriate category from this list: ${EXPENSE_CATEGORIES.join(', ')}.

Expense description: "${description}"

Respond with ONLY the category name, nothing else. Choose the most relevant category.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const category = response.text().trim();

    // Validate that the response is one of our categories
    if (EXPENSE_CATEGORIES.includes(category)) {
      return category;
    }

    // If not exact match, try to find closest match
    const lowerCategory = category.toLowerCase();
    const match = EXPENSE_CATEGORIES.find(
      (cat) => cat.toLowerCase() === lowerCategory
    );

    return match || 'Other';
  } catch (error) {
    console.error('Error suggesting category:', error);
    return 'Other';
  }
}

/**
 * Generate spending insights based on expense data
 */
export async function generateSpendingInsights(expenses: any[]): Promise<string[]> {
  try {
    if (expenses.length === 0) {
      return ['No expenses recorded yet. Start tracking to get insights!'];
    }

    // Calculate totals by category
    const categoryTotals: Record<string, number> = {};
    let totalSpent = 0;

    expenses.forEach((expense) => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      totalSpent += expense.amount;
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, amount]) => `${cat}: ₹${amount.toFixed(2)}`);

    const prompt = `You are a financial advisor. Analyze this spending data and provide 3-4 concise, actionable insights in Indian Rupees (₹).

Total spent: ₹${totalSpent.toFixed(2)}
Number of expenses: ${expenses.length}
Top spending categories: ${topCategories.join(', ')}

Provide insights as a JSON array of strings. Each insight should be:
- One sentence
- Actionable and helpful
- Focused on spending patterns or recommendations
- Use ₹ symbol for amounts

Example format: ["You spent 40% on dining - consider meal planning", "Transportation costs are high - explore carpooling"]

Respond with ONLY the JSON array, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Parse JSON response
    const insights = JSON.parse(text);
    return Array.isArray(insights) ? insights : ['Unable to generate insights at this time.'];
  } catch (error) {
    console.error('Error generating insights:', error);
    return ['Unable to generate insights. Please try again later.'];
  }
}

/**
 * Suggest budget amounts based on spending history
 */
export async function suggestBudget(expenses: any[], currentBudget?: number): Promise<{
  suggestedAmount: number;
  reasoning: string;
}> {
  try {
    if (expenses.length === 0) {
      return {
        suggestedAmount: currentBudget || 10000,
        reasoning: 'Start with a baseline budget and adjust as you track expenses.',
      };
    }

    // Calculate average monthly spending
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgSpending = totalSpent / expenses.length;

    const prompt = `You are a financial advisor. Based on spending history, suggest a realistic monthly budget.

Total spent: ₹${totalSpent.toFixed(2)}
Number of expenses: ${expenses.length}
Average per expense: ₹${avgSpending.toFixed(2)}
Current budget: ₹${currentBudget || 'Not set'}

Provide a response in JSON format:
{
  "suggestedAmount": <number>,
  "reasoning": "<one sentence explanation>"
}

The suggested amount should be realistic and slightly higher than average spending to allow flexibility.
Use Indian Rupees (₹) in the reasoning.

Respond with ONLY the JSON object, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    const suggestion = JSON.parse(text);
    return {
      suggestedAmount: suggestion.suggestedAmount || currentBudget || 10000,
      reasoning: suggestion.reasoning || 'Based on your spending patterns.',
    };
  } catch (error) {
    console.error('Error suggesting budget:', error);
    return {
      suggestedAmount: currentBudget || 10000,
      reasoning: 'Unable to generate recommendation. Please try again later.',
    };
  }
}

/**
 * Generate spending alerts and warnings
 */
export async function generateSpendingAlerts(
  expenses: any[],
  budget: number,
  daysLeftInMonth: number
): Promise<string[]> {
  try {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const percentageSpent = (totalSpent / budget) * 100;
    const dailyBudget = budget / 30;
    const dailySpending = totalSpent / (30 - daysLeftInMonth);

    const prompt = `You are a financial advisor. Generate 2-3 smart spending alerts based on this data:

Budget: ₹${budget}
Spent so far: ₹${totalSpent.toFixed(2)} (${percentageSpent.toFixed(1)}%)
Days left in month: ${daysLeftInMonth}
Daily budget: ₹${dailyBudget.toFixed(2)}
Current daily spending: ₹${dailySpending.toFixed(2)}

Provide alerts as a JSON array of strings. Each alert should be:
- Concise (one sentence)
- Actionable
- Use ₹ symbol
- Include warnings if overspending or tips if doing well

Example: ["Warning: You've spent 80% of budget with 15 days left", "Tip: Reduce dining out to stay on track"]

Respond with ONLY the JSON array, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    const alerts = JSON.parse(text);
    return Array.isArray(alerts) ? alerts : [];
  } catch (error) {
    console.error('Error generating alerts:', error);
    return [];
  }
}

