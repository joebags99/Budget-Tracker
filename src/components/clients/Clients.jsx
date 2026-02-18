import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import ClientForm   from './ClientForm.jsx';
import ClientsTable from './ClientsTable.jsx';
import ClientDetail from './ClientDetail.jsx';

export default function Clients() {
  const { state } = useFinancial();
  const [editClient, setEditClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);

  return (
    <div className="tab-content">
      <ClientForm
        editClient={editClient}
        onDone={() => setEditClient(null)}
      />

      {viewClient && (
        <ClientDetail
          client={viewClient}
          projects={state.projects}
          supportPlans={state.supportPlans}
          payments={state.payments}
          onClose={() => setViewClient(null)}
        />
      )}

      <ClientsTable
        clients={state.clients}
        payments={state.payments}
        supportPlans={state.supportPlans}
        onEdit={c => { setViewClient(null); setEditClient(c); }}
        onView={c => { setEditClient(null); setViewClient(c); }}
      />
    </div>
  );
}
