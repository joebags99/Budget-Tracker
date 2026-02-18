import { useRef } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { exportAllDataJSON, exportProjectsCSV, exportExpensesCSV, exportPaymentsCSV, exportSupportPlansCSV } from '../../utils/exportUtils.js';

export default function DataManagement() {
  const { state, dispatch } = useFinancial();
  const showToast = useAppToast();
  const fileRef = useRef();

  function handleExportAll() {
    exportAllDataJSON(state);
    showToast('Full data backup exported.', 'success');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        dispatch({ type: 'IMPORT_ALL', payload: data });
        showToast('Data imported successfully!', 'success');
      } catch {
        showToast('Invalid file format. Please use a Daedabyte backup JSON.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="card">
      <h3>Data Management</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <button className="btn" onClick={handleExportAll}>Export Full Backup (JSON)</button>
        <button className="btn-secondary" onClick={() => fileRef.current.click()}>Import Backup (JSON)</button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>

      <h3 style={{ marginTop: 0 }}>Export Individual Reports</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button className="btn-secondary" onClick={() => { exportProjectsCSV(state.projects);    showToast('Projects CSV exported.', 'success'); }}>
          Export Projects (CSV)
        </button>
        <button className="btn-secondary" onClick={() => { exportExpensesCSV(state.expenses);    showToast('Expenses CSV exported.', 'success'); }}>
          Export Expenses (CSV)
        </button>
        <button className="btn-secondary" onClick={() => { exportPaymentsCSV(state.payments);    showToast('Payments CSV exported.', 'success'); }}>
          Export Payments (CSV)
        </button>
        <button className="btn-secondary" onClick={() => { exportSupportPlansCSV(state.supportPlans); showToast('Support plans CSV exported.', 'success'); }}>
          Export Support Plans (CSV)
        </button>
      </div>
    </div>
  );
}
