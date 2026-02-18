import { useState } from 'react';

/**
 * Checks which monthly-recurring expenses haven't been logged in the current month.
 * Shows a dismissible banner with a list so the user can go add them.
 */
export default function RecurringAlert({ expenses }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  // All unique monthly-recurring expense descriptions
  const monthlyTemplates = expenses.filter(e => e.recurring === 'monthly');
  if (!monthlyTemplates.length) return null;

  // Which of those have at least one entry this calendar month?
  const loggedThisMonth = new Set(
    expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .map(e => e.description.toLowerCase())
  );

  // De-duplicate by description, keep only ones not logged this month
  const seen = new Set();
  const missing = monthlyTemplates.filter(e => {
    const key = e.description.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return !loggedThisMonth.has(key);
  });

  if (!missing.length) return null;

  const monthName = now.toLocaleString('default', { month: 'long' });

  return (
    <div style={{
      background: '#fff3cd',
      border: '1px solid #ffc107',
      borderLeft: '4px solid #ffc107',
      borderRadius: 8,
      padding: '14px 18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
    }}>
      <div>
        <strong style={{ color: '#856404' }}>
          Recurring Expenses Not Yet Logged for {monthName}
        </strong>
        <div style={{ marginTop: 6, fontSize: '0.88rem', color: '#856404' }}>
          {missing.map(e => (
            <span key={e.id} style={{ display: 'inline-block', background: '#fff', border: '1px solid #ffc107', borderRadius: 4, padding: '2px 8px', margin: '2px 4px 2px 0', fontSize: '0.82rem' }}>
              {e.description} — ${e.amount.toFixed(2)}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#6d5a00' }}>
          Head to the <strong>Expenses</strong> tab to log them.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#856404', flexShrink: 0, lineHeight: 1 }}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
