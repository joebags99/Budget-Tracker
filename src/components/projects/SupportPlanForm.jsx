import { useState, useEffect } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { today } from '../../utils/dateUtils.js';

const PLAN_PRESETS = { basic: 50, standard: 100, premium: 200, enterprise: 350 };

const empty = () => ({
  clientName: '', planType: 'standard', monthlyAmount: 100,
  billingDay: 1, startDate: today(), endDate: '', status: 'active', services: '',
});

export default function SupportPlanForm({ editPlan, onDone, clients }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();
  const [form, setForm] = useState(editPlan || empty());

  useEffect(() => { setForm(editPlan || empty()); }, [editPlan]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handlePlanType(type) {
    const amount = PLAN_PRESETS[type] ?? form.monthlyAmount;
    setForm(f => ({ ...f, planType: type, monthlyAmount: amount }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.clientName || !form.monthlyAmount || !form.startDate) {
      showToast('Client name, amount, and start date are required.', 'error');
      return;
    }
    const payload = { ...form, monthlyAmount: parseFloat(form.monthlyAmount), billingDay: parseInt(form.billingDay) };
    if (editPlan) {
      dispatch({ type: 'UPDATE_SUPPORT_PLAN', payload });
      showToast('Support plan updated.', 'success');
    } else {
      dispatch({ type: 'ADD_SUPPORT_PLAN', payload });
      showToast('Support plan added.', 'success');
    }
    setForm(empty());
    onDone();
  }

  return (
    <div className="card">
      <h3>{editPlan ? 'Edit Support Plan' : 'Add Support Plan'}</h3>
      {editPlan && <div className="edit-mode-indicator" style={{ marginBottom: 14 }}>Editing: {editPlan.clientName}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Client Name *</label>
            <input
              list="sp-clients"
              value={form.clientName}
              onChange={e => set('clientName', e.target.value)}
              placeholder="Select or type client name"
            />
            <datalist id="sp-clients">
              {clients.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label>Plan Type</label>
            <select value={form.planType} onChange={e => handlePlanType(e.target.value)}>
              <option value="basic">Basic ($50/mo)</option>
              <option value="standard">Standard ($100/mo)</option>
              <option value="premium">Premium ($200/mo)</option>
              <option value="enterprise">Enterprise ($350/mo)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label>Monthly Amount ($) *</label>
            <input type="number" step="0.01" value={form.monthlyAmount} onChange={e => set('monthlyAmount', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Billing Day of Month</label>
            <input type="number" min="1" max="28" value={form.billingDay} onChange={e => set('billingDay', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="form-group">
            <label>End Date (optional)</label>
            <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Services Included</label>
            <textarea value={form.services} onChange={e => set('services', e.target.value)} placeholder="Describe services included..." />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn">{editPlan ? 'Update Plan' : 'Add Plan'}</button>
          {editPlan && <button type="button" className="btn-cancel" onClick={onDone}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
