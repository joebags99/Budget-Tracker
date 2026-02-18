import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { calcAnnualProjections, calcTax } from '../../utils/calculations.js';
import { formatCurrency, today } from '../../utils/dateUtils.js';

const QUARTER_INFO = {
  Q1: { label: 'Q1 (Jan–Mar)', due: 'April 15' },
  Q2: { label: 'Q2 (Apr–Jun)', due: 'June 15' },
  Q3: { label: 'Q3 (Jul–Sep)', due: 'September 15' },
  Q4: { label: 'Q4 (Oct–Dec)', due: 'January 15 (next year)' },
};

export default function TaxPlanning() {
  const { state, dispatch } = useFinancial();
  const showToast = useAppToast();

  const [rates, setRates] = useState({ federal: 22, state: 5.75, selfEmployment: 15.3 });
  const [payForm, setPayForm] = useState({ quarter: 'Q1', amount: '', date: today() });

  const rateDecimals = { federal: rates.federal / 100, state: rates.state / 100, selfEmployment: rates.selfEmployment / 100 };
  const projections  = calcAnnualProjections(state.payments, state.expenses, rateDecimals);
  const taxProjected = calcTax(projections.projectedProfit, rateDecimals.federal, rateDecimals.state, rateDecimals.selfEmployment);

  const totalPaid = state.taxPayments.reduce((s, t) => s + t.amount, 0);

  function handlePaySubmit(e) {
    e.preventDefault();
    if (!payForm.amount || !payForm.date) {
      showToast('Amount and date are required.', 'error');
      return;
    }
    dispatch({ type: 'ADD_TAX_PAYMENT', payload: { ...payForm, amount: parseFloat(payForm.amount) } });
    showToast('Tax payment recorded.', 'success');
    setPayForm({ quarter: 'Q1', amount: '', date: today() });
  }

  function handleDeleteTaxPay(id) {
    if (!confirm('Delete this tax payment record?')) return;
    dispatch({ type: 'DELETE_TAX_PAYMENT', payload: id });
    showToast('Tax payment deleted.', 'warning');
  }

  const sorted = [...state.taxPayments].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="tab-content">
      {/* Tax Rate Settings */}
      <div className="card">
        <h3>Tax Rate Settings</h3>
        <div className="tax-rate-row">
          <div className="form-group">
            <label>Federal Tax Rate (%)</label>
            <input type="number" step="0.1" value={rates.federal} onChange={e => setRates(r => ({ ...r, federal: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="form-group">
            <label>Virginia State Tax Rate (%)</label>
            <input type="number" step="0.1" value={rates.state} onChange={e => setRates(r => ({ ...r, state: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="form-group">
            <label>Self-Employment Tax Rate (%)</label>
            <input type="number" step="0.1" value={rates.selfEmployment} onChange={e => setRates(r => ({ ...r, selfEmployment: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
        <p style={{ marginTop: 12, fontSize: '0.82rem', color: '#888', fontStyle: 'italic' }}>
          Rates are used for projections only and are not saved. Consult a tax professional for accurate rates.
        </p>
      </div>

      {/* Annual Tax Projection */}
      <div className="card">
        <h3>Annual Tax Projection</h3>
        <div className="metrics-grid">
          <div className="metric-card metric-teal">
            <h4>Projected Annual Revenue</h4>
            <div className="value">{formatCurrency(projections.projectedRevenue)}</div>
          </div>
          <div className="metric-card metric-orange">
            <h4>Projected Annual Expenses</h4>
            <div className="value">{formatCurrency(projections.projectedExpenses)}</div>
          </div>
          <div className={`metric-card ${projections.projectedProfit >= 0 ? 'metric-green' : 'metric-red'}`}>
            <h4>Projected Net Profit</h4>
            <div className="value">{formatCurrency(projections.projectedProfit)}</div>
          </div>
          <div className="metric-card metric-dark">
            <h4>Est. Total Tax Liability</h4>
            <div className="value">{formatCurrency(taxProjected.total)}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { label: `Federal (${rates.federal}%)`, val: taxProjected.federal },
            { label: `VA State (${rates.state}%)`,  val: taxProjected.state },
            { label: `Self-Employment (${rates.selfEmployment}%)`, val: taxProjected.selfEmployment },
          ].map(item => (
            <div key={item.label} style={{ background: '#f8f9fa', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.88rem', color: '#555' }}>{item.label}</span>
              <strong style={{ color: '#A678D1' }}>{formatCurrency(item.val)}</strong>
            </div>
          ))}
          <div style={{ background: '#f8f9fa', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.88rem', color: '#555' }}>Already Paid</span>
            <strong style={{ color: '#28a745' }}>{formatCurrency(totalPaid)}</strong>
          </div>
        </div>
      </div>

      {/* Quarterly Payments Form */}
      <div className="card">
        <h3>Record Quarterly Estimated Payment</h3>
        <form onSubmit={handlePaySubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Quarter</label>
              <select value={payForm.quarter} onChange={e => setPayForm(f => ({ ...f, quarter: e.target.value }))}>
                {Object.entries(QUARTER_INFO).map(([q, { label, due }]) => (
                  <option key={q} value={q}>{label} — Due {due}</option>
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
          </div>
          <div className="form-actions">
            <button type="submit" className="btn">Record Payment</button>
          </div>
        </form>
      </div>

      {/* Payment History */}
      <div className="card">
        <h3>Quarterly Tax Payment History</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Quarter</th><th>Due Date</th><th>Payment Date</th><th>Amount</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {sorted.length === 0
                ? <tr><td colSpan={5} className="empty-state">No tax payments recorded yet</td></tr>
                : sorted.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.quarter}</strong></td>
                    <td>{QUARTER_INFO[t.quarter]?.due}</td>
                    <td>{t.date}</td>
                    <td><strong>{formatCurrency(t.amount)}</strong></td>
                    <td><button className="btn-danger" onClick={() => handleDeleteTaxPay(t.id)}>Delete</button></td>
                  </tr>
                ))}
              {sorted.length > 0 && (
                <tr style={{ background: '#f8f9fa' }}>
                  <td colSpan={3}><strong>Total Paid</strong></td>
                  <td colSpan={2}><strong style={{ color: '#28a745' }}>{formatCurrency(totalPaid)}</strong></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
