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
    const diffTime = new Date().getTime() - new Date(dateStr).getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (loan: Loan) => {
    if (!loan.expectedReturnDate || loan.isReturned) return false;
    return new Date(loan.expectedReturnDate) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-secondary rounded-xl" />)}
        </div>
        <div className="h-16 bg-secondary rounded-xl" />
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-20 bg-secondary rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Total Lent',   value: formatINR(summary.totalLent), icon: '💸', color: 'apple-blue'  },
          { label: 'Active',       value: `${summary.activeCount}`,      icon: '📋', color: 'apple-green' },
          { label: 'Overdue',      value: `${summary.overdueCount}`,     icon: '⏰', color: summary.overdueCount > 0 ? 'apple-red' : 'apple-teal' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-card rounded-xl shadow-apple-sm p-3 sm:p-4">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-${color}/15 flex items-center justify-center mb-2 sm:mb-3 text-sm sm:text-base`}>
              {icon}
            </div>
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
            <p className={`text-base sm:text-2xl font-bold tabular-nums mt-0.5 text-${color} leading-tight`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          className="press-effect inline-flex items-center gap-2 px-4 py-2 bg-apple-blue text-white rounded-xl text-sm font-semibold shadow-apple-sm hover:bg-apple-blue/90 transition-colors"
        >
          {showForm ? '✕ Cancel' : '+ Add Loan'}
        </button>
        <button
          type="button"
          onClick={() => setShowReturned(!showReturned)}
          className="flex items-center gap-2.5 min-h-[44px] press-effect"
        >
          <div className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-300 ease-spring shrink-0 ${showReturned ? 'bg-apple-green' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
            <span className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-apple-sm transition-transform duration-300 ease-spring ${showReturned ? 'translate-x-[21px]' : 'translate-x-[2px]'}`} />
          </div>
          <span className="text-sm text-muted-foreground select-none">Show returned</span>
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-apple-md overflow-hidden animate-spring-in">
          <div className="px-5 pt-5 pb-3 border-b border-border/40">
            <h3 className="text-[17px] font-semibold">{editingLoan ? 'Edit Loan' : 'Record New Loan'}</h3>
          </div>

          {error && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-apple-red/8 border border-apple-red/20 text-apple-red text-sm">
              {error}
            </div>
          )}

          <div className="mx-4 mt-3 bg-secondary/40 rounded-xl overflow-hidden">
            {[
              { label: 'Borrower Name', type: 'text',   key: 'borrowerName',       placeholder: 'Who borrowed the money?', required: true  },
              { label: 'Amount (₹)',    type: 'number',  key: 'amount',             placeholder: 'Amount lent',             required: true  },
              { label: 'Loan Date',     type: 'date',    key: 'loanDate',           placeholder: '',                        required: true  },
              { label: 'Expected By',   type: 'date',    key: 'expectedReturnDate', placeholder: '',                        required: false },
            ].map(({ label, type, key, placeholder, required }) => (
              <div key={key} className="grouped-row flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground shrink-0">{label}</span>
                <input
                  type={type}
                  value={formData[key as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  required={required}
                  placeholder={placeholder}
                  step={type === 'number' ? '0.01' : undefined}
                  min={type === 'number' ? '1' : undefined}
                  className="flex-1 text-right bg-transparent border-0 text-sm text-apple-blue focus:ring-0 focus:outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            ))}
            <div className="grouped-row">
              <p className="text-sm font-medium text-foreground mb-1.5">Notes</p>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full bg-transparent border-0 text-sm resize-none focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50"
                placeholder="Any additional notes…"
              />
            </div>
          </div>

          <div className="px-4 py-4 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="press-effect flex-1 h-[50px] bg-apple-blue text-white rounded-xl font-semibold shadow-apple-md hover:bg-apple-blue/90 disabled:opacity-40"
            >
              {submitting ? 'Saving…' : editingLoan ? 'Update Loan' : 'Add Loan'}
            </button>
            <button type="button" onClick={resetForm}
              className="press-effect px-4 h-[50px] rounded-xl bg-secondary text-muted-foreground font-medium">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-4">💰</div>
          <p className="text-sm font-medium">No {showReturned ? '' : 'active '}loans yet</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Tap &quot;Add Loan&quot; to track money you&apos;ve lent.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className={`bg-card rounded-xl shadow-apple-sm p-4 press-effect transition-all ${
                isOverdue(loan) ? 'ring-2 ring-apple-red/30' : ''
              } ${loan.isReturned ? 'opacity-55' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar initials */}
                <div className="w-11 h-11 rounded-full bg-apple-blue/15 flex items-center justify-center shrink-0">
                  <span className="text-[15px] font-bold text-apple-blue">
                    {loan.borrowerName.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-foreground truncate">{loan.borrowerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getDaysSince(loan.loanDate)} days ago
                    {loan.expectedReturnDate && ` · Due ${new Date(loan.expectedReturnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </p>
                  {loan.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate italic">{loan.notes}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-[15px] tabular-nums text-foreground">{formatINR(loan.amount)}</p>
                  {loan.isReturned && (
                    <p className="text-xs font-semibold text-apple-green mt-0.5">Returned</p>
                  )}
                  {isOverdue(loan) && (
                    <p className="text-xs font-semibold text-apple-red mt-0.5">Overdue</p>
                  )}
                  {!loan.isReturned && !isOverdue(loan) && (
                    <p className="text-xs text-muted-foreground mt-0.5">Active</p>
                  )}
                </div>
              </div>

              {/* Action buttons — 44px min touch target */}
              {!loan.isReturned && (
                <div className="flex items-center mt-3 pt-3 border-t border-border/40 -mx-1">
                  <button onClick={() => handleMarkReturned(loan)}
                    className="press-effect flex-1 flex items-center justify-center gap-1.5 min-h-[44px] text-sm font-semibold text-apple-green">
                    ✓ Returned
                  </button>
                  <div className="w-px h-5 bg-border/60" />
                  <button onClick={() => handleEdit(loan)}
                    className="press-effect flex-1 flex items-center justify-center min-h-[44px] text-sm font-semibold text-apple-blue">
                    Edit
                  </button>
                  <div className="w-px h-5 bg-border/60" />
                  <button onClick={() => handleDelete(loan)}
                    className="press-effect flex-1 flex items-center justify-center min-h-[44px] text-sm font-semibold text-apple-red">
                    Delete
                  </button>
                </div>
              )}
              {loan.isReturned && loan.returnedDate && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">
                  Returned {new Date(loan.returnedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
