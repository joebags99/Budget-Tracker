import { getQuickDateRange, toDateString } from '../../utils/dateUtils.js';

const PRESETS = [
  { id: 'thisMonth',    label: 'This Month' },
  { id: 'lastMonth',    label: 'Last Month' },
  { id: 'thisQuarter',  label: 'This Quarter' },
  { id: 'lastQuarter',  label: 'Last Quarter' },
  { id: 'ytd',          label: 'YTD' },
];

export default function DateFilter({ from, to, activePreset, onChange }) {
  function applyPreset(id) {
    const range = getQuickDateRange(id);
    onChange({ from: toDateString(range.from), to: toDateString(range.to), preset: id });
  }

  return (
    <div className="card">
      <h3>Date Range Filter</h3>
      <div className="date-filter">
        <div className="form-group">
          <label>From</label>
          <input
            type="date"
            value={from}
            onChange={e => onChange({ from: e.target.value, to, preset: null })}
          />
        </div>
        <div className="form-group">
          <label>To</label>
          <input
            type="date"
            value={to}
            onChange={e => onChange({ from, to: e.target.value, preset: null })}
          />
        </div>
        <div className="form-group">
          <label>Quick Select</label>
          <div className="quick-select-group">
            {PRESETS.map(p => (
              <button
                key={p.id}
                className={`quick-btn${activePreset === p.id ? ' active' : ''}`}
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
