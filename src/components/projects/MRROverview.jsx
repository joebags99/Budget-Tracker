import { calcMRR } from '../../utils/calculations.js';
import { formatCurrency } from '../../utils/dateUtils.js';

export default function MRROverview({ supportPlans }) {
  const { active, mrr, arr, avg } = calcMRR(supportPlans);
  return (
    <div className="card">
      <h3>Monthly Recurring Revenue Overview</h3>
      <div className="metrics-grid">
        <div className="metric-card metric-teal">
          <h4>Active Support Plans</h4>
          <div className="value">{active}</div>
        </div>
        <div className="metric-card">
          <h4>Monthly Recurring Revenue</h4>
          <div className="value">{formatCurrency(mrr)}</div>
        </div>
        <div className="metric-card metric-purple">
          <h4>Annual Recurring Revenue</h4>
          <div className="value">{formatCurrency(arr)}</div>
        </div>
        <div className="metric-card metric-gold">
          <h4>Average Plan Value</h4>
          <div className="value">{formatCurrency(avg)}/mo</div>
        </div>
      </div>
    </div>
  );
}
