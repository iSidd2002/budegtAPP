import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get the Gemini 2.5 Flash model with thinking disabled for faster responses
// thinkingBudget: 0 disables thinking mode for simpler, faster responses
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    // @ts-ignore - thinkingConfig is supported but not in types yet
    thinkingConfig: {
      thinkingBudget: 0  // Disable thinking for faster, simpler responses
    }
  }
});

// Budget type definitions for context-aware AI
export type BudgetType = 'personal' | 'family';

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

// Budget-type specific category priorities (used for future category-based insights)
export const PERSONAL_FOCUS_CATEGORIES = [
  'Personal Care', 'Entertainment', 'Shopping', 'Food & Dining',
  'Subscriptions', 'Travel', 'Education', 'Healthcare'
] as const;

export const FAMILY_FOCUS_CATEGORIES = [
  'Groceries', 'Utilities', 'Healthcare', 'Education',
  'Transportation', 'Food & Dining', 'Shopping', 'Entertainment'
] as const;

// Helper function to strip markdown code blocks from AI responses
function stripMarkdown(text: string): string {
  // Remove ```json, ```javascript, ``` and other code block markers
  let cleaned = text
    .replace(/```(?:json|javascript|js)?\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  return cleaned;
}

// Helper function to safely parse JSON from AI responses
function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = stripMarkdown(text);
    // Try to extract JSON from the response if it's embedded in text
    const jsonMatch = cleaned.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('JSON parse error:', error, 'Text:', text.substring(0, 200));
    return fallback;
  }
}

// Get budget-type specific context for AI prompts
function getBudgetTypeContext(budgetType: BudgetType): {
  label: string;
  emoji: string;
  focusAreas: string;
  savingsTips: string;
  persona: string;
} {
  if (budgetType === 'family') {
    return {
      label: 'Family',
      emoji: '👨‍👩‍👧‍👦',
      focusAreas: 'household expenses, groceries, utilities, children\'s education, family healthcare, home maintenance, family activities, and shared goals',
      savingsTips: 'meal planning, bulk buying, energy efficiency, carpooling for school runs, family-friendly free activities, and optimizing household subscriptions',
      persona: 'You are a warm, supportive family financial advisor who understands the challenges of managing a household budget. You speak in a friendly, encouraging tone and focus on practical tips that benefit the whole family.'
    };
  }
  return {
    label: 'Personal',
    emoji: '👤',
    focusAreas: 'individual spending habits, personal goals, self-care, entertainment, personal development, hobbies, and individual savings',
    savingsTips: 'tracking personal subscriptions, finding deals on entertainment, meal prepping, optimizing commute costs, and building an emergency fund',
    persona: 'You are a friendly personal finance coach who helps individuals manage their money better. You speak in an encouraging, motivational tone and focus on helping them achieve their personal financial goals.'
  };
}

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
 * Generate spending insights based on expense data (budget-type aware)
 */
export async function generateSpendingInsights(
  expenses: any[],
  budgetType: BudgetType = 'personal'
): Promise<string[]> {
  try {
    const context = getBudgetTypeContext(budgetType);

    if (expenses.length === 0) {
      return budgetType === 'family'
        ? [`${context.emoji} No family expenses recorded yet. Start tracking household spending to get insights!`]
        : [`${context.emoji} No personal expenses recorded yet. Start tracking to get personalized insights!`];
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
      .slice(0, 5)
      .map(([cat, amount]) => `${cat}: ₹${amount.toFixed(0)}`);

    // Calculate category percentages for context
    const categoryPercentages = Object.entries(categoryTotals)
      .map(([cat, amount]) => `${cat}: ${((amount / totalSpent) * 100).toFixed(1)}%`)
      .join(', ');

    const prompt = `${context.persona}

You're analyzing ${context.label.toUpperCase()} budget spending data. Focus on ${context.focusAreas}.

📊 SPENDING DATA:
- Total spent: ₹${totalSpent.toFixed(0)}
- Number of transactions: ${expenses.length}
- Top categories: ${topCategories.join(', ')}
- Category breakdown: ${categoryPercentages}

🎯 TASK: Generate 3-4 smart, engaging insights specific to ${context.label.toLowerCase()} spending.

GUIDELINES:
- Start each insight with a relevant emoji
- Be specific and actionable
- Reference the actual spending categories and amounts
- For ${context.label} budgets, focus on: ${context.focusAreas}
- Suggest practical tips like: ${context.savingsTips}
- Use ₹ symbol for all amounts
- Make insights conversational and encouraging
- ${budgetType === 'family' ? 'Consider family needs and shared expenses' : 'Focus on personal goals and individual habits'}

FORMAT: JSON array of strings
Example: ["🍽️ Dining takes up 35% of spending - family meal prep could save ₹2,000/month!", "⚡ Great job keeping utilities under control!"]

Respond with ONLY the JSON array.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const insights = safeJsonParse<string[]>(text, [`${context.emoji} Unable to generate insights at this time.`]);
    return Array.isArray(insights) && insights.length > 0 ? insights : [`${context.emoji} Unable to generate insights at this time.`];
  } catch (error) {
    console.error('Error generating insights:', error);
    return ['💡 Unable to generate insights. Please try again later.'];
  }
}

