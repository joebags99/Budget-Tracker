import { useState } from 'react';

export default function CollapsibleCard({ title, defaultOpen = true, headerRight, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: open ? 12 : 0 }}
        onClick={() => setOpen(o => !o)}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {headerRight && <span onClick={e => e.stopPropagation()}>{headerRight}</span>}
          <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && children}
    </div>
  );
}
