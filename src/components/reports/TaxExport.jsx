import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { exportTaxCSV } from '../../utils/exportUtils.js';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => currentYear - i);

export default function TaxExport() {
  const { state } = useFinancial();
  const showToast = useAppToast();

  const [year, setYear]    = useState(currentYear);
  const [status, setStatus] = useState(null);
  const [sections, setSections] = useState({
    income:   true,
    expenses: true,
    k1:       true,
    payments: true,
  });

  function toggle(key) { setSections(s => ({ ...s, [key]: !s[key] })); }

  function handleExport() {
    if (!Object.values(sections).some(Boolean)) {
      showToast('Select at least one section to export.', 'error');
      return;
    }
    const result = exportTaxCSV({
      year,
      payments:    state.payments,
      expenses:    state.expenses,
      taxPayments: state.taxPayments,
      sections,
    });
    const sectionNames = [
      sections.income   && 'Income',
      sections.expenses && 'Deductions',
      sections.k1       && 'K-1',
      sections.payments && 'Tax Payments',
    ].filter(Boolean);
    setStatus(`Exported ${year} tax CSV: ${sectionNames.join(', ')} — ${result.expenses} expense(s), ${result.payments} payment(s)`);
    showToast(`Tax CSV for ${year} exported!`, 'success');
    setTimeout(() => setStatus(null), 7000);
  }

  return (
    <div className="card">
      <h3>Tax Export — Form 1065 / Schedule K-1</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 18 }}>
        Exports a multi-section CSV for <strong>H&amp;R Block / TaxAct</strong> partnership return.
        Organized around Form 1065 structure with IRS line references.
        Covers <strong>Partnership (Form 1065 + K-1s)</strong>.
      </p>

      <div className="form-row">
        <div className="form-group">
          <label>Tax Year</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="section-label">Sections to Include</div>
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input type="checkbox" checked={sections.income}   onChange={() => toggle('income')} />
            Income Summary (Form 1065, Lines 1a–7)
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={sections.expenses} onChange={() => toggle('expenses')} />
            Expense Deductions (Form 1065, Lines 9–22) + Individual Transaction Detail
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={sections.k1}       onChange={() => toggle('k1')} />
            Schedule K-1 Per-Partner Data (Box 1 &amp; Box 14)
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={sections.payments} onChange={() => toggle('payments')} />
            Quarterly Estimated Tax Payments (all 4 quarters)
          </label>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="btn" onClick={handleExport}>
          Export Tax CSV for H&amp;R Block / TaxAct
        </button>
      </div>

      {status && (
        <div className="export-status success" style={{ marginTop: 14 }}>
          {status}
        </div>
      )}

      <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8f9fa', borderRadius: 6, fontSize: '0.82rem', color: '#666', borderLeft: '3px solid #A678D1' }}>
        <strong>Note:</strong> This export is an estimate based on recorded data.
        IRS line assignments are based on expense categories. Consult a tax professional before filing.
        Output file: <code>daedabyte-form1065-{year}.csv</code>
      </div>
    </div>
  );
}
