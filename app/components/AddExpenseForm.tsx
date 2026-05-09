'use client';

import { useState, useCallback, useMemo } from 'react';
import { storage } from '@/lib/storage';
import { formatINR } from '@/lib/currency';

interface AddExpenseFormProps {
  onSuccess?: () => void;
  budgetType?: 'personal' | 'family';
}

const PREDEFINED_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
];

const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍔',
  Transport: '🚇',
  Utilities: '💡',
  Entertainment: '🎬',
  Healthcare: '🏥',
  Shopping: '🛍️',
  Other: '···',
};

function evaluateExpression(expr: string): { value: number | null; isExpression: boolean; error: string | null } {
  if (!expr || expr.trim() === '') {
    return { value: null, isExpression: false, error: null };
  }

  const cleanExpr = expr.replace(/\s/g, '');

  const simpleNumber = parseFloat(cleanExpr);
  if (!isNaN(simpleNumber) && /^-?\d*\.?\d+$/.test(cleanExpr)) {
    return { value: simpleNumber, isExpression: false, error: null };
  }

  if (!/^[\d+\-*/().]+$/.test(cleanExpr)) {
    return { value: null, isExpression: true, error: 'Invalid characters' };
  }

  if (/\(\)/.test(cleanExpr) || /[+\-*/]{2,}/.test(cleanExpr)) {
    return { value: null, isExpression: true, error: 'Invalid expression' };
  }

  try {
    const tokens = cleanExpr.match(/(\d+\.?\d*|[+\-*/()])/g);
    if (!tokens) {
      return { value: null, isExpression: true, error: 'Invalid expression' };
    }

    const outputQueue: (number | string)[] = [];
    const operatorStack: string[] = [];
    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

    for (const token of tokens) {
      if (/^\d+\.?\d*$/.test(token)) {
        outputQueue.push(parseFloat(token));
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
          outputQueue.push(operatorStack.pop()!);
        }
        if (operatorStack.length === 0) {
          return { value: null, isExpression: true, error: 'Mismatched parentheses' };
        }
        operatorStack.pop();
      } else if (['+', '-', '*', '/'].includes(token)) {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== '(' &&
          precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        operatorStack.push(token);
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop()!;
      if (op === '(' || op === ')') {
        return { value: null, isExpression: true, error: 'Mismatched parentheses' };
      }
      outputQueue.push(op);
    }

    const evalStack: number[] = [];
    for (const token of outputQueue) {
      if (typeof token === 'number') {
        evalStack.push(token);
      } else {
        if (evalStack.length < 2) {
          return { value: null, isExpression: true, error: 'Invalid expression' };
        }
        const b = evalStack.pop()!;
        const a = evalStack.pop()!;
        switch (token) {
          case '+': evalStack.push(a + b); break;
          case '-': evalStack.push(a - b); break;
          case '*': evalStack.push(a * b); break;
          case '/':
            if (b === 0) {
              return { value: null, isExpression: true, error: 'Division by zero' };
            }
            evalStack.push(a / b);
            break;
        }
      }
    }

    if (evalStack.length !== 1) {
      return { value: null, isExpression: true, error: 'Invalid expression' };
    }

    const result = evalStack[0];
    if (!isFinite(result)) {
      return { value: null, isExpression: true, error: 'Result is too large' };
    }

    return { value: Math.round(result * 100) / 100, isExpression: true, error: null };
  } catch {
    return { value: null, isExpression: true, error: 'Invalid expression' };
  }
}

