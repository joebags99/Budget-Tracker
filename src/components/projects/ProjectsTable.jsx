import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { formatCurrency, formatDate, today } from '../../utils/dateUtils.js';
import { getProjectTypeLabel } from '../../utils/calculations.js';

export default function ProjectsTable({ projects, onEdit, clients }) {
  const { dispatch } = useFinancial();
  const showToast = useAppToast();
  const [payForm, setPayForm] = useState({ projectId: '', amount: '', date: today(), notes: '' });

  function handleDelete(id) {
    if (!confirm('Delete this project?')) return;
    dispatch({ type: 'DELETE_PROJECT', payload: id });
    showToast('Project deleted.', 'warning');
  }

  function handlePaySubmit(e) {
    e.preventDefault();
    const project = projects.find(p => p.id === payForm.projectId);
    if (!project || !payForm.amount || !payForm.date) {
      showToast('Select a project and enter payment details.', 'error');
      return;
    }
    const amount = parseFloat(payForm.amount);
    const remaining = project.totalAmount - project.paidAmount;
    if (amount > remaining + 0.01) {
      showToast(`Payment exceeds remaining balance of ${formatCurrency(remaining)}.`, 'error');
      return;
    }
    dispatch({
      type: 'RECORD_PROJECT_PAYMENT',
      payload: {
        projectId: project.id,
        amount,
        paymentData: { clientName: project.clientName, date: payForm.date, notes: payForm.notes },
      },
    });
    showToast('Project payment recorded.', 'success');
    setPayForm({ projectId: '', amount: '', date: today(), notes: '' });
  }

  const statusBadge = s => {
    const cls = { active: 'badge-active', completed: 'badge-completed', 'on-hold': 'badge-on-hold' }[s] || '';
    return <span className={`badge ${cls}`}>{s}</span>;
  };

  return (
    <>
      <div className="card">
        <h3>Projects</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th><th>Type</th><th>Total</th><th>Paid</th>
                <th>Remaining</th><th>Start Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0
                ? <tr><td colSpan={8} className="empty-state">No projects yet</td></tr>
                : projects.map(p => {
                    const remaining = p.totalAmount - p.paidAmount;
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.clientName}</strong></td>
                        <td>{getProjectTypeLabel(p.projectType)}</td>
                        <td>{formatCurrency(p.totalAmount)}</td>
                        <td>{formatCurrency(p.paidAmount)}</td>
                        <td style={{ color: remaining > 0 ? '#FC7645' : '#28a745', fontWeight: 600 }}>
                          {formatCurrency(remaining)}
                        </td>
                        <td>{formatDate(p.startDate)}</td>
                        <td>{statusBadge(p.status)}</td>
                        <td>
                          <div className="btn-sm-group">
                            <button className="btn-edit" onClick={() => onEdit(p)}>Edit</button>
                            <button className="btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Record Project Payment</h3>
        <form onSubmit={handlePaySubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Project</label>
              <select value={payForm.projectId} onChange={e => setPayForm(f => ({ ...f, projectId: e.target.value }))}>
                <option value="">-- Select Project --</option>
                {projects.filter(p => p.status !== 'completed').map(p => {
                  const rem = p.totalAmount - p.paidAmount;
                  return <option key={p.id} value={p.id}>{p.clientName} — {formatCurrency(rem)} remaining</option>;
                })}
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
          <div className="form-actions">
            <button type="submit" className="btn">Record Payment</button>
          </div>
        </form>
      </div>
    </>
  );
}
