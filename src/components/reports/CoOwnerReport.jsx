import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { calcRevenue, calcExpenses, calcDistributions, calcTax, calcMRR, MEMBERS, CCC_LEGACY_CLIENT } from '../../utils/calculations.js';
import { getQuickDateRange, toDateString, formatCurrency } from '../../utils/dateUtils.js';

const PERIOD_PRESETS = [
  { id: 'thisMonth',   label: 'This Month' },
  { id: 'lastMonth',   label: 'Last Month' },
  { id: 'thisQuarter', label: 'This Quarter' },
  { id: 'lastQuarter', label: 'Last Quarter' },
  { id: 'ytd',         label: 'Year to Date' },
  { id: 'custom',      label: 'Custom Range' },
];

const GRADIENTS = [
  'linear-gradient(135deg, #A678D1, #1D8A99)',
  'linear-gradient(135deg, #FC7645, #A678D1)',
  'linear-gradient(135deg, #1D8A99, #FC7645)',
];

const TAX_RATES = { federal: 0.22, state: 0.0575, selfEmployment: 0.153 };

export default function CoOwnerReport() {
  const { state } = useFinancial();
  const [period, setPeriod] = useState('thisMonth');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [report, setReport] = useState(null);

  function getRange() {
    if (period === 'custom') {
      return { from: new Date(custom.from + 'T00:00:00'), to: new Date(custom.to + 'T23:59:59') };
    }
    const r = getQuickDateRange(period);
    return { from: r.from, to: r.to };
  }

  function generate() {
    const { from, to } = getRange();
    const rev  = calcRevenue(state.payments,  from, to);
    const exp  = calcExpenses(state.expenses, from, to, state.subscriptionCharges || []);
    const net  = rev.total - exp.total;
    const cccLegacyRevenue = rev.filtered
      .filter(p => p.useLegacySplit === true)
      .reduce((s, p) => s + p.amount, 0);
    const dist = calcDistributions(net, {
      cccLegacyRevenue,
      mercuryBalance: state.mercurySavingsBalance || 0,
      periodEndDate: period === 'custom' ? custom.to : toDateString(getRange().to),
    });
    const tax  = calcTax(net, TAX_RATES.federal, TAX_RATES.state, TAX_RATES.selfEmployment);
    const mrr  = calcMRR(state.supportPlans);

    // Revenue by client
    const byClient = {};
    rev.filtered.forEach(p => { byClient[p.clientName] = (byClient[p.clientName] || 0) + p.amount; });

    // Expenses by category (resolve subscription charges via their parent subscription)
    const byCategory = {};
    exp.filtered.forEach(e => {
      const cat = e.category || (state.subscriptions || []).find(s => String(s.id) === String(e.subscriptionId))?.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + e.amount;
    });

    const periodLabel = PERIOD_PRESETS.find(p => p.id === period)?.label || 'Custom Range';
    setReport({ rev, exp, net, dist, tax, mrr, byClient, byCategory, periodLabel, generatedAt: new Date() });
  }

  function print() {
    if (!report) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Daedabyte Financial Report</title>
      <style>body{font-family:'Segoe UI',sans-serif;color:#414141;max-width:800px;margin:0 auto;padding:20px}
      h2,h3{color:#A678D1} table{width:100%;border-collapse:collapse;margin:10px 0}
      th{background:#A678D1;color:white;padding:8px} td{padding:8px;border-bottom:1px solid #eee}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:15px 0}
      .box{padding:15px;border-radius:6px;color:white;text-align:center}
      </style></head><body>${document.getElementById('co-owner-report-content').innerHTML}</body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div className="card">
      <h3>Generate Co-Owner Financial Report</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Report Period</label>
          <select value={period} onChange={e => setPeriod(e.target.value)}>
            {PERIOD_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {period === 'custom' && (
        <div className="form-row" style={{ background: '#f8f9fa', padding: 14, borderRadius: 6, border: '2px solid #A678D1', marginBottom: 14 }}>
          <div className="form-group">
            <label>From Date</label>
            <input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>To Date</label>
            <input type="date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} />
          </div>
        </div>
      )}

      <div className="form-actions">
        <button className="btn" onClick={generate}>Generate Financial Report</button>
        {report && <button className="btn-secondary" onClick={print}>Print Report</button>}
      </div>

      {report && (
        <div className="report-container" id="co-owner-report-content">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24, padding: '20px', background: 'linear-gradient(90deg, #A678D1, #FC7645)', color: 'white', borderRadius: 8 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '2rem' }}>Daedabyte LLC</h2>
            <h3 style={{ margin: 0 }}>Financial Report — {report.periodLabel}</h3>
            <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: '0.9rem' }}>Generated {report.generatedAt.toLocaleDateString()}</p>
          </div>

          {/* Summary metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Revenue',    val: report.rev.total,  bg: '#1D8A99' },
              { label: 'Total Expenses',   val: report.exp.total,  bg: '#FC7645' },
              { label: 'Net Profit',       val: report.net,        bg: '#A678D1' },
              { label: 'Est. Tax',         val: report.tax.total,  bg: '#C3B86A' },
            ].map(item => (
              <div key={item.label} style={{ background: item.bg, color: 'white', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.82rem', opacity: 0.9, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatCurrency(item.val)}</div>
              </div>
            ))}
          </div>

          {/* Member Distributions */}
          <div style={{ background: 'white', padding: 20, marginBottom: 18, borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', borderLeft: '4px solid #A678D1' }}>
            <h3 style={{ color: '#A678D1', marginBottom: 16 }}>Member Distributions (90% of Net Profit)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {report.dist.memberAmounts.map((m, i) => (
                <div key={m.id} style={{ background: GRADIENTS[i % GRADIENTS.length], color: 'white', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.name}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: 6 }}>{(m.share * 100).toFixed(0)}% Share</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatCurrency(m.amount)}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Retained Savings (10%)</span>
              <strong style={{ color: '#A678D1' }}>{formatCurrency(report.dist.savings)}</strong>
            </div>
          </div>

          {/* Revenue by client */}
          <div style={{ background: 'white', padding: 20, marginBottom: 18, borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
            <h3 style={{ color: '#A678D1', marginBottom: 14 }}>Revenue by Client</h3>
            <table>
              <thead><tr><th>Client</th><th>Revenue</th></tr></thead>
              <tbody>
                {Object.entries(report.byClient).sort((a,b) => b[1]-a[1]).map(([c, v]) => (
                  <tr key={c}><td>{c}</td><td>{formatCurrency(v)}</td></tr>
                ))}
                {!Object.keys(report.byClient).length && <tr><td colSpan={2} style={{ textAlign:'center', color:'#aaa' }}>No revenue in this period</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Expenses by category */}
          <div style={{ background: 'white', padding: 20, marginBottom: 18, borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
            <h3 style={{ color: '#A678D1', marginBottom: 14 }}>Expenses by Category</h3>
            <table>
              <thead><tr><th>Category</th><th>Amount</th></tr></thead>
              <tbody>
                {Object.entries(report.byCategory).sort((a,b) => b[1]-a[1]).map(([c, v]) => (
                  <tr key={c}><td style={{ textTransform: 'capitalize' }}>{c}</td><td>{formatCurrency(v)}</td></tr>
                ))}
                {!Object.keys(report.byCategory).length && <tr><td colSpan={2} style={{ textAlign:'center', color:'#aaa' }}>No expenses in this period</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Tax Summary */}
          <div style={{ background: 'white', padding: 20, marginBottom: 18, borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
            <h3 style={{ color: '#A678D1', marginBottom: 14 }}>Tax Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {[
                { label: 'Federal Tax (22%)', val: report.tax.federal },
                { label: 'VA State Tax (5.75%)', val: report.tax.state },
                { label: 'Self-Employment (15.3%)', val: report.tax.selfEmployment },
                { label: 'Total Est. Tax', val: report.tax.total },
              ].map(item => (
                <div key={item.label} style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#555' }}>{item.label}</span>
                  <strong style={{ color: '#A678D1' }}>{formatCurrency(item.val)}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', marginTop: 20 }}>
            <p>Report generated by Daedabyte LLC Finance Tracker</p>
            <p>For internal use by {MEMBERS.map(m => m.name).join(', ')}</p>
            <p style={{ marginTop: 8, fontStyle: 'italic' }}>
              Estimates only. Consult a tax professional for accurate planning.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