/**
 * Suggest budget amounts based on spending history (budget-type aware)
 */
export async function suggestBudget(
  expenses: any[],
  currentBudget?: number,
  budgetType: BudgetType = 'personal'
): Promise<{
  suggestedAmount: number;
  reasoning: string;
  tips: string[];
}> {
  try {
    const context = getBudgetTypeContext(budgetType);
    const defaultBudget = budgetType === 'family' ? 50000 : 15000;

    if (expenses.length === 0) {
      return {
        suggestedAmount: currentBudget || defaultBudget,
        reasoning: budgetType === 'family'
          ? `${context.emoji} Start with ₹${defaultBudget.toLocaleString('en-IN')} for your family budget and adjust as you track household expenses.`
          : `${context.emoji} Start with ₹${defaultBudget.toLocaleString('en-IN')} for your personal budget and adjust based on your spending habits.`,
        tips: budgetType === 'family'
          ? ['Track groceries and utilities first', 'Include children\'s education expenses', 'Plan for family healthcare']
          : ['Track your daily expenses', 'Note your subscription costs', 'Monitor entertainment spending'],
      };
    }

    // Calculate spending metrics
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgSpending = totalSpent / expenses.length;

    // Group by category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(0)}`);

    const prompt = `${context.persona}

You're providing a ${context.label.toUpperCase()} budget recommendation. Focus on ${context.focusAreas}.

📊 SPENDING HISTORY:
- Total spent: ₹${totalSpent.toFixed(0)}
- Number of expenses: ${expenses.length}
- Average per expense: ₹${avgSpending.toFixed(0)}
- Current budget: ${currentBudget ? `₹${currentBudget.toLocaleString('en-IN')}` : 'Not set'}
- Top spending areas: ${topCategories.join(', ')}

🎯 TASK: Suggest a realistic ${context.label.toLowerCase()} monthly budget with helpful tips.

GUIDELINES:
- The amount should be realistic (10-20% buffer over typical spending)
- ${budgetType === 'family' ? 'Account for household essentials, unexpected family needs, and shared goals' : 'Account for personal goals, savings, and some flexibility for treats'}
- Provide a warm, encouraging reasoning with emoji
- Include 2-3 actionable tips specific to ${context.label.toLowerCase()} budgeting
- Use ₹ symbol and Indian formatting

FORMAT: JSON object
{
  "suggestedAmount": <number>,
  "reasoning": "<encouraging 1-2 sentence explanation with emoji>",
  "tips": ["<tip 1 with emoji>", "<tip 2 with emoji>", "<tip 3 with emoji>"]
}

Respond with ONLY the JSON object.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const fallback = {
      suggestedAmount: currentBudget || defaultBudget,
      reasoning: `${context.emoji} Based on your ${context.label.toLowerCase()} spending patterns.`,
      tips: [],
    };
    const suggestion = safeJsonParse<typeof fallback>(text, fallback);
    return {
      suggestedAmount: suggestion.suggestedAmount || currentBudget || defaultBudget,
      reasoning: suggestion.reasoning || `${context.emoji} Based on your ${context.label.toLowerCase()} spending patterns.`,
      tips: Array.isArray(suggestion.tips) ? suggestion.tips : [],
    };
  } catch (error) {
    console.error('Error suggesting budget:', error);
    return {
      suggestedAmount: currentBudget || (budgetType === 'family' ? 50000 : 15000),
      reasoning: '💡 Unable to generate recommendation. Please try again later.',
      tips: [],
    };
  }
}

/**
 * Generate spending alerts and warnings (budget-type aware)
 */
export async function generateSpendingAlerts(
  expenses: any[],
  budget: number,
  daysLeftInMonth: number,
  budgetType: BudgetType = 'personal'
): Promise<string[]> {
  try {
    const context = getBudgetTypeContext(budgetType);
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const percentageSpent = (totalSpent / budget) * 100;
    const daysElapsed = Math.max(30 - daysLeftInMonth, 1);
    const dailyBudget = budget / 30;
    const dailySpending = totalSpent / daysElapsed;
    const remaining = budget - totalSpent;
    const dailyAllowance = daysLeftInMonth > 0 ? remaining / daysLeftInMonth : 0;

    // Calculate category breakdown for context
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const topCategory = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)[0];

    const topCategoryInfo = topCategory
      ? `${topCategory[0]}: ₹${topCategory[1].toFixed(0)} (${((topCategory[1] / totalSpent) * 100).toFixed(0)}%)`
      : 'No expenses yet';

    const prompt = `${context.persona}

You're generating ${context.label.toUpperCase()} budget alerts. Focus on ${context.focusAreas}.

📊 CURRENT STATUS:
- Budget: ₹${budget.toLocaleString('en-IN')}
- Spent: ₹${totalSpent.toFixed(0)} (${percentageSpent.toFixed(0)}%)
- Remaining: ₹${remaining.toFixed(0)}
- Days left: ${daysLeftInMonth}
- Daily allowance: ₹${dailyAllowance.toFixed(0)}/day
- Top spending: ${topCategoryInfo}
- Avg daily spending: ₹${dailySpending.toFixed(0)}

🎯 TASK: Generate 2-3 smart, engaging alerts for ${context.label.toLowerCase()} budget.

ALERT TYPES:
${percentageSpent > 90 ? '🚨 CRITICAL: Budget almost exhausted!' : ''}
${percentageSpent > 75 && percentageSpent <= 90 ? '⚠️ WARNING: Spending is high' : ''}
${percentageSpent <= 50 ? '✅ ON TRACK: Good spending control' : ''}
${dailySpending > dailyBudget * 1.5 ? '📈 OVERSPENDING: Daily rate too high' : ''}

GUIDELINES:
- Start each alert with appropriate emoji (🚨⚠️💡✅📊🎯)
- Be specific with numbers and percentages
- ${budgetType === 'family' ? 'Consider household priorities like groceries, utilities, children\'s needs' : 'Focus on personal spending habits and goals'}
- Suggest actionable tips related to: ${context.savingsTips}
- Be encouraging but honest
- Use ₹ symbol

FORMAT: JSON array of 2-3 strings
Example: ["⚠️ Family groceries took 45% of budget - try meal planning!", "💡 You have ₹500/day for remaining expenses"]

Respond with ONLY the JSON array.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const alerts = safeJsonParse<string[]>(text, []);
    return Array.isArray(alerts) ? alerts : [];
  } catch (error) {
    console.error('Error generating alerts:', error);
    return [];
  }
}

