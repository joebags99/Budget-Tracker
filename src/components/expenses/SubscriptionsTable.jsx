import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { formatCurrency, formatDate, today } from '../../utils/dateUtils.js';
import { EXPENSE_CATEGORIES } from '../../utils/irsMapping.js';
import CollapsibleCard from '../layout/CollapsibleCard.jsx';

export default function SubscriptionsTable({ subscriptions, subscriptionCharges, onEdit }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();
  const [chargeForm, setChargeForm] = useState({ subscriptionId: '', amount: '', date: today(), notes: '' });

  function getCharges(subId) {
    return subscriptionCharges.filter(c => String(c.subscriptionId) === String(subId));
  }

  function getAvg(subId) {
    const charges = getCharges(subId);
    if (charges.length === 0) return null;
    return charges.reduce((s, c) => s + c.amount, 0) / charges.length;
  }

  function handleDelete(id) {
    if (!confirm('Delete this subscription and all its recorded charges?')) return;
    dispatch({ type: 'DELETE_SUBSCRIPTION', payload: id });
    showToast('Subscription deleted.', 'warning');
  }

  function handleDeleteCharge(id) {
    if (!confirm('Delete this charge record?')) return;
    dispatch({ type: 'DELETE_SUBSCRIPTION_CHARGE', payload: id });
    showToast('Charge deleted.', 'warning');
  }

  function handleChargeSubmit(e) {
    e.preventDefault();
    const sub = subscriptions.find(s => String(s.id) === String(chargeForm.subscriptionId));
    if (!sub || !chargeForm.amount || !chargeForm.date) {
      showToast('Select a subscription and enter the charge details.', 'error');
      return;
    }
    dispatch({
      type: 'RECORD_SUBSCRIPTION_CHARGE',
      payload: {
        subscriptionId: sub.id,
        amount: parseFloat(chargeForm.amount),
        date: chargeForm.date,
        notes: chargeForm.notes,
        vendor: sub.vendor,
      },
    });
    showToast(`Charge recorded for ${sub.vendor}.`, 'success');
    setChargeForm(f => ({ ...f, subscriptionId: '', amount: '', notes: '' }));
  }

  const catLabel = v => EXPENSE_CATEGORIES.find(c => c.value === v)?.label || v;

  const totalAvgMonthly = subscriptions.reduce((sum, sub) => {
    const avg = getAvg(sub.id);
    return avg != null ? sum + avg : sum;
  }, 0);

  const sortedCharges = [...subscriptionCharges].sort((a, b) => new Date(b.date) - new Date(a.date));

  const avgSummary = subscriptions.length > 0
    ? <span style={{ fontSize: '0.9rem', color: '#555' }}>Avg Monthly Total: <strong style={{ color: '#FC7645' }}>{formatCurrency(totalAvgMonthly)}</strong></span>
    : null;

  return (
    <>
      <CollapsibleCard title="Monthly Subscriptions" headerRight={avgSummary}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Category</th>
                <th>Avg / Month</th>
                <th>Months Recorded</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0
                ? <tr><td colSpan={6} className="empty-state">No subscriptions yet — add one above</td></tr>
                : subscriptions.map(sub => {
                    const avg = getAvg(sub.id);
                    const count = getCharges(sub.id).length;
                    return (
                      <tr key={sub.id}>
                        <td><strong>{sub.vendor}</strong></td>
                        <td>{catLabel(sub.category)}</td>
                        <td>
                          {avg != null
                            ? <strong>{formatCurrency(avg)}</strong>
                            : <span style={{ color: '#aaa', fontStyle: 'italic' }}>No charges yet</span>}
                        </td>
                        <td>
                          {count === 0
                            ? <span style={{ color: '#aaa' }}>—</span>
                            : `${count} month${count !== 1 ? 's' : ''}`}
                        </td>
                        <td>{sub.notes || '—'}</td>
                        <td>
                          <div className="btn-sm-group">
                            <button className="btn-edit" onClick={() => onEdit(sub)}>Edit</button>
                            <button className="btn-danger" onClick={() => handleDelete(sub.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>

      <div className="card">
        <h3>Record Monthly Charge</h3>
        <form onSubmit={handleChargeSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Subscription</label>
              <select
                value={chargeForm.subscriptionId}
                onChange={e => setChargeForm(f => ({ ...f, subscriptionId: e.target.value }))}
              >
                <option value="">-- Select Subscription --</option>
                {subscriptions.map(s => (
                  <option key={s.id} value={s.id}>{s.vendor}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={chargeForm.amount}
                onChange={e => setChargeForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Actual charge this month"
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={chargeForm.date}
                onChange={e => setChargeForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input
                type="text"
                value={chargeForm.notes}
                onChange={e => setChargeForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn">Record Charge</button>
          </div>
        </form>
      </div>

      {sortedCharges.length > 0 && (
        <CollapsibleCard title="Charge History" defaultOpen={false}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Vendor</th><th>Amount</th><th>Notes</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCharges.map(c => {
                  const sub = subscriptions.find(s => String(s.id) === String(c.subscriptionId));
                  return (
                    <tr key={c.id}>
                      <td>{formatDate(c.date)}</td>
                      <td><strong>{sub?.vendor || c.vendor || '—'}</strong></td>
                      <td>{formatCurrency(c.amount)}</td>
                      <td>{c.notes || '—'}</td>
                      <td>
                        <button
                          className="btn-danger"
                          style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                          onClick={() => handleDeleteCharge(c.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>
      )}
    </>
  );
}
