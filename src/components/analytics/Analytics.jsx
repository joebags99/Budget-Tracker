import { useMemo } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { formatCurrency, parseDate } from '../../utils/dateUtils.js';
import { EXPENSE_CATEGORIES } from '../../utils/irsMapping.js';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const PALETTE = [
  '#A678D1', '#FC7645', '#1D8A99', '#C3B86A',
  '#28a745', '#dc3545', '#6f42c1', '#fd7e14',
  '#20c997', '#e83e8c', '#17a2b8', '#6c757d',
];

// Build last-N-months labels
function last12Months() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year:  d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
    });
  }
  return months;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 6, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#414141' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontSize: '0.88rem' }}>
          {p.name}: <strong>{formatCurrency(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 6, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{name}</p>
      <p style={{ margin: '2px 0 0', color: '#A678D1' }}>{formatCurrency(value)}</p>
    </div>
  );
}

export default function Analytics() {
  const { state } = useFinancial();
  const months = useMemo(() => last12Months(), []);

  // ── Revenue & Expenses by month ───────────────────────────────────────────
  const revenueExpenseData = useMemo(() => {
    const charges = state.subscriptionCharges || [];
    return months.map(m => {
      const inMonth = x => { const d = parseDate(x.date); return d.getFullYear() === m.year && d.getMonth() === m.month; };
      const rev = state.payments.filter(inMonth).reduce((s, p) => s + p.amount, 0);
      const exp = state.expenses.filter(inMonth).reduce((s, e) => s + e.amount, 0)
                + charges.filter(inMonth).reduce((s, c) => s + c.amount, 0);
      return { month: m.label, Revenue: rev, Expenses: exp, 'Net Profit': rev - exp };
    });
  }, [state.payments, state.expenses, state.subscriptionCharges, months]);

  // ── Expense breakdown by category ─────────────────────────────────────────
  const expensePieData = useMemo(() => {
    const totals = {};
    state.expenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    // Roll subscription charges into their subscription's category
    (state.subscriptionCharges || []).forEach(c => {
      const sub = (state.subscriptions || []).find(s => String(s.id) === String(c.subscriptionId));
      const cat = sub?.category || 'other';
      totals[cat] = (totals[cat] || 0) + c.amount;
    });
    return Object.entries(totals)
      .map(([cat, val]) => ({
        name: EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat,
        value: val,
      }))
      .sort((a, b) => b.value - a.value);
  }, [state.expenses, state.subscriptionCharges, state.subscriptions]);

  // ── MRR trend — approximate from support plan history ────────────────────
  const mrrData = useMemo(() => {
    return months.map(m => {
      const monthEnd = new Date(m.year, m.month + 1, 0);
      const mrr = state.supportPlans
        .filter(p => {
          const start = p.startDate ? new Date(p.startDate) : null;
          const end   = p.endDate   ? new Date(p.endDate)   : null;
          if (!start || start > monthEnd) return false;
          if (end && end < new Date(m.year, m.month, 1)) return false;
          return true; // plan was active during this month
        })
        .reduce((s, p) => s + p.monthlyAmount, 0);
      return { month: m.label, MRR: mrr };
    });
  }, [state.supportPlans, months]);

  // ── Revenue split: project vs support ────────────────────────────────────
  const revenueSplitData = useMemo(() => {
    return months.map(m => {
      const proj = state.payments
        .filter(p => { const d = parseDate(p.date); return d.getFullYear() === m.year && d.getMonth() === m.month && (p.type === 'project' || !p.type); })
        .reduce((s, p) => s + p.amount, 0);
      const supp = state.payments
        .filter(p => { const d = parseDate(p.date); return d.getFullYear() === m.year && d.getMonth() === m.month && p.type === 'support'; })
        .reduce((s, p) => s + p.amount, 0);
      return { month: m.label, 'Project Revenue': proj, 'Support Revenue': supp };
    });
  }, [state.payments, months]);

  const hasPayments  = state.payments.length > 0;
  const hasExpenses  = state.expenses.length > 0;
  const hasPlans     = state.supportPlans.length > 0;

  const noDataCard = text => (
    <div className="empty-state" style={{ padding: 40 }}>{text}</div>
  );

  return (
    <div className="tab-content">
      {/* Revenue vs Expenses */}
      <div className="card">
        <h3>Revenue vs. Expenses — Last 12 Months</h3>
        {!hasPayments && !hasExpenses
          ? noDataCard('No payment or expense data yet.')
          : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueExpenseData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Revenue"  fill="#1D8A99" radius={[3,3,0,0]} />
                <Bar dataKey="Expenses" fill="#FC7645" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
      </div>

      {/* Net Profit trend */}
      <div className="card">
        <h3>Net Profit Trend — Last 12 Months</h3>
        {!hasPayments
          ? noDataCard('No payment data yet.')
          : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueExpenseData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="Net Profit" stroke="#A678D1" strokeWidth={2.5} dot={{ r: 4, fill: '#A678D1' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
      </div>

      {/* Revenue split + MRR trend side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div className="card">
          <h3>Revenue Mix — Project vs Support</h3>
          {!hasPayments
            ? noDataCard('No payment data yet.')
            : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueSplitData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Project Revenue" stackId="a" fill="#A678D1" radius={[0,0,0,0]} />
                  <Bar dataKey="Support Revenue" stackId="a" fill="#1D8A99" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="card">
          <h3>MRR Growth Trend</h3>
          {!hasPlans
            ? noDataCard('No support plans yet.')
            : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mrrData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="MRR" stroke="#C3B86A" strokeWidth={2.5} dot={{ r: 4, fill: '#C3B86A' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* Expense breakdown pie */}
      <div className="card">
        <h3>Expense Breakdown by Category (All Time)</h3>
        {!hasExpenses
          ? noDataCard('No expense data yet.')
          : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensePieData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ minWidth: 160 }}>
                {expensePieData.map((item, i) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.85rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#414141' }}>{item.name}</div>
                      <div style={{ color: '#888' }}>{formatCurrency(item.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
