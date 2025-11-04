'use client';

import { useState, useCallback } from 'react';
import { formatINR } from '@/lib/currency';
import { storage } from '@/lib/storage';

interface AddExpenseFormProps {
  onSuccess?: () => void;
}

const PREDEFINED_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
];

export default function AddExpenseForm({ onSuccess }: AddExpenseFormProps) {
  const [amount, setAmount] = useState('');
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

  // AI category suggestion
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
    // Trigger AI suggestion when user types in note
    if (value.length >= 3) {
      getAISuggestion(value);
    } else {
      setAiSuggestion('');
    }
  };

  const applyAISuggestion = () => {
    if (aiSuggestion) {
      // Check if suggestion matches predefined categories
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
        return;
      }

      // Use custom category if "Other" is selected and custom category is provided
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
          amount: parseFloat(amount),
          category: finalCategory,
          date: new Date(date).toISOString(),
          note: note || undefined,
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

      // Reset form
      setAmount('');
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Add Expense</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">₹</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-lg font-medium placeholder-gray-400 transition-all duration-200"
                placeholder="0.00"
              />
            </div>
            {amount && (
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                {formatINR(parseFloat(amount))}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-lg appearance-none cursor-pointer transition-all duration-200"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 1rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
              }}
            >
              {PREDEFINED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="Other">Other (Custom)</option>
            </select>
          </div>
        </div>

        {category === 'Other' && (
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Custom Category Name
            </label>
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value.slice(0, 50))}
              maxLength={50}
              className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-lg placeholder-gray-400 transition-all duration-200"
              placeholder="e.g., Groceries, Rent, etc."
              required
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {customCategory.length}/50 characters
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-lg transition-all duration-200"
              style={{
                colorScheme: 'dark'
              }}
            />
            <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Note (optional)
            {aiLoading && (
              <span className="ml-2 text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">
                🤖 AI analyzing...
              </span>
            )}
          </label>
          <textarea
            value={note}
            onChange={(e) => handleNoteChange(e.target.value)}
            maxLength={500}
            className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-lg placeholder-gray-400 transition-all duration-200"
            rows={4}
            placeholder="Add a note... (AI will suggest category)"
          />
          {aiSuggestion && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    AI suggests: <strong>{aiSuggestion}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={applyAISuggestion}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <input
            type="checkbox"
            id="recurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-6 h-6 text-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all duration-200"
          />
          <label htmlFor="recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            Make this a recurring expense
          </label>
        </div>

        {isRecurring && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Frequency
            </label>
            <select
              value={recurringFrequency}
              onChange={(e) => setRecurringFrequency(e.target.value)}
              className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-lg appearance-none cursor-pointer transition-all duration-200"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 1rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:from-indigo-800 active:to-purple-800 text-white rounded-xl text-lg font-semibold transition-all duration-200 min-h-[56px] flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-[1.02]"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Adding Expense...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Expense
            </>
          )}
        </button>
      </form>
    </div>
  );
}

