const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projects',  label: 'Projects & Revenue' },
  { id: 'expenses',  label: 'Expenses' },
  { id: 'tax',       label: 'Tax Planning' },
  { id: 'reports',   label: 'Reports & Export' },
];

export default function TabNav({ active, onSelect }) {
  return (
    <nav className="tab-nav">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`tab-btn${active === t.id ? ' active' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
