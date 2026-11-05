import { useFinancial } from '../../context/FinancialContext.jsx';
import { useAppToast } from '../../App.jsx';
import { formatCurrency } from '../../utils/dateUtils.js';
import { EXPENSE_CATEGORIES } from '../../utils/irsMapping.js';

export default function MigrateSubscriptions() {
  const { state, dispatch } = useFinancial();
  const showToast = useAppToast();

  // Group monthly recurring expenses by vendor (fall back to description).
  // Skip any vendor that already has a matching subscription.
  const groupMap = {};
  for (const exp of state.expenses.filter(e => e.recurring === 'monthly')) {
    const label = (exp.vendor || exp.description || '').trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (!groupMap[key]) {
      groupMap[key] = { vendor: label, category: exp.category, expenses: [] };
    }
    groupMap[key].expenses.push(exp);
  }

  const candidates = Object.values(groupMap).filter(g =>
    !state.subscriptions.some(s => s.vendor.toLowerCase().trim() === g.vendor.toLowerCase().trim())
  );

  if (candidates.length === 0) return null;

  function migrate(group) {
    dispatch({
      type: 'MIGRATE_TO_SUBSCRIPTION',
      payload: { vendor: group.vendor, category: group.category, notes: '', expenses: group.expenses },
    });
    showToast(`Migrated ${group.vendor} (${group.expenses.length} charge${group.expenses.length !== 1 ? 's' : ''}) to subscriptions.`, 'success');
  }

  function migrateAll() {
    candidates.forEach(group => dispatch({
      type: 'MIGRATE_TO_SUBSCRIPTION',
      payload: { vendor: group.vendor, category: group.category, notes: '', expenses: group.expenses },
    }));
    showToast(`Migrated ${candidates.length} subscription${candidates.length !== 1 ? 's' : ''} from recurring expenses.`, 'success');
  }

  const catLabel = v => EXPENSE_CATEGORIES.find(c => c.value === v)?.label || v;

  return (
    <div className="card" style={{ borderLeft: '4px solid #A678D1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ marginBottom: 6 }}>Import Recurring Expenses as Subscriptions</h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>
            {candidates.length} vendor{candidates.length !== 1 ? 's' : ''} found in your monthly recurring expenses.
            Importing creates a subscription entry and converts each expense into a recorded charge —
            so the average auto-updates over time without double-counting.
          </p>
        </div>
        {candidates.length > 1 && (
          <button className="btn" style={{ whiteSpace: 'nowrap', marginLeft: 20, flexShrink: 0 }} onClick={migrateAll}>
            Import All
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vendor</th><th>Category</th><th>Entries</th><th>Avg / Month</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(group => {
              const avg = group.expenses.reduce((s, e) => s + e.amount, 0) / group.expenses.length;
              return (
                <tr key={group.vendor}>
                  <td><strong>{group.vendor}</strong></td>
                  <td>{catLabel(group.category)}</td>
                  <td>{group.expenses.length} month{group.expenses.length !== 1 ? 's' : ''} of data</td>
                  <td><strong>{formatCurrency(avg)}</strong></td>
                  <td>
                    <button className="btn-edit" onClick={() => migrate(group)}>Import</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
