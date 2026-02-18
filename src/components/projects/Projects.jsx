import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import MRROverview      from './MRROverview.jsx';
import SupportPlanForm  from './SupportPlanForm.jsx';
import SupportPlansTable from './SupportPlansTable.jsx';
import ProjectForm      from './ProjectForm.jsx';
import ProjectsTable    from './ProjectsTable.jsx';
import PaymentHistory   from './PaymentHistory.jsx';

export default function Projects() {
  const { state } = useFinancial();
  const [editPlan,    setEditPlan]    = useState(null);
  const [editProject, setEditProject] = useState(null);

  // Derive unique client names from all data
  const clients = [...new Set([
    ...state.projects.map(p => p.clientName),
    ...state.supportPlans.map(s => s.clientName),
  ])].filter(Boolean).sort();

  return (
    <div className="tab-content">
      <MRROverview supportPlans={state.supportPlans} />

      <SupportPlanForm
        editPlan={editPlan}
        onDone={() => setEditPlan(null)}
        clients={clients}
      />
      <SupportPlansTable
        supportPlans={state.supportPlans}
        onEdit={setEditPlan}
        clients={clients}
      />

      <ProjectForm
        editProject={editProject}
        onDone={() => setEditProject(null)}
        clients={clients}
      />
      <ProjectsTable
        projects={state.projects}
        onEdit={setEditProject}
        clients={clients}
      />

      <PaymentHistory payments={state.payments} />
    </div>
  );
}
