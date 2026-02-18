import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { formatCurrency, formatDate } from '../../utils/dateUtils.js';
import { EXPENSE_CATEGORIES } from '../../utils/irsMapping.js';

const recurringLabel = { no: 'One-time', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' };

export default function ExpensesTable({ expenses, onEdit }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();

  const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  function handleDelete(id) {
    if (!confirm('Delete this expense?')) return;
    dispatch({ type: 'DELETE_EXPENSE', payload: id });
    showToast('Expense deleted.', 'warning');
  }

  const catLabel = v => EXPENSE_CATEGORIES.find(c => c.value === v)?.label || v;

  return (
    <div className="card">
      <h3>Expenses Summary</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Description</th><th>Vendor</th>
              <th>Category</th><th>IRS Line</th><th>Amount</th>
              <th>Recurring</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0
              ? <tr><td colSpan={8} className="empty-state">No expenses yet</td></tr>
              : sorted.map(e => (
                <tr key={e.id}>
                  <td>{formatDate(e.date)}</td>
                  <td><strong>{e.description}</strong></td>
                  <td>{e.vendor || '—'}</td>
                  <td>{catLabel(e.category)}</td>
                  <td style={{ fontSize: '0.8rem', color: '#666' }}>{e.irsLine}</td>
                  <td><strong>{formatCurrency(e.amount)}</strong></td>
                  <td>
                    {e.recurring !== 'no'
                      ? <span className="badge badge-active">{recurringLabel[e.recurring]}</span>
                      : <span className="badge" style={{ background: '#f0f0f0', color: '#888' }}>One-time</span>}
                  </td>
                  <td>
                    <div className="btn-sm-group">
                      <button className="btn-edit" onClick={() => onEdit(e)}>Edit</button>
                      <button className="btn-danger" onClick={() => handleDelete(e.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
