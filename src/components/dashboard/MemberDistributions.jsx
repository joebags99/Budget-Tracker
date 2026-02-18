import { MEMBERS } from '../../utils/calculations.js';
import { formatCurrency } from '../../utils/dateUtils.js';

const GRADIENTS = [
  'linear-gradient(135deg, #A678D1, #1D8A99)',
  'linear-gradient(135deg, #FC7645, #A678D1)',
  'linear-gradient(135deg, #1D8A99, #FC7645)',
];

export default function MemberDistributions({ memberAmounts, reserve }) {
  return (
    <div className="card">
      <h3>Member Distributions (40% of Net Profit)</h3>
      <div className="distributions">
        {memberAmounts.map((m, i) => (
          <div key={m.id} className="member-card" style={{ background: GRADIENTS[i % GRADIENTS.length] }}>
            <h4>{m.name}</h4>
            <div className="pct">{(m.share * 100).toFixed(0)}% Share</div>
            <div className="amount">{formatCurrency(m.amount)}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '0.9rem', color: '#555', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Business Reserve (60%)</span>
        <strong style={{ color: '#A678D1' }}>{formatCurrency(reserve)}</strong>
      </div>
    </div>
  );
}
