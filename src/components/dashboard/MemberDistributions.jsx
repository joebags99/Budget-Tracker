import { useFinancial } from '../../context/FinancialContext.jsx';
import { formatCurrency } from '../../utils/dateUtils.js';
import { MERCURY_FLOOR } from '../../utils/calculations.js';

const GRADIENTS = [
  'linear-gradient(135deg, #A678D1, #1D8A99)',
  'linear-gradient(135deg, #FC7645, #A678D1)',
  'linear-gradient(135deg, #1D8A99, #FC7645)',
];

export default function MemberDistributions({ memberAmounts, savings, floorWithholding, mercuryBalance }) {
  const { dispatch } = useFinancial();

  function handleBalanceChange(e) {
    const val = parseFloat(e.target.value);
    dispatch({ type: 'SET_MERCURY_BALANCE', payload: isNaN(val) ? 0 : val });
  }

  const floorDeficit   = Math.max(0, MERCURY_FLOOR - mercuryBalance);
  const floorHealthy   = mercuryBalance >= MERCURY_FLOOR;

  return (
    <div className="card">
      <h3>Member Distributions (90% of Net Profit)</h3>

      {/* Mercury savings floor */}
      <div style={{ marginBottom: 16, padding: '12px 14px', background: floorHealthy ? '#f0fdf4' : '#fff7ed', borderRadius: 6, border: `1px solid ${floorHealthy ? '#86efac' : '#fdba74'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: floorHealthy ? '#16a34a' : '#ea580c' }}>
              Mercury Savings — {floorHealthy ? `Floor Met ($${MERCURY_FLOOR.toLocaleString()} min)` : `Floor Deficit: ${formatCurrency(floorDeficit)} withheld from payout`}
            </div>
            {floorWithholding > 0 && (
              <div style={{ fontSize: '0.82rem', color: '#ea580c', marginTop: 2 }}>
                {formatCurrency(floorWithholding)} held back to replenish the ${MERCURY_FLOOR.toLocaleString()} floor before payouts
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.82rem', color: '#555', whiteSpace: 'nowrap' }}>Month-end balance:</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={mercuryBalance || ''}
              onChange={handleBalanceChange}
              placeholder="0.00"
              style={{ width: 110, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9rem' }}
            />
          </div>
        </div>
      </div>

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
        <span>Retained Savings (10%)</span>
        <strong style={{ color: '#A678D1' }}>{formatCurrency(savings)}</strong>
      </div>
    </div>
  );
}
