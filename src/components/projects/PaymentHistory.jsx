import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { formatCurrency, formatDate } from '../../utils/dateUtils.js';

export default function PaymentHistory({ payments }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();

  const sorted = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date));

  function handleDelete(id) {
    if (!confirm('Delete this payment record?')) return;
    dispatch({ type: 'DELETE_PAYMENT', payload: id });
    showToast('Payment deleted.', 'warning');
  }

  return (
    <div className="card">
      <h3>Payment History</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Client</th><th>Type</th><th>Amount</th><th>Notes</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0
              ? <tr><td colSpan={6} className="empty-state">No payments yet</td></tr>
              : sorted.map(p => (
                <tr key={p.id}>
                  <td>{formatDate(p.date)}</td>
                  <td><strong>{p.clientName}</strong></td>
                  <td>
                    <span className={`badge ${p.type === 'support' ? 'badge-support' : 'badge-project'}`}>
                      {p.type === 'support' ? 'Support' : 'Project'}
                    </span>
                  </td>
                  <td><strong>{formatCurrency(p.amount)}</strong></td>
                  <td style={{ color: '#888', fontSize: '0.85rem' }}>{p.notes || '—'}</td>
                  <td>
                    <button className="btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
