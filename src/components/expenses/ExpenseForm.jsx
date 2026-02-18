import { useState, useEffect } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { EXPENSE_CATEGORIES, getIRSLine } from '../../utils/irsMapping.js';
import { today } from '../../utils/dateUtils.js';

const empty = () => ({
  description: '', amount: '', date: today(),
  category: 'software', vendor: '', recurring: 'no',
});

export default function ExpenseForm({ editExpense, onDone }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();
  const [form, setForm] = useState(editExpense || empty());

  useEffect(() => { setForm(editExpense || empty()); }, [editExpense]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const irsLine = getIRSLine(form.category);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date) {
      showToast('Description, amount, and date are required.', 'error');
      return;
    }
    const payload = { ...form, amount: parseFloat(form.amount) };
    if (editExpense) {
      dispatch({ type: 'UPDATE_EXPENSE', payload });
      showToast('Expense updated.', 'success');
    } else {
      dispatch({ type: 'ADD_EXPENSE', payload });
      showToast('Expense added.', 'success');
    }
    setForm(empty());
    onDone();
  }

  return (
    <div className="card">
      <h3>{editExpense ? 'Edit Expense' : 'Add Expense'}</h3>
      {editExpense && <div className="edit-mode-indicator" style={{ marginBottom: 14 }}>Editing: {editExpense.description}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Description *</label>
            <input
              type="text"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Expense description"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Amount ($) *</label>
            <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Date *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Vendor</label>
            <input type="text" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Vendor name" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>IRS Tax Line (Form 1065) — Auto-filled</label>
            <input type="text" value={irsLine} readOnly />
          </div>
          <div className="form-group">
            <label>Recurring</label>
            <select value={form.recurring} onChange={e => set('recurring', e.target.value)}>
              <option value="no">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn">{editExpense ? 'Update Expense' : 'Add Expense'}</button>
          {editExpense && <button type="button" className="btn-cancel" onClick={onDone}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
