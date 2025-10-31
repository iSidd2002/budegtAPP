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
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6 space-y-4">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Add Expense</h2>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-xs sm:text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full pl-7 pr-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-base"
              placeholder="0.00"
            />
          </div>
          {amount && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatINR(parseFloat(amount))}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-base"
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
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom Category Name
          </label>
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value.slice(0, 50))}
            maxLength={50}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-base"
            placeholder="e.g., Groceries, Rent, etc."
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {customCategory.length}/50 characters
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-base"
        />
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Note (optional)
          {aiLoading && (
            <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">
              🤖 AI analyzing...
            </span>
          )}
        </label>
        <textarea
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          maxLength={500}
          className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-base"
          rows={3}
          placeholder="Add a note... (AI will suggest category)"
        />
        {aiSuggestion && (
          <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center justify-between">
            <span className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
              🤖 AI suggests: <strong>{aiSuggestion}</strong>
            </span>
            <button
              type="button"
              onClick={applyAISuggestion}
              className="ml-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="recurring"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        />
        <label htmlFor="recurring" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          Recurring expense
        </label>
      </div>

      {isRecurring && (
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Frequency
          </label>
          <select
            value={recurringFrequency}
            onChange={(e) => setRecurringFrequency(e.target.value)}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-base"
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
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-semibold py-3 sm:py-2 px-4 rounded-lg transition duration-200 min-h-[44px] sm:min-h-auto text-base sm:text-sm"
      >
        {loading ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  );
}

