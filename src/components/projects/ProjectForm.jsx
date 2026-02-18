import { useState, useEffect } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { today } from '../../utils/dateUtils.js';

const TYPE_PRESETS = { basic: 750, standard: 2000, premium: 3000 };

const empty = () => ({
  clientName: '', projectType: 'custom', totalAmount: '', paidAmount: 0,
  startDate: today(), paymentSchedule: 'full', status: 'active', notes: '',
});

export default function ProjectForm({ editProject, onDone, clients }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();
  const [form, setForm] = useState(editProject || empty());

  useEffect(() => { setForm(editProject || empty()); }, [editProject]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleType(type) {
    const amount = TYPE_PRESETS[type] ?? form.totalAmount;
    setForm(f => ({ ...f, projectType: type, totalAmount: amount || '' }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.clientName || !form.totalAmount || !form.startDate) {
      showToast('Client name, amount, and start date are required.', 'error');
      return;
    }
    const payload = { ...form, totalAmount: parseFloat(form.totalAmount), paidAmount: parseFloat(form.paidAmount) || 0 };
    if (editProject) {
      dispatch({ type: 'UPDATE_PROJECT', payload });
      showToast('Project updated.', 'success');
    } else {
      dispatch({ type: 'ADD_PROJECT', payload });
      showToast('Project added.', 'success');
    }
    setForm(empty());
    onDone();
  }

  return (
    <div className="card">
      <h3>{editProject ? 'Edit Project' : 'Add Project'}</h3>
      {editProject && <div className="edit-mode-indicator" style={{ marginBottom: 14 }}>Editing: {editProject.clientName}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Client Name *</label>
            <input
              list="proj-clients"
              value={form.clientName}
              onChange={e => set('clientName', e.target.value)}
              placeholder="Select or type client name"
            />
            <datalist id="proj-clients">
              {clients.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label>Project Type</label>
            <select value={form.projectType} onChange={e => handleType(e.target.value)}>
              <option value="basic">Basic ($750)</option>
              <option value="standard">Standard ($2,000)</option>
              <option value="premium">Premium ($3,000+)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label>Total Amount ($) *</label>
            <input type="number" step="0.01" value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Payment Schedule</label>
            <select value={form.paymentSchedule} onChange={e => set('paymentSchedule', e.target.value)}>
              <option value="full">Full Payment</option>
              <option value="2pay">2 Payments</option>
              <option value="3pay">3 Payments</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Project notes..." />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn">{editProject ? 'Update Project' : 'Add Project'}</button>
          {editProject && <button type="button" className="btn-cancel" onClick={onDone}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
