'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { formatINR } from '@/lib/currency';

interface Loan {
  id: string;
  borrowerName: string;
  amount: number;
  loanDate: string;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  notes: string | null;
  isReturned: boolean;
}

interface LoanSummary {
  totalLent: number;
  activeCount: number;
  overdueCount: number;
}

export default function LoansManager() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoanSummary>({ totalLent: 0, activeCount: 0, overdueCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showReturned, setShowReturned] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [formData, setFormData] = useState({
    borrowerName: '',
    amount: '',
    loanDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchLoans = useCallback(async () => {
    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/loans?showReturned=${showReturned}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setLoans(data.loans);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  }, [showReturned]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = await storage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');

      const payload = {
        borrowerName: formData.borrowerName.trim(),
        amount: parseFloat(formData.amount),
        loanDate: new Date(formData.loanDate).toISOString(),
        expectedReturnDate: formData.expectedReturnDate 
          ? new Date(formData.expectedReturnDate).toISOString() 
          : null,
        notes: formData.notes.trim() || null,
      };

      const url = editingLoan ? `/api/loans/${editingLoan.id}` : '/api/loans';
      const method = editingLoan ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save loan');
      }

      resetForm();
      fetchLoans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save loan');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      borrowerName: '',
      amount: '',
      loanDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: '',
      notes: '',
    });
    setEditingLoan(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (loan: Loan) => {
    setFormData({
      borrowerName: loan.borrowerName,
      amount: loan.amount.toString(),
      loanDate: new Date(loan.loanDate).toISOString().split('T')[0],
      expectedReturnDate: loan.expectedReturnDate 
        ? new Date(loan.expectedReturnDate).toISOString().split('T')[0] 
        : '',
      notes: loan.notes || '',
    });
    setEditingLoan(loan);
    setShowForm(true);
  };

  const handleMarkReturned = async (loan: Loan) => {
    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;

      await fetch(`/api/loans/${loan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ isReturned: true }),
      });

      fetchLoans();
    } catch (err) {
      console.error('Error marking loan as returned:', err);
    }
  };

  const handleDelete = async (loan: Loan) => {
    if (!confirm(`Delete loan to ${loan.borrowerName} for ${formatINR(loan.amount)}?`)) return;

    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;

      await fetch(`/api/loans/${loan.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      fetchLoans();
    } catch (err) {
      console.error('Error deleting loan:', err);
    }
  };

  const getDaysSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (loan: Loan) => {
    if (!loan.expectedReturnDate || loan.isReturned) return false;
    return new Date(loan.expectedReturnDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="text-sm opacity-90">Total Lent Out</div>
          <div className="text-2xl font-bold">{formatINR(summary.totalLent)}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="text-sm opacity-90">Active Loans</div>
          <div className="text-2xl font-bold">{summary.activeCount}</div>
        </div>
        <div className={`bg-gradient-to-br ${summary.overdueCount > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500'} rounded-2xl p-4 text-white shadow-lg`}>
          <div className="text-sm opacity-90">Overdue</div>
          <div className="text-2xl font-bold">{summary.overdueCount}</div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-colors"
        >
          {showForm ? '✕ Cancel' : '+ Add Loan'}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showReturned}
            onChange={(e) => setShowReturned(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show returned loans
        </label>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border p-4 sm:p-6 space-y-4 shadow-sm">
          <h3 className="font-semibold text-lg">{editingLoan ? 'Edit Loan' : 'Record New Loan'}</h3>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Borrower Name *</label>
              <input
                type="text"
                value={formData.borrowerName}
                onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Who borrowed the money?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                min="1"
                step="0.01"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Amount lent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loan Date *</label>
              <input
                type="date"
                value={formData.loanDate}
                onChange={(e) => setFormData({ ...formData, loanDate: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expected Return Date</label>
              <input
                type="date"
                value={formData.expectedReturnDate}
                onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingLoan ? 'Update Loan' : 'Add Loan'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border rounded-lg hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">💰</div>
          <p>No {showReturned ? '' : 'active '}loans recorded yet.</p>
          <p className="text-sm mt-1">Click &quot;Add Loan&quot; to track money you&apos;ve lent.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className={`bg-card rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                isOverdue(loan) ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' : ''
              } ${loan.isReturned ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg truncate">{loan.borrowerName}</span>
                    {loan.isReturned && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                        ✓ Returned
                      </span>
                    )}
                    {isOverdue(loan) && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
                        ⚠ Overdue
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-primary mt-1">{formatINR(loan.amount)}</div>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <div>📅 Lent on {new Date(loan.loanDate).toLocaleDateString('en-IN')} ({getDaysSince(loan.loanDate)} days ago)</div>
                    {loan.expectedReturnDate && (
                      <div>⏰ Expected by {new Date(loan.expectedReturnDate).toLocaleDateString('en-IN')}</div>
                    )}
                    {loan.returnedDate && (
                      <div>✅ Returned on {new Date(loan.returnedDate).toLocaleDateString('en-IN')}</div>
                    )}
                    {loan.notes && <div className="italic">📝 {loan.notes}</div>}
                  </div>
                </div>

                {!loan.isReturned && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleMarkReturned(loan)}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                    >
                      ✓ Returned
                    </button>
                    <button
                      onClick={() => handleEdit(loan)}
                      className="px-3 py-1.5 border text-sm rounded-lg hover:bg-accent transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(loan)}
                      className="px-3 py-1.5 text-red-500 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
