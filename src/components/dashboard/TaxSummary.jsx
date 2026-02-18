import { formatCurrency } from '../../utils/dateUtils.js';

export default function TaxSummary({ tax, reserve }) {
  return (
    <div className="card">
      <h3>Tax Summary (Estimates)</h3>
      <div className="metrics-grid">
        <div className="metric-card metric-dark">
          <h4>Est. Federal Tax ({(tax.federalRate * 100).toFixed(1)}%)</h4>
          <div className="value">{formatCurrency(tax.federal)}</div>
        </div>
        <div className="metric-card metric-dark">
          <h4>Virginia State Tax ({(tax.stateRate * 100).toFixed(1)}%)</h4>
          <div className="value">{formatCurrency(tax.state)}</div>
        </div>
        <div className="metric-card metric-dark">
          <h4>Self-Employment Tax ({(tax.selfEmploymentRate * 100).toFixed(1)}%)</h4>
          <div className="value">{formatCurrency(tax.selfEmployment)}</div>
        </div>
        <div className="metric-card metric-gold">
          <h4>Business Reserve (60%)</h4>
          <div className="value">{formatCurrency(reserve)}</div>
        </div>
      </div>
      <p style={{ marginTop: 12, fontSize: '0.82rem', color: '#888', fontStyle: 'italic' }}>
        Estimates based on current tax rates. Consult a tax professional for accurate planning.
      </p>
    </div>
  );
}
