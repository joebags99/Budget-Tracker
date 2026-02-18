import { useState, useEffect } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';

const empty = () => ({
  name: '', contactName: '', email: '', phone: '',
  website: '', notes: '', contractStart: '', contractEnd: '',
});

export default function ClientForm({ editClient, onDone }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();
  const [form, setForm] = useState(editClient || empty());

  useEffect(() => { setForm(editClient || empty()); }, [editClient]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Client name is required.', 'error');
      return;
    }
    if (editClient) {
      dispatch({ type: 'UPDATE_CLIENT', payload: { ...form } });
      showToast('Client updated.', 'success');
    } else {
      dispatch({ type: 'ADD_CLIENT', payload: { ...form } });
      showToast('Client added.', 'success');
    }
    setForm(empty());
    onDone();
  }

  return (
    <div className="card">
      <h3>{editClient ? 'Edit Client' : 'Add Client'}</h3>
      {editClient && (
        <div className="edit-mode-indicator" style={{ marginBottom: 14 }}>
          Editing: {editClient.name}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Company / Client Name *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Acme Corp" />
          </div>
          <div className="form-group">
            <label>Primary Contact</label>
            <input type="text" value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Full name" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@company.com" />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
          </div>
          <div className="form-group">
            <label>Website</label>
            <input type="text" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Contract Start</label>
            <input type="date" value={form.contractStart} onChange={e => set('contractStart', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Contract End / Renewal</label>
            <input type="date" value={form.contractEnd} onChange={e => set('contractEnd', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes about this client..." />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn">{editClient ? 'Update Client' : 'Add Client'}</button>
          {editClient && <button type="button" className="btn-cancel" onClick={onDone}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
