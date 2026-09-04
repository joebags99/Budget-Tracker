import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { formatCurrency, formatDate, today } from '../../utils/dateUtils.js';
import { CCC_LEGACY_CLIENT } from '../../utils/calculations.js';
import CollapsibleCard from '../layout/CollapsibleCard.jsx';

export default function SupportPlansTable({ supportPlans, onEdit, clients }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();
  const [payForm, setPayForm] = useState({ planId: '', clientName: '', amount: '', date: today(), notes: '', useLegacySplit: false });

  function handleDelete(id) {
    if (!confirm('Delete this support plan?')) return;
    dispatch({ type: 'DELETE_SUPPORT_PLAN', payload: id });
    showToast('Support plan deleted.', 'warning');
  }

  function handlePaySubmit(e) {
    e.preventDefault();
    const plan = supportPlans.find(p => String(p.id) === String(payForm.planId));
    if (!plan || !payForm.amount || !payForm.date) {
      showToast('Select a plan and enter payment details.', 'error');
      return;
    }
    dispatch({
      type: 'RECORD_SUPPORT_PAYMENT',
      payload: {
        paymentData: {
          clientName: plan.clientName,
          amount: parseFloat(payForm.amount),
          date: payForm.date,
          notes: payForm.notes,
          supportPlanId: plan.id,
          useLegacySplit: payForm.useLegacySplit,
        },
      },
    });
    showToast('Support payment recorded.', 'success');
    setPayForm({ planId: '', clientName: '', amount: '', date: today(), notes: '', useLegacySplit: false });
  }

  const statusBadge = s => {
    const cls = { active: 'badge-active', paused: 'badge-paused', cancelled: 'badge-cancelled' }[s] || '';
    return <span className={`badge ${cls}`}>{s}</span>;
  };

  return (
    <>
      <CollapsibleCard title="Support Plans">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th><th>Plan</th><th>Monthly</th><th>Annual</th>
                <th>Billing Day</th><th>Start Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supportPlans.length === 0
                ? <tr><td colSpan={8} className="empty-state">No support plans yet</td></tr>
                : supportPlans.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.clientName}</strong></td>
                    <td>{p.planType}</td>
                    <td>{formatCurrency(p.monthlyAmount)}</td>
                    <td>{formatCurrency(p.monthlyAmount * 12)}</td>
                    <td>{p.billingDay}</td>
                    <td>{formatDate(p.startDate)}</td>
                    <td>{statusBadge(p.status)}</td>
                    <td>
                      <div className="btn-sm-group">
                        <button className="btn-edit" onClick={() => onEdit(p)}>Edit</button>
                        <button className="btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>

      <div className="card">
        <h3>Record Support Payment</h3>
        <form onSubmit={handlePaySubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Support Plan</label>
              <select value={payForm.planId} onChange={e => setPayForm(f => ({ ...f, planId: e.target.value }))}>
                <option value="">-- Select Plan --</option>
                {supportPlans.filter(p => p.status === 'active').map(p => (
                  <option key={p.id} value={p.id}>{p.clientName} — ${p.monthlyAmount}/mo</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Amount ($)</label>
              <input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Payment Date</label>
              <input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input type="text" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          {supportPlans.find(p => String(p.id) === String(payForm.planId))?.clientName === CCC_LEGACY_CLIENT && (
            <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 6, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={payForm.useLegacySplit}
                  onChange={e => setPayForm(f => ({ ...f, useLegacySplit: e.target.checked }))}
                />
                Use legacy ownership split (Jon 35%, Alejandro 33%, Joe 32%) — for first subscription payment only
              </label>
            </div>
          )}
          <div className="form-actions">
            <button type="submit" className="btn">Record Payment</button>
          </div>
        </form>
      </div>
    </>
  );
}
