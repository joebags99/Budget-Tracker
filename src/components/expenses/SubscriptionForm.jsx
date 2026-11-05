import { useState, useEffect } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { EXPENSE_CATEGORIES } from '../../utils/irsMapping.js';

const empty = () => ({ vendor: '', category: 'software', notes: '' });

export default function SubscriptionForm({ editSub, onDone }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();
  const [form, setForm] = useState(editSub || empty());

  useEffect(() => { setForm(editSub || empty()); }, [editSub]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.vendor.trim()) {
      showToast('Vendor name is required.', 'error');
      return;
    }
    if (editSub) {
      dispatch({ type: 'UPDATE_SUBSCRIPTION', payload: form });
      showToast('Subscription updated.', 'success');
    } else {
      dispatch({ type: 'ADD_SUBSCRIPTION', payload: form });
      showToast('Subscription added.', 'success');
    }
    setForm(empty());
    onDone();
  }

  return (
    <div className="card">
      <h3>{editSub ? 'Edit Subscription' : 'Add Monthly Subscription'}</h3>
      {editSub && (
        <div className="edit-mode-indicator" style={{ marginBottom: 14 }}>Editing: {editSub.vendor}</div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Vendor / Merchant *</label>
            <input
              type="text"
              value={form.vendor}
              onChange={e => set('vendor', e.target.value)}
              placeholder="e.g. AWS, GitHub, Google Workspace"
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn">
            {editSub ? 'Update Subscription' : 'Add Subscription'}
          </button>
          {editSub && (
            <button type="button" className="btn-cancel" onClick={onDone}>Cancel</button>
          )}
        </div>
      </form>
    </div>
  );
}
