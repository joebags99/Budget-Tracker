import { useState, createContext, useContext } from 'react';
import './App.css';
import { FinancialProvider } from './context/FinancialContext.jsx';
import { useToast } from './hooks/useToast.js';
import Header     from './components/layout/Header.jsx';
import TabNav     from './components/layout/TabNav.jsx';
import Toast      from './components/layout/Toast.jsx';
import Dashboard  from './components/dashboard/Dashboard.jsx';
import Projects   from './components/projects/Projects.jsx';
import Expenses   from './components/expenses/Expenses.jsx';
import Clients    from './components/clients/Clients.jsx';
import Analytics  from './components/analytics/Analytics.jsx';
import TaxPlanning from './components/taxPlanning/TaxPlanning.jsx';
import Reports    from './components/reports/Reports.jsx';

// Toast context so any component can call showToast
export const ToastContext = createContext(null);
export function useAppToast() { return useContext(ToastContext); }

function AppInner() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toasts, showToast, dismissToast } = useToast();

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'projects':  return <Projects />;
      case 'expenses':  return <Expenses />;
      case 'clients':   return <Clients />;
      case 'analytics': return <Analytics />;
      case 'tax':       return <TaxPlanning />;
      case 'reports':   return <Reports />;
      default:          return <Dashboard />;
    }
  };

  return (
    <ToastContext.Provider value={showToast}>
      <Header />
      <TabNav active={activeTab} onSelect={setActiveTab} />
      <main>{renderTab()}</main>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export default function App() {
  return (
    <FinancialProvider>
      <AppInner />
    </FinancialProvider>
  );
}
