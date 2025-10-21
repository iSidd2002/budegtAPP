'use client';

import { useState, useEffect } from 'react';
import { formatINR } from '@/lib/currency';

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

interface AISuggestion {
  category: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

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
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Get AI category suggestion when note changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (note.trim().length > 3 && amount) {
        getAISuggestion();
      } else {
        setAiSuggestion(null);
      }
    }, 800); // Debounce 800ms

    return () => clearTimeout(timer);
  }, [note, amount]);

  const getAISuggestion = async () => {
    if (!note.trim() || !amount) return;

    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: note,
          amount: parseFloat(amount),
        }),
      });

      if (response.ok) {
        const suggestion = await response.json();
        if (suggestion.category) {
          setAiSuggestion(suggestion);
        }
      }
    } catch (err) {
      console.error('Error getting AI suggestion:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const acceptAISuggestion = () => {
    if (aiSuggestion) {
      setCategory(aiSuggestion.category);
      setCustomCategory('');
      setAiSuggestion(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
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
      setAiSuggestion(null);

      onSuccess?.();
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Add Expense</h2>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Custom Category Name
          </label>
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value.slice(0, 50))}
            maxLength={50}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="e.g., Groceries, Rent, etc."
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {customCategory.length}/50 characters
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Note (optional) {aiLoading && <span className="text-xs text-blue-500">🤖 AI analyzing...</span>}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
          rows={3}
          placeholder="Add a note... (AI will suggest category)"
        />
      </div>

      {aiSuggestion && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                🤖 AI Suggestion
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
                Category: <span className="font-semibold">{aiSuggestion.category}</span>
                {aiSuggestion.confidence === 'high' && <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">High confidence</span>}
                {aiSuggestion.confidence === 'medium' && <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded">Medium confidence</span>}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">{aiSuggestion.reasoning}</p>
            </div>
            <button
              type="button"
              onClick={acceptAISuggestion}
              className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="recurring"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
        />
        <label htmlFor="recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Recurring expense
        </label>
      </div>

      {isRecurring && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Frequency
          </label>
          <select
            value={recurringFrequency}
            onChange={(e) => setRecurringFrequency(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
      >
        {loading ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  );
}

