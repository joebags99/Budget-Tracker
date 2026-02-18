import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { formatCurrency, formatDate } from '../../utils/dateUtils.js';

export default function ClientsTable({ clients, payments, supportPlans, onEdit, onView }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();

  function handleDelete(id, name) {
    if (!confirm(`Delete client "${name}"? Their project and support plan data will remain.`)) return;
    dispatch({ type: 'DELETE_CLIENT', payload: id });
    showToast('Client deleted.', 'warning');
  }

  function totalRevenue(clientName) {
    return payments.filter(p => p.clientName === clientName).reduce((s, p) => s + p.amount, 0);
  }

  function activePlans(clientName) {
    return supportPlans.filter(s => s.clientName === clientName && s.status === 'active').length;
  }

  function monthlyValue(clientName) {
    return supportPlans
      .filter(s => s.clientName === clientName && s.status === 'active')
      .reduce((s, p) => s + p.monthlyAmount, 0);
  }

  // Check if contract end is within 60 days
  function nearingRenewal(contractEnd) {
    if (!contractEnd) return false;
    const diff = new Date(contractEnd) - new Date();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000;
  }

  return (
    <div className="card">
      <h3>All Clients</h3>
      {clients.length === 0 ? (
        <div className="empty-state">No clients yet — add one above.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Active Plans</th>
                <th>MRR</th>
                <th>Total Revenue</th>
                <th>Renewal</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td>
                    <strong
                      style={{ color: '#A678D1', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => onView(c)}
                    >
                      {c.name}
                    </strong>
                    {c.website && (
                      <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 2 }}>
                        <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" style={{ color: '#1D8A99' }}>
                          {c.website.replace(/https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{c.contactName || '—'}</div>
                    {c.email && <div style={{ fontSize: '0.78rem', color: '#888' }}>{c.email}</div>}
                  </td>
                  <td>{activePlans(c.name)}</td>
                  <td>{formatCurrency(monthlyValue(c.name))}/mo</td>
                  <td><strong>{formatCurrency(totalRevenue(c.name))}</strong></td>
                  <td>
                    {c.contractEnd
                      ? (
                        <span style={{ color: nearingRenewal(c.contractEnd) ? '#FC7645' : '#555', fontWeight: nearingRenewal(c.contractEnd) ? 700 : 400, fontSize: '0.85rem' }}>
                          {nearingRenewal(c.contractEnd) ? '⚠ ' : ''}{formatDate(c.contractEnd)}
                        </span>
                      )
                      : <span style={{ color: '#bbb' }}>—</span>
                    }
                  </td>
                  <td>
                    <div className="btn-sm-group">
                      <button className="btn-edit" onClick={() => onView(c)}>View</button>
                      <button className="btn-edit" onClick={() => onEdit(c)}>Edit</button>
                      <button className="btn-danger" onClick={() => handleDelete(c.id, c.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
