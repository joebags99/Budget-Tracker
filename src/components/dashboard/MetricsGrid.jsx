import { formatCurrency } from '../../utils/dateUtils.js';

export default function MetricsGrid({ projectRevenue, supportRevenue, totalRevenue, totalExpenses, netProfit, distributionPool }) {
  return (
    <div className="card">
      <h3>Financial Overview</h3>
      <div className="metrics-grid">
        <div className="metric-card metric-teal">
          <h4>Project Revenue</h4>
          <div className="value">{formatCurrency(projectRevenue)}</div>
        </div>
        <div className="metric-card metric-purple">
          <h4>Support Revenue</h4>
          <div className="value">{formatCurrency(supportRevenue)}</div>
        </div>
        <div className="metric-card">
          <h4>Total Revenue</h4>
          <div className="value">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="metric-card metric-orange">
          <h4>Total Expenses</h4>
          <div className="value">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className={`metric-card ${netProfit >= 0 ? 'metric-green' : 'metric-red'}`}>
          <h4>Net Profit</h4>
          <div className="value">{formatCurrency(netProfit)}</div>
        </div>
        <div className="metric-card metric-gold">
          <h4>Available for Distribution</h4>
          <div className="value">{formatCurrency(distributionPool)}</div>
        </div>
      </div>
    </div>
  );
}
