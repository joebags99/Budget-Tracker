import { formatCurrency } from '../../utils/dateUtils.js';

export default function OverheadComparison({ data }) {
  const { mrr, arr, monthlyRecurringExpenses, annualRecurringExpenses, monthlyNet, annualNet } = data;

  const noData = mrr === 0 && monthlyRecurringExpenses === 0;

  return (
    <div className="card">
      <h3>Overhead vs. Recurring Revenue</h3>
      <div className="metrics-grid">
        <div className="metric-card metric-teal">
          <h4>Monthly Recurring Revenue (MRR)</h4>
          <div className="value">{formatCurrency(mrr)}</div>
        </div>
        <div className="metric-card metric-orange">
          <h4>Monthly Recurring Expenses</h4>
          <div className="value">{formatCurrency(monthlyRecurringExpenses)}</div>
        </div>
        <div className={`metric-card ${monthlyNet >= 0 ? 'metric-green' : 'metric-red'}`}>
          <h4>Monthly Net Position</h4>
          <div className="value">{formatCurrency(monthlyNet)}</div>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginTop: 14 }}>
        <div className="metric-card metric-teal">
          <h4>Annual Recurring Revenue (ARR)</h4>
          <div className="value">{formatCurrency(arr)}</div>
        </div>
        <div className="metric-card metric-orange">
          <h4>Annual Recurring Expenses</h4>
          <div className="value">{formatCurrency(annualRecurringExpenses)}</div>
        </div>
        <div className={`metric-card ${annualNet >= 0 ? 'metric-green' : 'metric-red'}`}>
          <h4>Annual Net Position</h4>
          <div className="value">{formatCurrency(annualNet)}</div>
        </div>
      </div>

      {!noData && (
        <div className={`overhead-banner ${monthlyNet >= 0 ? 'surplus' : 'deficit'}`}>
          {monthlyNet >= 0
            ? `Surplus: Recurring revenue covers all recurring overhead. Monthly surplus: ${formatCurrency(monthlyNet)}`
            : `Deficit: Recurring expenses exceed recurring revenue. Monthly shortfall: ${formatCurrency(Math.abs(monthlyNet))}`}
        </div>
      )}
    </div>
  );
}