export default function AddExpenseForm({ onSuccess, budgetType = 'personal' }: AddExpenseFormProps) {
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState('Food');
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const expressionResult = useMemo(() => evaluateExpression(amountInput), [amountInput]);
  const calculatedAmount = expressionResult.value;
  const isExpression = expressionResult.isExpression;
  const expressionError = expressionResult.error;

  const convertExpressionToResult = useCallback(() => {
    if (isExpression && calculatedAmount !== null && !expressionError) {
      setAmountInput(calculatedAmount.toString());
    }
  }, [isExpression, calculatedAmount, expressionError]);

  const handleAmountBlur = useCallback(() => {
    convertExpressionToResult();
  }, [convertExpressionToResult]);

  const handleAmountKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '=' || e.key === 'Enter') {
      e.preventDefault();
      convertExpressionToResult();
    }
  }, [convertExpressionToResult]);

  const getAISuggestion = useCallback(async (description: string) => {
    if (!description || description.trim().length < 3) {
      setAiSuggestion('');
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestion(data.category);
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleNoteChange = (value: string) => {
    setNote(value);
    if (value.length >= 3) {
      getAISuggestion(value);
    } else {
      setAiSuggestion('');
    }
  };

  const applyAISuggestion = () => {
    if (aiSuggestion) {
      if (PREDEFINED_CATEGORIES.includes(aiSuggestion)) {
        setCategory(aiSuggestion);
      } else {
        setCategory('Other');
        setCustomCategory(aiSuggestion);
      }
      setAiSuggestion('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = await storage.getItem('accessToken');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      if (calculatedAmount === null || calculatedAmount <= 0) {
        setError(expressionError || 'Please enter a valid amount');
        setLoading(false);
        return;
      }

      const finalCategory = category === 'Other' && customCategory ? customCategory : category;

      if (!finalCategory || finalCategory.trim() === '') {
        setError('Please select or enter a category');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: calculatedAmount,
          category: finalCategory,
          date: new Date(date).toISOString(),
          note: note || undefined,
          budgetType,
          isRecurring,
          recurringFrequency: isRecurring ? recurringFrequency : undefined,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to add expense');
        return;
      }

      setAmountInput('');
      setCategory('Food');
      setCustomCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setIsRecurring(false);

      onSuccess?.();
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-apple-md overflow-hidden animate-in">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[10px] bg-apple-blue/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-apple-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">Add Expense</h2>
            <p className="text-xs text-muted-foreground">Track a new transaction</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-apple-red/8 border border-apple-red/20 text-apple-red text-sm font-medium flex items-center gap-2 animate-in">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Calculator-style amount display */}
        <div className="px-5 pt-5 pb-2 text-right">
          <div className={`text-[48px] font-thin tabular-nums leading-none tracking-tight transition-colors ${
            expressionError ? 'text-apple-red' : 'text-foreground'
          }`}>
            {amountInput ? `₹${amountInput}` : '₹0'}
          </div>
          {isExpression && calculatedAmount !== null && !expressionError && (
            <p className="text-sm text-apple-green font-medium mt-1 animate-in">
              = {formatINR(calculatedAmount)}
            </p>
          )}
          {expressionError && (
            <p className="text-xs text-apple-red mt-1 animate-in">{expressionError}</p>
          )}
        </div>

        {/* Amount input (functional but visually minimal) */}
        <div className="px-5 pb-4">
          <input
            type="text"
            pattern="[0-9+\-*/().\s]*"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            onKeyDown={handleAmountKeyDown}
            onBlur={handleAmountBlur}
            required
            className="w-full h-10 rounded-xl bg-secondary/60 border-0 px-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-apple-blue/40 transition-all duration-250"
            placeholder="Enter amount or math expression (e.g. 130+140)"
          />
          {!amountInput && (
            <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
              Tip: Enter math like 100+50*2, press = to calculate
            </p>
          )}
        </div>

        {/* Category pill selector */}
        <div className="px-5 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            {[...PREDEFINED_CATEGORIES, 'Other'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`press-effect inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ease-apple-ease ${
                  category === cat
                    ? 'bg-apple-blue text-white shadow-apple-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <span>{CATEGORY_ICONS[cat] ?? '📌'}</span>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Custom category */}
        {category === 'Other' && (
          <div className="px-5 pb-4 animate-in">
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value.slice(0, 50))}
              maxLength={50}
              className="w-full h-10 rounded-xl bg-secondary/60 border-0 px-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-apple-blue/40 transition-all duration-250"
              placeholder="Custom category name (e.g. Groceries)"
              required
            />
          </div>
        )}

        {/* Grouped rows: Date, Note, Recurring */}
        <div className="mx-4 mb-4 bg-secondary/40 rounded-xl overflow-hidden">
          {/* Date row */}
          <div className="grouped-row flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="text-sm text-apple-blue border-0 bg-transparent text-right focus:ring-0 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Note row */}
          <div className="grouped-row">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-foreground">
                Note
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </span>
              {aiLoading && (
                <span className="text-[11px] text-apple-blue animate-pulse flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-apple-blue opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-apple-blue"></span>
                  </span>
                  AI analyzing
                </span>
              )}
            </div>
            <textarea
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full bg-transparent border-0 text-sm resize-none focus:ring-0 focus:outline-none placeholder:text-muted-foreground/60"
              placeholder="Add a note… (AI will suggest category)"
            />
            {aiSuggestion && (
              <div className="mt-2 p-2.5 bg-apple-blue/8 border border-apple-blue/20 rounded-xl flex items-center justify-between animate-spring-in">
                <div className="flex items-center gap-2 text-sm">
                  <span>✨</span>
                  <span className="text-muted-foreground text-xs">
                    AI suggests: <span className="font-semibold text-foreground">{aiSuggestion}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={applyAISuggestion}
                  className="press-effect text-xs font-semibold text-apple-blue"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Recurring toggle row */}
          <div className="grouped-row flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Recurring</span>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-300 ease-spring shrink-0 ${
                isRecurring ? 'bg-apple-green' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-apple-sm transition-transform duration-300 ease-spring ${
                  isRecurring ? 'translate-x-[21px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>

          {/* Recurring frequency (expands when toggled) */}
          {isRecurring && (
            <div className="grouped-row animate-in">
              <select
                value={recurringFrequency}
                onChange={(e) => setRecurringFrequency(e.target.value)}
                className="w-full bg-transparent border-0 text-sm text-apple-blue focus:ring-0 focus:outline-none cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="px-4 pb-5">
          <button
            type="submit"
            disabled={loading}
            className="press-effect w-full h-[50px] rounded-xl bg-apple-blue text-white font-semibold text-[15px] shadow-apple-md hover:bg-apple-blue/90 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Adding…
              </>
            ) : (
              'Add Expense'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
