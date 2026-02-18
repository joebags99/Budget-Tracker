import { useState } from 'react';

const DEADLINES = [
  { quarter: 'Q1', month: 3,  day: 15, label: 'Q1 (Jan–Mar)' },
  { quarter: 'Q2', month: 5,  day: 15, label: 'Q2 (Apr–Jun)' },
  { quarter: 'Q3', month: 8,  day: 15, label: 'Q3 (Jul–Sep)' },
  { quarter: 'Q4', month: 0,  day: 15, label: 'Q4 (Oct–Dec)', nextYear: true },
];

function getUpcoming() {
  const now = new Date();
  for (const d of DEADLINES) {
    const due = new Date(d.nextYear ? now.getFullYear() + 1 : now.getFullYear(), d.month, d.day);
    const daysAway = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (daysAway >= 0 && daysAway <= 30) {
      return { ...d, due, daysAway };
    }
  }
  return null;
}

export default function TaxReminderBanner({ taxPayments }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const upcoming = getUpcoming();
  if (!upcoming) return null;

  // Check if already paid this quarter this year
  const year = new Date().getFullYear();
  const alreadyPaid = taxPayments.some(t => {
    const d = new Date(t.date);
    return t.quarter === upcoming.quarter && d.getFullYear() === year;
  });

  if (alreadyPaid) return null;

  const urgency = upcoming.daysAway <= 7;

  return (
    <div style={{
      background: urgency ? '#f8d7da' : '#d1ecf1',
      border: `1px solid ${urgency ? '#f5c6cb' : '#bee5eb'}`,
      borderLeft: `4px solid ${urgency ? '#dc3545' : '#1D8A99'}`,
      borderRadius: 8,
      padding: '14px 18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
    }}>
      <div>
        <strong style={{ color: urgency ? '#721c24' : '#0c5460' }}>
          {urgency ? '🚨 ' : '📅 '}
          Quarterly Tax Payment Due in {upcoming.daysAway} day{upcoming.daysAway !== 1 ? 's' : ''}
        </strong>
        <div style={{ fontSize: '0.88rem', color: urgency ? '#721c24' : '#0c5460', marginTop: 4 }}>
          {upcoming.label} estimated tax payment is due{' '}
          <strong>{upcoming.due.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</strong>.
          {' '}Head to <strong>Tax Planning</strong> to record your payment.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: urgency ? '#721c24' : '#0c5460', flexShrink: 0, lineHeight: 1 }}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
