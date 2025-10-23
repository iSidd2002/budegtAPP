'use client';

import { useState } from 'react';
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
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-base"
          rows={3}
          placeholder="Add a note..."
        />
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

